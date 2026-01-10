import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { IngestionJob } from '../ingestion-job';
import { JobMetrics } from '../../value-objects';
import {
  SourceType,
  SourceTypeEnum,
} from '@/ingestion/source/domain/value-objects';
import { SourceConfiguration } from '@/ingestion/source/domain/aggregates/source-configuration';
import {
  ErrorRecord,
  ErrorType,
} from '@/ingestion/job/domain/entities/error-record';

describe('IngestionJob', () => {
  // Helper to create a valid source configuration
  const createValidSourceConfig = (): SourceConfiguration => {
    return SourceConfiguration.create({
      sourceId: 'source-123',
      sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
      name: 'Test Source',
      config: { url: 'https://example.com' },
      isActive: true,
    });
  };

  describe('Unit Tests', () => {
    it('should create a new job in PENDING state', () => {
      const sourceConfig = createValidSourceConfig();
      const job = IngestionJob.create('job-123', sourceConfig);

      expect(job.jobId).toBe('job-123');
      expect(job.status.getValue()).toBe('PENDING');
      expect(job.executedAt).toBeNull();
      expect(job.completedAt).toBeNull();
      expect(job.errors).toHaveLength(0);
    });

    it('should reject invalid source configuration', () => {
      const invalidConfig = SourceConfiguration.create({
        sourceId: 'source-123',
        sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
        name: '', // Invalid: empty name
        config: {},
        isActive: true,
      });

      expect(() => IngestionJob.create('job-123', invalidConfig)).toThrow(
        'Invalid source configuration',
      );
    });

    it('should start a job', () => {
      const sourceConfig = createValidSourceConfig();
      const job = IngestionJob.create('job-123', sourceConfig);

      job.start();

      expect(job.status.getValue()).toBe('RUNNING');
      expect(job.executedAt).not.toBeNull();
    });

    it('should not start a job that is not in PENDING state', () => {
      const sourceConfig = createValidSourceConfig();
      const job = IngestionJob.create('job-123', sourceConfig);

      job.start();

      expect(() => job.start()).toThrow('Cannot start job in RUNNING state');
    });

    it('should complete a job with metrics', () => {
      const sourceConfig = createValidSourceConfig();
      const job = IngestionJob.create('job-123', sourceConfig);

      job.start();

      const metrics = JobMetrics.create({
        itemsCollected: 10,
        duplicatesDetected: 2,
        errorsEncountered: 1,
        bytesProcessed: 1024,
        durationMs: 5000,
      });

      job.complete(metrics);

      expect(job.status.getValue()).toBe('COMPLETED');
      expect(job.completedAt).not.toBeNull();
      expect(job.metrics.itemsCollected).toBe(10);
    });

    it('should fail a job and record error', () => {
      const sourceConfig = createValidSourceConfig();
      const job = IngestionJob.create('job-123', sourceConfig);

      job.start();

      const error = ErrorRecord.create({
        errorType: ErrorType.NETWORK_ERROR,
        message: 'Connection timeout',
      });

      job.fail(error);

      expect(job.status.getValue()).toBe('FAILED');
      expect(job.completedAt).not.toBeNull();
      expect(job.errors).toHaveLength(1);
      expect(job.getLastError()?.message).toBe('Connection timeout');
    });

    it('should allow retry for failed job with retryable error', () => {
      const sourceConfig = createValidSourceConfig();
      const job = IngestionJob.create('job-123', sourceConfig);

      job.start();

      const error = ErrorRecord.create({
        errorType: ErrorType.NETWORK_ERROR,
        message: 'Connection timeout',
      });

      job.fail(error);

      expect(job.canRetry()).toBe(true);

      job.retry();
      expect(job.status.getValue()).toBe('RETRYING');
    });

    it('should not allow retry for non-retryable errors', () => {
      const sourceConfig = createValidSourceConfig();
      const job = IngestionJob.create('job-123', sourceConfig);

      job.start();

      const error = ErrorRecord.create({
        errorType: ErrorType.VALIDATION_ERROR,
        message: 'Invalid data',
      });

      job.fail(error);

      expect(job.canRetry()).toBe(false);
    });

    it('should not allow retry after max retries exceeded', () => {
      const sourceConfig = createValidSourceConfig();
      const job = IngestionJob.create('job-123', sourceConfig);

      // Simulate 5 failed attempts
      for (let i = 0; i < 5; i++) {
        const error = ErrorRecord.create({
          errorType: ErrorType.NETWORK_ERROR,
          message: `Attempt ${i + 1} failed`,
        });
        error.incrementRetryCount();
        job.addError(error);
      }

      expect(job.canRetry()).toBe(false);
    });

    it('should calculate job duration', () => {
      const sourceConfig = createValidSourceConfig();
      const job = IngestionJob.create('job-123', sourceConfig);

      expect(job.getDuration()).toBeNull();

      job.start();

      // Simulate some work
      const metrics = JobMetrics.create({
        itemsCollected: 5,
        duplicatesDetected: 0,
        errorsEncountered: 0,
        bytesProcessed: 512,
        durationMs: 1000,
      });

      job.complete(metrics);

      const duration = job.getDuration();
      expect(duration).not.toBeNull();
      expect(duration!).toBeGreaterThanOrEqual(0);
    });

    it('should detect overdue jobs', () => {
      const sourceConfig = createValidSourceConfig();
      const pastDate = new Date(Date.now() - 10000); // 10 seconds ago
      const job = IngestionJob.create('job-123', sourceConfig, pastDate);

      expect(job.isOverdue()).toBe(true);

      job.start();
      expect(job.isOverdue()).toBe(false);
    });
  });

  describe('Property-Based Tests', () => {
    // Feature: content-ingestion, Property 11: Job Failure Recovery
    // Validates: Requirements 4.6
    it('should record error details and allow retry for any failed job with retryable error', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // jobId
          fc.constantFrom(
            ErrorType.NETWORK_ERROR,
            ErrorType.RATE_LIMIT_ERROR,
            ErrorType.TIMEOUT_ERROR,
          ), // retryable error types
          fc.string({ minLength: 10, maxLength: 200 }), // error message
          (jobId: string, errorType: ErrorType, errorMessage: string) => {
            const sourceConfig = createValidSourceConfig();
            const job = IngestionJob.create(jobId, sourceConfig);

            // Start the job
            job.start();

            // Create and record error
            const error = ErrorRecord.create({
              errorType,
              message: errorMessage,
            });

            // Fail the job
            job.fail(error);

            // Verify error was recorded
            expect(job.errors).toHaveLength(1);
            const lastError = job.getLastError();
            expect(lastError).not.toBeNull();
            expect(lastError!.errorType).toBe(errorType);
            expect(lastError!.message).toBe(errorMessage);
            expect(lastError!.timestamp).toBeInstanceOf(Date);

            // Verify job can be retried
            expect(job.canRetry()).toBe(true);

            // Verify retry transition works
            job.retry();
            expect(job.status.getValue()).toBe('RETRYING');
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
