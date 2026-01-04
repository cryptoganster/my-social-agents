import * as fc from 'fast-check';
import { ContentHash } from '../content-hash';

describe('ContentHash', () => {
  describe('Property Tests', () => {
    // Feature: content-ingestion, Property 4: Content Hash Computation
    // Validates: Requirements 2.4
    it('should compute identical hashes for identical content', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), (content) => {
          const hash1 = ContentHash.fromContent(content);
          const hash2 = ContentHash.fromContent(content);

          expect(hash1.equals(hash2)).toBe(true);
          expect(hash1.toString()).toBe(hash2.toString());
        }),
        { numRuns: 100 },
      );
    });

    it('should compute different hashes for different content', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          (content1, content2) => {
            fc.pre(content1 !== content2); // Only test when contents differ

            const hash1 = ContentHash.fromContent(content1);
            const hash2 = ContentHash.fromContent(content2);

            expect(hash1.equals(hash2)).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should produce valid 64-character hex hashes', () => {
      fc.assert(
        fc.property(fc.string(), (content) => {
          const hash = ContentHash.fromContent(content);
          const hashString = hash.toString();

          expect(hashString).toHaveLength(64);
          expect(hashString).toMatch(/^[0-9a-f]{64}$/);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Unit Tests', () => {
    it('should create hash from content', () => {
      const content = 'test content';
      const hash = ContentHash.fromContent(content);

      expect(hash).toBeDefined();
      expect(hash.toString()).toHaveLength(64);
    });

    it('should create hash from existing hash string', () => {
      const hashString = 'a' + '0'.repeat(63); // Valid 64-char hex string
      const hash = ContentHash.fromHash(hashString);

      expect(hash.toString()).toBe(hashString);
    });

    it('should throw error for invalid hash string', () => {
      expect(() => ContentHash.fromHash('invalid')).toThrow(
        'Invalid hash: must be 64-character hex string',
      );
      expect(() => ContentHash.fromHash('')).toThrow(
        'Invalid hash: must be 64-character hex string',
      );
    });

    it('should check equality correctly', () => {
      const content = 'test content';
      const hash1 = ContentHash.fromContent(content);
      const hash2 = ContentHash.fromContent(content);
      const hash3 = ContentHash.fromContent('different content');

      expect(hash1.equals(hash2)).toBe(true);
      expect(hash1.equals(hash3)).toBe(false);
    });

    it('should return hash value via getValue()', () => {
      const content = 'test content';
      const hash = ContentHash.fromContent(content);

      expect(hash.getValue()).toBe(hash.toString());
    });
  });
});
