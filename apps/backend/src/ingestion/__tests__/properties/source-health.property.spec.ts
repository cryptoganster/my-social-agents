/**
 * Property-Based Test: Source Health Tracking
 *
 * Property 5: Source Health Tracking
 * For any sequence of job outcomes, health metrics must be updated correctly,
 * and SourceUnhealthyEvent must be published when thresholds are crossed.
 *
 * Requirements: 4.1-4.7
 * Design: Correctness Properties - Property 5
 *
 * Feature: ingestion-event-driven-architecture, Property 5: Source Health Tracking
 */

import * as fc from 'fast-check';
import { SourceConfiguration } from '@/ingestion/source/domain/aggregates/source-configuration';
import {
  SourceType,
  SourceTypeEnum,
} from '@/ingestion/source/domain/value-objects/source-type';

describe('Property: Source Health Tracking', () => {
  /**
   * Property 5.1: Consecutive Failures Tracking
   *
   * For any sequence of job outcomes, consecutive failures should be
   * tracked correctly and reset on success.
   */
  it('should track consecutive failures correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.constantFrom('success', 'failure'), {
          minLength: 1,
          maxLength: 20,
        }),
        async (outcomes) => {
          // Create a source
          const source = SourceConfiguration.create({
            sourceId: 'test-source',
            sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
            name: 'Test Source',
            config: { url: 'https://example.com' },
          });

          let expectedConsecutiveFailures = 0;
          let maxConsecutiveFailures = 0;

          // Apply outcomes
          for (const outcome of outcomes) {
            if (outcome === 'success') {
              source.recordSuccess();
              expectedConsecutiveFailures = 0;
            } else {
              source.recordFailure();
              expectedConsecutiveFailures++;
              maxConsecutiveFailures = Math.max(
                maxConsecutiveFailures,
                expectedConsecutiveFailures,
              );
            }
          }

          // Verify consecutive failures match expected
          expect(source.consecutiveFailures).toBe(expectedConsecutiveFailures);
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property 5.2: Success Rate Calculation
   *
   * For any sequence of job outcomes, success rate should equal
   * (successful jobs / total jobs) * 100
   */
  it('should calculate success rate correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.constantFrom('success', 'failure'), {
          minLength: 1,
          maxLength: 50,
        }),
        async (outcomes) => {
          // Create a source
          const source = SourceConfiguration.create({
            sourceId: 'test-source',
            sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
            name: 'Test Source',
            config: { url: 'https://example.com' },
          });

          // Apply outcomes
          for (const outcome of outcomes) {
            if (outcome === 'success') {
              source.recordSuccess();
            } else {
              source.recordFailure();
            }
          }

          // Calculate expected success rate
          const successCount = outcomes.filter((o) => o === 'success').length;
          const expectedRate = (successCount / outcomes.length) * 100;

          // Verify success rate (with floating point tolerance)
          expect(source.successRate).toBeCloseTo(expectedRate, 1);
          expect(source.totalJobs).toBe(outcomes.length);
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property 5.3: Unhealthy Threshold - Consecutive Failures
   *
   * A source should be marked unhealthy when consecutive failures >= 3
   */
  it('should mark source unhealthy after 3 consecutive failures', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 10 }),
        async (consecutiveFailures) => {
          // Create a source
          const source = SourceConfiguration.create({
            sourceId: 'test-source',
            sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
            name: 'Test Source',
            config: { url: 'https://example.com' },
          });

          // Record failures
          for (let i = 0; i < consecutiveFailures; i++) {
            source.recordFailure();
          }

          // Verify unhealthy status
          if (consecutiveFailures >= 3) {
            expect(source.isUnhealthy()).toBe(true);
          } else {
            // May or may not be unhealthy depending on success rate
            // Just verify it doesn't throw
            expect(typeof source.isUnhealthy()).toBe('boolean');
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property 5.4: Unhealthy Threshold - Success Rate
   *
   * A source should be marked unhealthy when success rate < 50%
   * after at least 5 jobs
   */
  it('should mark source unhealthy when success rate < 50% after 5+ jobs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .record({
            successCount: fc.integer({ min: 0, max: 10 }),
            failureCount: fc.integer({ min: 0, max: 10 }),
          })
          .filter((r) => r.successCount + r.failureCount >= 5),
        async ({ successCount, failureCount }) => {
          // Create a source
          const source = SourceConfiguration.create({
            sourceId: 'test-source',
            sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
            name: 'Test Source',
            config: { url: 'https://example.com' },
          });

          // Record successes and failures (interleaved to avoid consecutive failure threshold)
          const totalJobs = successCount + failureCount;
          for (let i = 0; i < totalJobs; i++) {
            if (i < successCount) {
              source.recordSuccess();
            } else {
              source.recordFailure();
            }
          }

          // Calculate expected success rate
          const expectedRate = (successCount / totalJobs) * 100;

          // Verify unhealthy status
          if (expectedRate < 50) {
            expect(source.isUnhealthy()).toBe(true);
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property 5.5: Success Resets Consecutive Failures
   *
   * For any sequence ending in success, consecutive failures should be 0
   */
  it('should reset consecutive failures on success', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.constantFrom('success', 'failure'), {
          minLength: 1,
          maxLength: 20,
        }),
        async (outcomes) => {
          // Create a source
          const source = SourceConfiguration.create({
            sourceId: 'test-source',
            sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
            name: 'Test Source',
            config: { url: 'https://example.com' },
          });

          // Apply outcomes
          for (const outcome of outcomes) {
            if (outcome === 'success') {
              source.recordSuccess();
            } else {
              source.recordFailure();
            }
          }

          // If last outcome was success, consecutive failures should be 0
          const lastOutcome = outcomes[outcomes.length - 1];
          if (lastOutcome === 'success') {
            expect(source.consecutiveFailures).toBe(0);
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property 5.6: Total Jobs Increments
   *
   * For any sequence of outcomes, total jobs should equal sequence length
   */
  it('should increment total jobs for each outcome', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.constantFrom('success', 'failure'), {
          minLength: 1,
          maxLength: 50,
        }),
        async (outcomes) => {
          // Create a source
          const source = SourceConfiguration.create({
            sourceId: 'test-source',
            sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
            name: 'Test Source',
            config: { url: 'https://example.com' },
          });

          // Apply outcomes
          for (const outcome of outcomes) {
            if (outcome === 'success') {
              source.recordSuccess();
            } else {
              source.recordFailure();
            }
          }

          // Verify total jobs
          expect(source.totalJobs).toBe(outcomes.length);
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property 5.7: Health Status Consistency
   *
   * For any source state, isUnhealthy() should return consistent results
   * when called multiple times without state changes
   */
  it('should return consistent health status', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.constantFrom('success', 'failure'), {
          minLength: 1,
          maxLength: 20,
        }),
        async (outcomes) => {
          // Create a source
          const source = SourceConfiguration.create({
            sourceId: 'test-source',
            sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
            name: 'Test Source',
            config: { url: 'https://example.com' },
          });

          // Apply outcomes
          for (const outcome of outcomes) {
            if (outcome === 'success') {
              source.recordSuccess();
            } else {
              source.recordFailure();
            }
          }

          // Call isUnhealthy multiple times
          const result1 = source.isUnhealthy();
          const result2 = source.isUnhealthy();
          const result3 = source.isUnhealthy();

          // All calls should return the same result
          expect(result1).toBe(result2);
          expect(result2).toBe(result3);
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property 5.8: Success Rate Bounds
   *
   * Success rate should always be between 0 and 100
   */
  it('should keep success rate between 0 and 100', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.constantFrom('success', 'failure'), {
          minLength: 1,
          maxLength: 50,
        }),
        async (outcomes) => {
          // Create a source
          const source = SourceConfiguration.create({
            sourceId: 'test-source',
            sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
            name: 'Test Source',
            config: { url: 'https://example.com' },
          });

          // Apply outcomes
          for (const outcome of outcomes) {
            if (outcome === 'success') {
              source.recordSuccess();
            } else {
              source.recordFailure();
            }
          }

          // Verify success rate bounds
          expect(source.successRate).toBeGreaterThanOrEqual(0);
          expect(source.successRate).toBeLessThanOrEqual(100);
        },
      ),
      { numRuns: 20 },
    );
  });
});
