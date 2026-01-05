import { Injectable } from '@nestjs/common';
import {
  IJobScheduler,
  JobCallback,
} from '@/ingestion/domain/interfaces/external';

/**
 * Scheduled job configuration
 */
export interface ScheduledJob {
  jobId: string;
  callback: JobCallback;
  scheduledAt: Date;
  interval?: number; // milliseconds for recurring jobs
}

/**
 * JobSchedulerService
 *
 * Concrete implementation of IJobScheduler interface using Node.js timers.
 * Handles timed job execution for ingestion jobs.
 *
 * Requirements: 4.2
 */
@Injectable()
export class JobSchedulerService implements IJobScheduler {
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();
  private recurringJobs: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Schedule a one-time job to execute at a specific time
   *
   * @param jobId - Unique identifier for the job
   * @param callback - Function to execute when job runs
   * @param scheduledAt - When to execute the job
   * @throws Error if job with same ID already exists
   */
  scheduleOnce(jobId: string, callback: JobCallback, scheduledAt: Date): void {
    if (this.scheduledJobs.has(jobId) || this.recurringJobs.has(jobId)) {
      throw new Error(`Job with ID ${jobId} is already scheduled`);
    }

    const now = Date.now();
    const scheduledTime = scheduledAt.getTime();
    const delay = Math.max(0, scheduledTime - now);

    const timeout = setTimeout((): void => {
      void (async (): Promise<void> => {
        try {
          await callback();
        } catch (error) {
          // Log error but don't throw - job has executed
          console.error(`Job ${jobId} failed:`, error);
        } finally {
          // Clean up after execution
          this.scheduledJobs.delete(jobId);
        }
      })();
    }, delay);

    this.scheduledJobs.set(jobId, timeout);
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
    if (this.scheduledJobs.has(jobId) || this.recurringJobs.has(jobId)) {
      throw new Error(`Job with ID ${jobId} is already scheduled`);
    }

    if (intervalMs <= 0) {
      throw new Error('Interval must be positive');
    }

    const interval = setInterval((): void => {
      void (async (): Promise<void> => {
        try {
          await callback();
        } catch (error) {
          // Log error but continue recurring execution
          console.error(`Recurring job ${jobId} failed:`, error);
        }
      })();
    }, intervalMs);

    this.recurringJobs.set(jobId, interval);
  }

  /**
   * Cancel a scheduled job (one-time or recurring)
   *
   * @param jobId - ID of the job to cancel
   * @returns true if job was cancelled, false if job not found
   */
  cancel(jobId: string): boolean {
    // Check one-time jobs
    const oneTimeTimeout = this.scheduledJobs.get(jobId);
    if (oneTimeTimeout) {
      clearTimeout(oneTimeTimeout);
      this.scheduledJobs.delete(jobId);
      return true;
    }

    // Check recurring jobs
    const recurringInterval = this.recurringJobs.get(jobId);
    if (recurringInterval) {
      clearInterval(recurringInterval);
      this.recurringJobs.delete(jobId);
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
    return this.scheduledJobs.has(jobId) || this.recurringJobs.has(jobId);
  }

  /**
   * Get count of scheduled jobs
   *
   * @returns Object with counts of one-time and recurring jobs
   */
  getJobCounts(): { oneTime: number; recurring: number } {
    return {
      oneTime: this.scheduledJobs.size,
      recurring: this.recurringJobs.size,
    };
  }

  /**
   * Cancel all scheduled jobs
   * Useful for cleanup during shutdown
   */
  cancelAll(): void {
    // Cancel all one-time jobs
    for (const timeout of this.scheduledJobs.values()) {
      clearTimeout(timeout);
    }
    this.scheduledJobs.clear();

    // Cancel all recurring jobs
    for (const interval of this.recurringJobs.values()) {
      clearInterval(interval);
    }
    this.recurringJobs.clear();
  }
}
