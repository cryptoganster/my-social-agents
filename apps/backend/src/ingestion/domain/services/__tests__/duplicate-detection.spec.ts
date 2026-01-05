import * as fc from 'fast-check';
import { DuplicateDetectionService } from '../duplicate-detection';
import { ContentHashGenerator } from '../content-hash-generator';
import { HashService } from '@/ingestion/infra/external';

describe('DuplicateDetectionService', () => {
  let service: DuplicateDetectionService;
  let hashGenerator: ContentHashGenerator;

  beforeEach(() => {
    const hashImpl = new HashService();
    hashGenerator = new ContentHashGenerator(hashImpl);
    service = new DuplicateDetectionService(hashGenerator);
  });

  afterEach(() => {
    service.clear();
  });

  describe('computeHash', () => {
    it('should compute a hash for content', () => {
      const content = 'Test content for hashing';
      const hash = service.computeHash(content);
      expect(hash).toBeDefined();
      expect(hash.getValue()).toHaveLength(64);
    });

    it('should compute same hash for same content', () => {
      const content = 'Test content for hashing';
      const hash1 = service.computeHash(content);
      const hash2 = service.computeHash(content);
      expect(hash1.equals(hash2)).toBe(true);
    });

    it('should compute different hashes for different content', () => {
      const content1 = 'First content';
      const content2 = 'Second content';
      const hash1 = service.computeHash(content1);
      const hash2 = service.computeHash(content2);
      expect(hash1.equals(hash2)).toBe(false);
    });
  });

  describe('isDuplicate', () => {
    it('should return false for unseen hash', () => {
      const content = 'New content';
      const hash = service.computeHash(content);
      const isDupe = service.isDuplicate(hash);
      expect(isDupe).toBe(false);
    });

    it('should return true for seen hash', () => {
      const content = 'Test content';
      const hash = service.computeHash(content);
      service.recordHash(hash);
      const isDupe = service.isDuplicate(hash);
      expect(isDupe).toBe(true);
    });
  });

  describe('recordHash', () => {
    it('should record a new hash', () => {
      const content = 'Test content';
      const hash = service.computeHash(content);
      service.recordHash(hash);
      const isDupe = service.isDuplicate(hash);
      expect(isDupe).toBe(true);
    });

    it('should track duplicate when same hash recorded twice', () => {
      const content = 'Test content';
      const hash = service.computeHash(content);

      service.recordHash(hash);
      expect(service.getDuplicateCount()).toBe(0);

      service.recordHash(hash);
      expect(service.getDuplicateCount()).toBe(1);
    });
  });

  describe('getDuplicateEvents', () => {
    it('should return empty array initially', () => {
      const events = service.getDuplicateEvents();
      expect(events).toEqual([]);
    });

    it('should return duplicate events', () => {
      const content = 'Test content';
      const hash = service.computeHash(content);

      service.recordHash(hash);
      service.recordHash(hash);

      const events = service.getDuplicateEvents();
      expect(events).toHaveLength(1);
      expect(events[0].hash.equals(hash)).toBe(true);
      expect(events[0].detectedAt).toBeInstanceOf(Date);
    });
  });

  // Feature: content-ingestion, Property 7: Duplicate Event Recording
  // **Validates: Requirements 3.4**
  describe('Property 7: Duplicate Event Recording', () => {
    it('should record duplicate detection event for any duplicate content', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 10, maxLength: 100 }), (content) => {
          service.clear();

          const hash = service.computeHash(content);

          // First recording - not a duplicate
          service.recordHash(hash);
          expect(service.getDuplicateCount()).toBe(0);

          // Second recording - is a duplicate
          service.recordHash(hash);
          expect(service.getDuplicateCount()).toBe(1);

          // Verify event was recorded
          const events = service.getDuplicateEvents();
          expect(events).toHaveLength(1);
          expect(events[0].hash.equals(hash)).toBe(true);
          expect(events[0].detectedAt).toBeInstanceOf(Date);
        }),
        { numRuns: 100 },
      );
    });

    it('should record multiple duplicate events for different content', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 10, maxLength: 50 }), {
            minLength: 2,
            maxLength: 5,
          }),
          (contents) => {
            service.clear();

            // Record each content twice
            for (const content of contents) {
              const hash = service.computeHash(content);
              service.recordHash(hash);
              service.recordHash(hash);
            }

            // Should have one duplicate event per unique content
            const uniqueContents = [...new Set(contents)];
            expect(service.getDuplicateCount()).toBe(uniqueContents.length);

            const events = service.getDuplicateEvents();
            expect(events).toHaveLength(uniqueContents.length);

            // All events should have valid timestamps
            events.forEach((event) => {
              expect(event.detectedAt).toBeInstanceOf(Date);
              expect(event.detectedAt.getTime()).toBeLessThanOrEqual(
                Date.now(),
              );
            });
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should track duplicate count correctly across multiple recordings', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 50 }),
          fc.integer({ min: 2, max: 10 }),
          (content, recordCount) => {
            service.clear();

            const hash = service.computeHash(content);

            // Record the same hash multiple times
            for (let i = 0; i < recordCount; i++) {
              service.recordHash(hash);
            }

            // Should have (recordCount - 1) duplicate events
            // (first recording is not a duplicate)
            expect(service.getDuplicateCount()).toBe(recordCount - 1);

            const events = service.getDuplicateEvents();
            expect(events).toHaveLength(recordCount - 1);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should preserve all duplicate events for analytics', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              content: fc.string({ minLength: 10, maxLength: 50 }),
              duplicateCount: fc.integer({ min: 1, max: 3 }),
            }),
            { minLength: 1, maxLength: 5 },
          ),
          (testCases) => {
            service.clear();

            let expectedDuplicates = 0;

            // Record each content the specified number of times
            for (const testCase of testCases) {
              const hash = service.computeHash(testCase.content);

              // First recording
              service.recordHash(hash);

              // Additional recordings (duplicates)
              for (let i = 0; i < testCase.duplicateCount; i++) {
                service.recordHash(hash);
                expectedDuplicates++;
              }
            }

            // Verify all duplicates were recorded
            expect(service.getDuplicateCount()).toBe(expectedDuplicates);

            const events = service.getDuplicateEvents();
            expect(events).toHaveLength(expectedDuplicates);

            // All events should be retrievable
            events.forEach((event) => {
              expect(event.hash).toBeDefined();
              expect(event.detectedAt).toBeInstanceOf(Date);
            });
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should maintain event chronological order', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 10, maxLength: 50 }), {
            minLength: 2,
            maxLength: 5,
          }),
          (contents) => {
            service.clear();

            // Record each content twice with small delays
            for (const content of contents) {
              const hash = service.computeHash(content);
              service.recordHash(hash);
              // Small delay to ensure different timestamps
              const start = Date.now();
              while (Date.now() - start < 1) {
                // Busy wait for 1ms
              }
              service.recordHash(hash);
            }

            const events = service.getDuplicateEvents();

            // Events should be in chronological order
            for (let i = 1; i < events.length; i++) {
              expect(events[i].detectedAt.getTime()).toBeGreaterThanOrEqual(
                events[i - 1].detectedAt.getTime(),
              );
            }
          },
        ),
        { numRuns: 50 }, // Fewer runs due to delays
      );
    });
  });
});
