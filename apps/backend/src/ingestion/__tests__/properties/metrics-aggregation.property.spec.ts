/**
 * Property-Based Test: Metrics Aggregation Accuracy
 *
 * Property 4: Metrics Aggregation Accuracy
 * For any job execution, the final metrics must equal the sum of all
 * ContentIngestedEvent and ContentValidationFailedEvent counts.
 *
 * Requirements: 3.1, 3.2, 3.3
 * Design: Correctness Properties - Property 4
 *
 * Feature: ingestion-event-driven-architecture, Property 4: Metrics Aggregation Accuracy
 *
 * KNOWN ISSUES (Test Status: FAILED):
 * 1. Generators can produce duplicatesDetected > itemsCollected when aggregating
 * 2. Date overflow when adding duration to max date values
 * 3. Need to add filters to ensure valid invariants in generated data
 *
 * Failing counterexamples:
 * - [{"itemsCollected":0,"duplicatesDetected":1,"errorsEncountered":0,"bytesProcessed":0}]
 * - Date overflow: new Date("+275760-09-12T23:59:59.982Z") + 19ms
 */

import * as fc from 'fast-check';
import { JobMetricsCalculator } from '@/ingestion/job/domain/services/job-metrics-calculator';
import { JobMetrics } from '@/ingestion/job/domain/value-objects/job-metrics';

describe('Property: Metrics Aggregation Accuracy', () => {
  let metricsCalculator: JobMetricsCalculator;

  beforeAll(() => {
    metricsCalculator = new JobMetricsCalculator();
  });

  /**
   * Property 4: Metrics Aggregation Accuracy
   *
   * For any sequence of metric updates, the aggregated result should equal
   * the sum of all individual updates.
   */
  it('should accurately aggregate metrics from multiple updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random sequences of metric updates
        // Ensure duplicatesDetected <= itemsCollected for each update
        fc.array(
          fc
            .record({
              itemsCollected: fc.integer({ min: 0, max: 100 }),
              duplicatesDetected: fc.integer({ min: 0, max: 100 }),
              errorsEncountered: fc.integer({ min: 0, max: 20 }),
              bytesProcessed: fc.integer({ min: 0, max: 10000 }),
            })
            .map((update) => ({
              ...update,
              // Ensure duplicates never exceed items collected
              duplicatesDetected: Math.min(
                update.duplicatesDetected,
                update.itemsCollected,
              ),
            })),
          { minLength: 1, maxLength: 50 },
        ),
        async (updates) => {
          // Calculate expected totals
          const expectedCollected = updates.reduce(
            (sum, u) => sum + u.itemsCollected,
            0,
          );
          const expectedDuplicates = updates.reduce(
            (sum, u) => sum + u.duplicatesDetected,
            0,
          );
          const expectedErrors = updates.reduce(
            (sum, u) => sum + u.errorsEncountered,
            0,
          );
          const expectedBytes = updates.reduce(
            (sum, u) => sum + u.bytesProcessed,
            0,
          );

          // Aggregate using the calculator
          const aggregated = metricsCalculator.aggregateMetrics(updates);

          // Verify aggregation is accurate
          expect(aggregated.itemsCollected).toBe(expectedCollected);
          expect(aggregated.duplicatesDetected).toBe(expectedDuplicates);
          expect(aggregated.errorsEncountered).toBe(expectedErrors);
          expect(aggregated.bytesProcessed).toBe(expectedBytes);
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property: Metrics aggregation is commutative
   *
   * For any set of metric updates, the order of aggregation should not matter.
   * aggregateMetrics([A, B, C]) === aggregateMetrics([C, A, B])
   */
  it('should produce same result regardless of update order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc
            .record({
              itemsCollected: fc.integer({ min: 0, max: 100 }),
              duplicatesDetected: fc.integer({ min: 0, max: 100 }),
              errorsEncountered: fc.integer({ min: 0, max: 20 }),
              bytesProcessed: fc.integer({ min: 0, max: 10000 }),
            })
            .map((update) => ({
              ...update,
              // Ensure duplicates never exceed items collected
              duplicatesDetected: Math.min(
                update.duplicatesDetected,
                update.itemsCollected,
              ),
            })),
          { minLength: 2, maxLength: 10 },
        ),
        async (updates) => {
          // Aggregate in original order
          const result1 = metricsCalculator.aggregateMetrics(updates);

          // Aggregate in reversed order
          const reversed = [...updates].reverse();
          const result2 = metricsCalculator.aggregateMetrics(reversed);

          // Results should be identical
          expect(result1.itemsCollected).toBe(result2.itemsCollected);
          expect(result1.duplicatesDetected).toBe(result2.duplicatesDetected);
          expect(result1.errorsEncountered).toBe(result2.errorsEncountered);
          expect(result1.bytesProcessed).toBe(result2.bytesProcessed);
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property: Success rate calculation
   *
   * For any metrics, success rate should be between 0 and 100,
   * and should equal ((itemsCollected - errorsEncountered) / itemsCollected) * 100
   */
  it('should calculate success rate correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .record({
            itemsCollected: fc.integer({ min: 1, max: 1000 }),
            duplicatesDetected: fc.integer({ min: 0, max: 500 }),
            errorsEncountered: fc.integer({ min: 0, max: 200 }),
            bytesProcessed: fc.integer({ min: 0, max: 100000 }),
            durationMs: fc.integer({ min: 1, max: 60000 }),
          })
          .filter(
            (m) =>
              m.duplicatesDetected <= m.itemsCollected &&
              m.errorsEncountered <= m.itemsCollected,
          ),
        async (metricsData) => {
          const metrics = JobMetrics.create(metricsData);
          const successRate = metricsCalculator.calculateSuccessRate(metrics);

          // Success rate should be between 0 and 100
          expect(successRate).toBeGreaterThanOrEqual(0);
          expect(successRate).toBeLessThanOrEqual(100);

          // Calculate expected success rate
          const successfulItems =
            metricsData.itemsCollected - metricsData.errorsEncountered;
          const expected = (successfulItems / metricsData.itemsCollected) * 100;

          // Should match expected (with floating point tolerance)
          expect(successRate).toBeCloseTo(expected, 2);
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property: Duration calculation
   *
   * For any two timestamps where end > start, duration should be positive
   * and equal to the difference in milliseconds.
   */
  it('should calculate duration correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          startTime: fc.date({
            min: new Date('2020-01-01'),
            max: new Date('2030-12-31'),
          }),
          durationMs: fc.integer({ min: 1, max: 3600000 }), // Up to 1 hour
        }),
        async ({ startTime, durationMs }) => {
          const endTime = new Date(startTime.getTime() + durationMs);

          const calculatedDuration = metricsCalculator.calculateDuration(
            startTime,
            endTime,
          );

          // Duration should be positive
          expect(calculatedDuration).toBeGreaterThan(0);

          // Duration should equal the difference
          expect(calculatedDuration).toBe(durationMs);
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property: Items persisted calculation
   *
   * For any metrics, items persisted should equal
   * itemsCollected - duplicatesDetected - errorsEncountered
   */
  it('should calculate items persisted correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .record({
            itemsCollected: fc.integer({ min: 0, max: 1000 }),
            duplicatesDetected: fc.integer({ min: 0, max: 500 }),
            errorsEncountered: fc.integer({ min: 0, max: 200 }),
            bytesProcessed: fc.integer({ min: 0, max: 100000 }),
            durationMs: fc.integer({ min: 1, max: 60000 }),
          })
          .filter(
            (m) =>
              m.duplicatesDetected + m.errorsEncountered <= m.itemsCollected,
          ),
        async (metricsData) => {
          const metrics = JobMetrics.create(metricsData);
          const itemsPersisted =
            metricsCalculator.calculateItemsPersisted(metrics);

          // Calculate expected
          const expected =
            metricsData.itemsCollected -
            metricsData.duplicatesDetected -
            metricsData.errorsEncountered;

          expect(itemsPersisted).toBe(expected);
          expect(itemsPersisted).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property: Empty metrics aggregation
   *
   * Aggregating an empty array should return zero metrics.
   */
  it('should return zero metrics for empty updates', () => {
    const result = metricsCalculator.aggregateMetrics([]);

    expect(result.itemsCollected).toBe(0);
    expect(result.duplicatesDetected).toBe(0);
    expect(result.errorsEncountered).toBe(0);
    expect(result.bytesProcessed).toBe(0);
  });

  /**
   * Property: Single update aggregation
   *
   * Aggregating a single update should return that update unchanged.
   */
  it('should return same metrics for single update', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .record({
            itemsCollected: fc.integer({ min: 0, max: 100 }),
            duplicatesDetected: fc.integer({ min: 0, max: 100 }),
            errorsEncountered: fc.integer({ min: 0, max: 20 }),
            bytesProcessed: fc.integer({ min: 0, max: 10000 }),
          })
          .map((update) => ({
            ...update,
            // Ensure duplicates never exceed items collected
            duplicatesDetected: Math.min(
              update.duplicatesDetected,
              update.itemsCollected,
            ),
          })),
        async (update) => {
          const result = metricsCalculator.aggregateMetrics([update]);

          expect(result.itemsCollected).toBe(update.itemsCollected || 0);
          expect(result.duplicatesDetected).toBe(
            update.duplicatesDetected || 0,
          );
          expect(result.errorsEncountered).toBe(update.errorsEncountered || 0);
          expect(result.bytesProcessed).toBe(update.bytesProcessed || 0);
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property: Throughput calculation
   *
   * For any metrics with non-zero duration, throughput should be
   * (bytesProcessed / durationMs) * 1000
   */
  it('should calculate throughput correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .record({
            itemsCollected: fc.integer({ min: 0, max: 1000 }),
            duplicatesDetected: fc.integer({ min: 0, max: 1000 }),
            errorsEncountered: fc.integer({ min: 0, max: 200 }),
            bytesProcessed: fc.integer({ min: 1, max: 100000 }),
            durationMs: fc.integer({ min: 1, max: 60000 }),
          })
          .map((metricsData) => ({
            ...metricsData,
            // Ensure duplicates never exceed items collected
            duplicatesDetected: Math.min(
              metricsData.duplicatesDetected,
              metricsData.itemsCollected,
            ),
          })),
        async (metricsData) => {
          const metrics = JobMetrics.create(metricsData);
          const throughput = metricsCalculator.calculateThroughput(metrics);

          // Calculate expected throughput (bytes per second)
          const expected =
            (metricsData.bytesProcessed / metricsData.durationMs) * 1000;

          expect(throughput).toBeCloseTo(expected, 2);
          expect(throughput).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 20 },
    );
  });
});
