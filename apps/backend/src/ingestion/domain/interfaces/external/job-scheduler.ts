/**
 * Job execution callback function
 */
export type JobCallback = () => Promise<void>;

/**
 * IJobScheduler Interface
 *
 * Interface for scheduling and managing timed job execution.
 * Used by use cases to schedule ingestion jobs at specific times or intervals.
 *
 * Requirements: 4.2
 */
export interface IJobScheduler {
  /**
   * Schedule a one-time job to execute at a specific time
   *
   * @param jobId - Unique identifier for the job
   * @param callback - Function to execute when job runs
   * @param scheduledAt - When to execute the job
   * @throws Error if job with same ID already exists
   */
  scheduleOnce(jobId: string, callback: JobCallback, scheduledAt: Date): void;

  /**
   * Schedule a recurring job to execute at regular intervals
   *
   * @param jobId - Unique identifier for the job
   * @param callback - Function to execute on each interval
   * @param intervalMs - Interval in milliseconds between executions
   * @throws Error if job with same ID already exists
   */
  scheduleRecurring(
    jobId: string,
    callback: JobCallback,
    intervalMs: number,
  ): void;

  /**
   * Cancel a scheduled job (one-time or recurring)
   *
   * @param jobId - ID of the job to cancel
   * @returns true if job was cancelled, false if job not found
   */
  cancel(jobId: string): boolean;

  /**
   * Check if a job is currently scheduled
   *
   * @param jobId - ID of the job to check
   * @returns true if job is scheduled (one-time or recurring)
   */
  isScheduled(jobId: string): boolean;

  /**
   * Cancel all scheduled jobs
   * Useful for cleanup during shutdown
   */
  cancelAll(): void;
}
