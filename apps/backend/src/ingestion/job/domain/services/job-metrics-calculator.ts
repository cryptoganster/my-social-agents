import { JobMetrics } from '@/ingestion/job/domain/value-objects/job-metrics';

/**
 * MetricUpdate
 *
 * Represents an incremental update to job metrics.
 * Used for aggregating metrics from multiple events.
 */
export interface MetricUpdate {
  itemsCollected?: number;
  duplicatesDetected?: number;
  errorsEncountered?: number;
  bytesProcessed?: number;
}

/**
 * JobMetricsCalculator Domain Service
 *
 * Encapsulates metrics calculation logic.
 * Provides methods for calculating success rates, durations, and aggregating metrics.
 *
 * Requirements: 3.1, 3.2, 3.3
 * Design: Domain Services - JobMetricsCalculator
 */
export class JobMetricsCalculator {
  /**
   * Calculates success rate from job metrics
   *
   * @param metrics - The job metrics to calculate from
   * @returns Success rate as a percentage (0-100)
   */
  calculateSuccessRate(metrics: JobMetrics): number {
    if (metrics.itemsCollected === 0) {
      return 100; // No items means 100% success
    }

    const successfulItems = metrics.itemsCollected - metrics.errorsEncountered;
    const rate = (successfulItems / metrics.itemsCollected) * 100;

    return Math.max(0, Math.min(100, rate)); // Clamp between 0 and 100
  }

  /**
   * Calculates duration between two timestamps
   *
   * @param startedAt - Job start timestamp
   * @param completedAt - Job completion timestamp
   * @returns Duration in milliseconds
   */
  calculateDuration(startedAt: Date, completedAt: Date): number {
    const duration = completedAt.getTime() - startedAt.getTime();

    if (duration < 0) {
      throw new Error('Invalid duration: completedAt must be after startedAt');
    }

    return duration;
  }

  /**
   * Aggregates multiple metric updates into a single metrics object
   *
   * @param updates - Array of metric updates to aggregate
   * @returns Aggregated JobMetrics
   */
  aggregateMetrics(updates: MetricUpdate[]): JobMetrics {
    let itemsCollected = 0;
    let duplicatesDetected = 0;
    let errorsEncountered = 0;
    let bytesProcessed = 0;

    for (const update of updates) {
      itemsCollected += update.itemsCollected || 0;
      duplicatesDetected += update.duplicatesDetected || 0;
      errorsEncountered += update.errorsEncountered || 0;
      bytesProcessed += update.bytesProcessed || 0;
    }

    return JobMetrics.create({
      itemsCollected,
      duplicatesDetected,
      errorsEncountered,
      bytesProcessed,
      durationMs: 0, // Duration is calculated separately
    });
  }

  /**
   * Calculates items persisted (items collected - duplicates - errors)
   *
   * @param metrics - The job metrics to calculate from
   * @returns Number of items successfully persisted
   */
  calculateItemsPersisted(metrics: JobMetrics): number {
    const persisted =
      metrics.itemsCollected -
      metrics.duplicatesDetected -
      metrics.errorsEncountered;

    return Math.max(0, persisted);
  }

  /**
   * Calculates throughput (bytes per second)
   *
   * @param metrics - The job metrics to calculate from
   * @returns Throughput in bytes per second
   */
  calculateThroughput(metrics: JobMetrics): number {
    if (metrics.durationMs === 0) {
      return 0;
    }

    return (metrics.bytesProcessed / metrics.durationMs) * 1000;
  }
}
