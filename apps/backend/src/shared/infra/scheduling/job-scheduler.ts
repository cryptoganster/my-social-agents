import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { IJobScheduler, JobCallback } from '@/shared/kernel';

/**
 * JobSchedulerService
 *
 * Shared infrastructure implementation of IJobScheduler interface using NestJS SchedulerRegistry.
 * This service can be used across all bounded contexts for scheduling timed job execution.
 *
 * Features:
 * - One-time job scheduling with automatic cleanup
 * - Recurring job scheduling at fixed intervals
 * - Centralized job management through SchedulerRegistry
 * - Robust error handling that prevents application crashes
 * - Proper integration with NestJS lifecycle
 *
 * The service wraps all job callbacks with error handling to ensure that failures
 * in job execution are logged but don't crash the application.
 *
 * @example
 * ```typescript
 * // In a use case
 * class ProcessDocumentUseCase {
 *   constructor(private readonly scheduler: IJobScheduler) {}
 *
 *   async execute(documentId: string): Promise<void> {
 *     // Schedule document processing in 5 seconds
 *     this.scheduler.scheduleOnce(
 *       `process-${documentId}`,
 *       async () => { await this.processDocument(documentId); },
 *       new Date(Date.now() + 5000)
 *     );
 *   }
 * }
 * ```
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
@Injectable()
export class JobSchedulerService implements IJobScheduler {
  private readonly logger = new Logger(JobSchedulerService.name);

  constructor(private readonly schedulerRegistry: SchedulerRegistry) {}

  /**
   * Wraps a callback with error handling to prevent crashes
   * Logs errors with job context but doesn't rethrow
   *
   * @param jobId - Job identifier for logging
   * @param callback - Original callback to wrap
   * @returns Wrapped callback with error handling
   */
  private wrapCallback(
    jobId: string,
    callback: JobCallback,
  ): () => Promise<void> {
    return async (): Promise<void> => {
      try {
        await callback();
      } catch (error) {
        this.logger.error(
          `Job ${jobId} failed: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    };
  }

  /**
   * Wraps a callback with error handling and cleanup for one-time jobs
   *
   * @param jobId - Job identifier for logging and cleanup
   * @param callback - Original callback to wrap
   * @returns Wrapped callback with error handling and cleanup
   */
  private wrapCallbackWithCleanup(
    jobId: string,
    callback: JobCallback,
  ): () => Promise<void> {
    return async (): Promise<void> => {
      try {
        await callback();
      } catch (error) {
        this.logger.error(
          `Job ${jobId} failed: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
      } finally {
        // Clean up one-time jobs after execution
        if (this.schedulerRegistry.doesExist('timeout', jobId)) {
          this.schedulerRegistry.deleteTimeout(jobId);
        }
      }
    };
  }

  /**
   * Schedule a one-time job to execute at a specific time
   *
   * @param jobId - Unique identifier for the job
   * @param callback - Function to execute when job runs
   * @param scheduledAt - When to execute the job
   * @throws Error if job with same ID already exists
   */
  scheduleOnce(jobId: string, callback: JobCallback, scheduledAt: Date): void {
    // Check if job already exists
    if (
      this.schedulerRegistry.doesExist('timeout', jobId) ||
      this.schedulerRegistry.doesExist('interval', jobId)
    ) {
      throw new Error(`Job with ID ${jobId} is already scheduled`);
    }

    const now = Date.now();
    const scheduledTime = scheduledAt.getTime();
    const delay = Math.max(0, scheduledTime - now);

    // Wrap callback with error handling and cleanup
    const wrappedCallback = this.wrapCallbackWithCleanup(jobId, callback);

    // Create timeout
    const timeout = setTimeout((): void => {
      void wrappedCallback();
    }, delay);

    // Register with SchedulerRegistry
    this.schedulerRegistry.addTimeout(jobId, timeout);
  }

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
  ): void {
    // Check if job already exists
    if (
      this.schedulerRegistry.doesExist('timeout', jobId) ||
      this.schedulerRegistry.doesExist('interval', jobId)
    ) {
      throw new Error(`Job with ID ${jobId} is already scheduled`);
    }

    if (intervalMs <= 0) {
      throw new Error('Interval must be positive');
    }

    // Wrap callback with error handling
    const wrappedCallback = this.wrapCallback(jobId, callback);

    // Create interval
    const interval = setInterval((): void => {
      void wrappedCallback();
    }, intervalMs);

    // Register with SchedulerRegistry
    this.schedulerRegistry.addInterval(jobId, interval);
  }

  /**
   * Cancel a scheduled job (one-time or recurring)
   *
   * @param jobId - ID of the job to cancel
   * @returns true if job was cancelled, false if job not found
   */
  cancel(jobId: string): boolean {
    // Check if timeout exists
    if (this.schedulerRegistry.doesExist('timeout', jobId)) {
      this.schedulerRegistry.deleteTimeout(jobId);
      return true;
    }

    // Check if interval exists
    if (this.schedulerRegistry.doesExist('interval', jobId)) {
      this.schedulerRegistry.deleteInterval(jobId);
      return true;
    }

    return false;
  }

  /**
   * Check if a job is currently scheduled
   *
   * @param jobId - ID of the job to check
   * @returns true if job is scheduled (one-time or recurring)
   */
  isScheduled(jobId: string): boolean {
    return (
      this.schedulerRegistry.doesExist('timeout', jobId) ||
      this.schedulerRegistry.doesExist('interval', jobId)
    );
  }

  /**
   * Cancel all scheduled jobs
   * Useful for cleanup during shutdown
   */
  cancelAll(): void {
    // Get all timeouts and delete them
    const timeouts = this.schedulerRegistry.getTimeouts();
    for (const jobId of timeouts) {
      this.schedulerRegistry.deleteTimeout(jobId);
    }

    // Get all intervals and delete them
    const intervals = this.schedulerRegistry.getIntervals();
    for (const jobId of intervals) {
      this.schedulerRegistry.deleteInterval(jobId);
    }
  }
}
