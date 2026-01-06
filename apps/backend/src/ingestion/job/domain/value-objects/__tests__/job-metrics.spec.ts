import * as fc from 'fast-check';
import { JobMetrics } from '../job-metrics';

describe('JobMetrics', () => {
  describe('Property Tests', () => {
    it('should accept valid metrics with non-negative values', () => {
      const metricsArbitrary = fc.record({
        itemsCollected: fc.nat(),
        duplicatesDetected: fc.nat(),
        errorsEncountered: fc.nat(),
        bytesProcessed: fc.nat(),
        durationMs: fc.nat(),
      });

      fc.assert(
        fc.property(
          metricsArbitrary,
          ({ itemsCollected, duplicatesDetected, ...rest }) => {
            // Ensure duplicates don't exceed items
            const validDuplicates = Math.min(
              duplicatesDetected,
              itemsCollected,
            );

            const metrics = JobMetrics.create({
              itemsCollected,
              duplicatesDetected: validDuplicates,
              ...rest,
            });

            expect(metrics.itemsCollected).toBe(itemsCollected);
            expect(metrics.duplicatesDetected).toBe(validDuplicates);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should calculate success rate correctly', () => {
      const metricsArbitrary = fc
        .record({
          itemsCollected: fc.integer({ min: 1, max: 1000 }),
          errorsEncountered: fc.nat(),
        })
        .filter(({ itemsCollected, errorsEncountered }) => {
          return errorsEncountered <= itemsCollected;
        });

      fc.assert(
        fc.property(
          metricsArbitrary,
          ({ itemsCollected, errorsEncountered }) => {
            const metrics = JobMetrics.create({
              itemsCollected,
              duplicatesDetected: 0,
              errorsEncountered,
              bytesProcessed: 0,
              durationMs: 1000,
            });

            const expectedRate =
              (itemsCollected - errorsEncountered) / itemsCollected;
            expect(metrics.getSuccessRate()).toBeCloseTo(expectedRate, 5);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should maintain equality for identical metrics', () => {
      const metricsArbitrary = fc.record({
        itemsCollected: fc.nat(),
        duplicatesDetected: fc.nat(),
        errorsEncountered: fc.nat(),
        bytesProcessed: fc.nat(),
        durationMs: fc.nat(),
      });

      fc.assert(
        fc.property(
          metricsArbitrary,
          ({ itemsCollected, duplicatesDetected, ...rest }) => {
            const validDuplicates = Math.min(
              duplicatesDetected,
              itemsCollected,
            );
            const props = {
              itemsCollected,
              duplicatesDetected: validDuplicates,
              ...rest,
            };

            const metrics1 = JobMetrics.create(props);
            const metrics2 = JobMetrics.create(props);

            expect(metrics1.equals(metrics2)).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Unit Tests', () => {
    it('should create metrics with all fields', () => {
      const metrics = JobMetrics.create({
        itemsCollected: 100,
        duplicatesDetected: 10,
        errorsEncountered: 5,
        bytesProcessed: 1024000,
        durationMs: 5000,
      });

      expect(metrics.itemsCollected).toBe(100);
      expect(metrics.duplicatesDetected).toBe(10);
      expect(metrics.errorsEncountered).toBe(5);
      expect(metrics.bytesProcessed).toBe(1024000);
      expect(metrics.durationMs).toBe(5000);
    });

    it('should create empty metrics', () => {
      const metrics = JobMetrics.empty();

      expect(metrics.itemsCollected).toBe(0);
      expect(metrics.duplicatesDetected).toBe(0);
      expect(metrics.errorsEncountered).toBe(0);
      expect(metrics.bytesProcessed).toBe(0);
      expect(metrics.durationMs).toBe(0);
    });

    it('should throw error for negative items collected', () => {
      expect(() =>
        JobMetrics.create({
          itemsCollected: -1,
          duplicatesDetected: 0,
          errorsEncountered: 0,
          bytesProcessed: 0,
          durationMs: 0,
        }),
      ).toThrow('Items collected cannot be negative');
    });

    it('should throw error for negative duplicates', () => {
      expect(() =>
        JobMetrics.create({
          itemsCollected: 10,
          duplicatesDetected: -1,
          errorsEncountered: 0,
          bytesProcessed: 0,
          durationMs: 0,
        }),
      ).toThrow('Duplicates detected cannot be negative');
    });

    it('should throw error when duplicates exceed items', () => {
      expect(() =>
        JobMetrics.create({
          itemsCollected: 10,
          duplicatesDetected: 15,
          errorsEncountered: 0,
          bytesProcessed: 0,
          durationMs: 0,
        }),
      ).toThrow('Duplicates detected cannot exceed items collected');
    });

    it('should calculate success rate', () => {
      const metrics = JobMetrics.create({
        itemsCollected: 100,
        duplicatesDetected: 0,
        errorsEncountered: 10,
        bytesProcessed: 0,
        durationMs: 0,
      });

      expect(metrics.getSuccessRate()).toBe(0.9);
    });

    it('should return 1.0 success rate for zero items', () => {
      const metrics = JobMetrics.empty();
      expect(metrics.getSuccessRate()).toBe(1.0);
    });

    it('should calculate duplicate rate', () => {
      const metrics = JobMetrics.create({
        itemsCollected: 100,
        duplicatesDetected: 25,
        errorsEncountered: 0,
        bytesProcessed: 0,
        durationMs: 0,
      });

      expect(metrics.getDuplicateRate()).toBe(0.25);
    });

    it('should calculate throughput', () => {
      const metrics = JobMetrics.create({
        itemsCollected: 100,
        duplicatesDetected: 0,
        errorsEncountered: 0,
        bytesProcessed: 5000,
        durationMs: 1000,
      });

      expect(metrics.getThroughput()).toBe(5000); // 5000 bytes/second
    });

    it('should return 0 throughput for zero duration', () => {
      const metrics = JobMetrics.create({
        itemsCollected: 100,
        duplicatesDetected: 0,
        errorsEncountered: 0,
        bytesProcessed: 5000,
        durationMs: 0,
      });

      expect(metrics.getThroughput()).toBe(0);
    });

    it('should check equality correctly', () => {
      const metrics1 = JobMetrics.create({
        itemsCollected: 100,
        duplicatesDetected: 10,
        errorsEncountered: 5,
        bytesProcessed: 1024,
        durationMs: 5000,
      });

      const metrics2 = JobMetrics.create({
        itemsCollected: 100,
        duplicatesDetected: 10,
        errorsEncountered: 5,
        bytesProcessed: 1024,
        durationMs: 5000,
      });

      const metrics3 = JobMetrics.create({
        itemsCollected: 50,
        duplicatesDetected: 5,
        errorsEncountered: 2,
        bytesProcessed: 512,
        durationMs: 2500,
      });

      expect(metrics1.equals(metrics2)).toBe(true);
      expect(metrics1.equals(metrics3)).toBe(false);
    });

    it('should convert to object', () => {
      const metrics = JobMetrics.create({
        itemsCollected: 100,
        duplicatesDetected: 10,
        errorsEncountered: 5,
        bytesProcessed: 1024,
        durationMs: 5000,
      });

      const obj = metrics.toObject();

      expect(obj.itemsCollected).toBe(100);
      expect(obj.duplicatesDetected).toBe(10);
      expect(obj.errorsEncountered).toBe(5);
      expect(obj.bytesProcessed).toBe(1024);
      expect(obj.durationMs).toBe(5000);
    });
  });
});
