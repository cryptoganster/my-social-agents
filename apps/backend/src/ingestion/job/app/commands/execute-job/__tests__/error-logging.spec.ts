import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, EventBus } from '@nestjs/cqrs';
import * as fc from 'fast-check';
import { ExecuteIngestionJobCommandHandler } from '../handler';
import { ExecuteIngestionJobCommand } from '../command';
import { IIngestionJobFactory } from '@/ingestion/job/domain/interfaces/factories/ingestion-job-factory';
import { IIngestionJobWriteRepository } from '@/ingestion/job/domain/interfaces/repositories/ingestion-job-write';
import { IngestionJob } from '@/ingestion/job/domain/aggregates/ingestion-job';
import { IngestionStatusEnum } from '@/ingestion/job/domain/value-objects/ingestion-status';
import { SourceConfiguration } from '@/ingestion/source/domain/aggregates/source-configuration';
import {
  SourceType,
  SourceTypeEnum,
} from '@/ingestion/source/domain/value-objects/source-type';
import { IRetryService } from '@/shared/interfaces/retry';
import { ICircuitBreaker } from '@/shared/interfaces/circuit-breaker';
import { ErrorType } from '@/ingestion/shared/domain/entities/error-record';

/**
 * Property-Based Test: Error Logging Completeness
 *
 * Feature: content-ingestion, Property 18: Error Logging Completeness
 * Validates: Requirements 6.5
 *
 * Property: For any error encountered during ingestion, the system should create a detailed
 * error log entry containing error type, message, timestamp, and stack trace.
 */
describe('ExecuteIngestionJobCommandHandler - Error Logging Property', () => {
  let handler: ExecuteIngestionJobCommandHandler;
  let mockJobFactory: jest.Mocked<IIngestionJobFactory>;
  let mockJobWriteRepository: jest.Mocked<IIngestionJobWriteRepository>;
  let mockCommandBus: jest.Mocked<CommandBus>;
  let mockEventBus: jest.Mocked<EventBus>;
  let mockRetryService: jest.Mocked<IRetryService>;
  let mockCircuitBreaker: jest.Mocked<ICircuitBreaker>;

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.resetAllMocks();
    jest.clearAllMocks();

    // Create fresh mocks
    mockJobFactory = {
      load: jest.fn(),
    } as jest.Mocked<IIngestionJobFactory>;

    mockJobWriteRepository = {
      save: jest.fn(),
    } as jest.Mocked<IIngestionJobWriteRepository>;

    mockCommandBus = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CommandBus>;

    mockEventBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    mockRetryService = {
      execute: jest.fn(),
      calculateDelay: jest.fn(),
    } as jest.Mocked<IRetryService>;

    mockCircuitBreaker = {
      execute: jest.fn(),
      getStats: jest.fn(),
      reset: jest.fn(),
    } as jest.Mocked<ICircuitBreaker>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecuteIngestionJobCommandHandler,
        {
          provide: 'IIngestionJobFactory',
          useValue: mockJobFactory,
        },
        {
          provide: 'IIngestionJobWriteRepository',
          useValue: mockJobWriteRepository,
        },
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
        {
          provide: 'IRetryService',
          useValue: mockRetryService,
        },
        {
          provide: 'ICircuitBreaker',
          useValue: mockCircuitBreaker,
        },
      ],
    }).compile();

    handler = module.get<ExecuteIngestionJobCommandHandler>(
      ExecuteIngestionJobCommandHandler,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  /**
   * Property Test: Error records contain all required fields
   *
   * For any error that occurs during job execution, the error record should contain:
   * - errorType: The type of error
   * - message: The error message
   * - timestamp: When the error occurred
   * - stackTrace: The stack trace (if available)
   */
  it('Property 18: should create error records with all required fields for any error', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }), // jobId
        fc.string({ minLength: 10, maxLength: 200 }), // error message
        fc.boolean(), // whether error has stack trace
        async (jobId, errorMessage, hasStackTrace) => {
          // Reset mocks for this iteration
          mockJobFactory.load.mockClear();
          mockJobWriteRepository.save.mockClear();
          mockRetryService.execute.mockClear();
          mockCircuitBreaker.execute.mockClear();

          // Setup: Create source configuration
          const sourceConfig = SourceConfiguration.create({
            sourceId: 'test-source',
            sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
            name: 'Test Source',
            config: { url: 'https://example.com' },
            credentials: undefined,
            isActive: true,
          });

          // Setup: Create ingestion job
          const job = IngestionJob.create(jobId, sourceConfig);

          mockJobFactory.load.mockResolvedValue(job);

          // Setup: Create error with or without stack trace
          const error = new Error(errorMessage);
          if (!hasStackTrace) {
            error.stack = undefined;
          }

          // Setup: Simulate ingestion failure
          mockRetryService.execute.mockResolvedValue({
            success: false,
            error,
            attempts: 1,
            totalTimeMs: 100,
          });

          mockJobWriteRepository.save.mockResolvedValue(undefined);
          mockEventBus.publish.mockResolvedValue(undefined);

          // Execute
          const command = new ExecuteIngestionJobCommand(jobId);
          const result = await handler.execute(command);

          // Verify: Job was marked as failed
          expect(result.success).toBe(false);
          expect(result.errorsEncountered).toBe(1);

          // Verify: Job was saved with error record
          expect(mockJobWriteRepository.save).toHaveBeenCalled();

          // Get the saved job from the last save call
          const savedJob = mockJobWriteRepository.save.mock.calls[1]?.[0];
          expect(savedJob).toBeDefined();

          // Verify: Error record was added to job
          const errors = savedJob.errors;
          expect(errors.length).toBeGreaterThan(0);

          // Verify: Error record contains all required fields
          const errorRecord = errors[errors.length - 1];
          expect(errorRecord).toBeDefined();

          // Check errorType is present and valid
          expect(errorRecord?.errorType).toBeDefined();
          expect(Object.values(ErrorType)).toContain(errorRecord?.errorType);

          // Check message matches the error message
          expect(errorRecord?.message).toBe(errorMessage);

          // Check timestamp is present and valid
          expect(errorRecord?.timestamp).toBeInstanceOf(Date);
          expect(errorRecord?.timestamp.getTime()).toBeLessThanOrEqual(
            Date.now(),
          );

          // Check stackTrace is present when error has stack
          if (hasStackTrace && error.stack !== undefined) {
            expect(errorRecord?.stackTrace).toBeDefined();
            expect(errorRecord?.stackTrace).toBe(error.stack);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property Test: Error timestamps are accurate
   *
   * For any error, the timestamp should be close to the actual time the error occurred.
   */
  it('Property 18: should record accurate timestamps for errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }), // jobId
        fc.string({ minLength: 10, maxLength: 200 }), // error message
        async (jobId, errorMessage) => {
          // Reset mocks
          mockJobFactory.load.mockClear();
          mockJobWriteRepository.save.mockClear();
          mockRetryService.execute.mockClear();

          // Setup
          const sourceConfig = SourceConfiguration.create({
            sourceId: 'test-source',
            sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
            name: 'Test Source',
            config: { url: 'https://example.com' },
            credentials: undefined,
            isActive: true,
          });

          const job = IngestionJob.create(jobId, sourceConfig);
          mockJobFactory.load.mockResolvedValue(job);

          const error = new Error(errorMessage);
          mockRetryService.execute.mockResolvedValue({
            success: false,
            error,
            attempts: 1,
            totalTimeMs: 100,
          });

          mockJobWriteRepository.save.mockResolvedValue(undefined);
          mockEventBus.publish.mockResolvedValue(undefined);

          // Record time before execution
          const beforeTime = Date.now();

          // Execute
          const command = new ExecuteIngestionJobCommand(jobId);
          await handler.execute(command);

          // Record time after execution
          const afterTime = Date.now();

          // Get the saved job
          const savedJob = mockJobWriteRepository.save.mock.calls[1]?.[0];
          const errorRecord = savedJob?.errors[savedJob.errors.length - 1];

          // Verify: Timestamp is within the execution window
          expect(errorRecord?.timestamp).toBeDefined();
          const errorTime = errorRecord?.timestamp.getTime() ?? 0;
          expect(errorTime).toBeGreaterThanOrEqual(beforeTime);
          expect(errorTime).toBeLessThanOrEqual(afterTime);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property Test: Multiple errors are all logged
   *
   * For any sequence of errors during job execution, all errors should be logged
   * with complete information.
   */
  it('Property 18: should log all errors that occur during execution', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }), // jobId
        fc.array(fc.string({ minLength: 10, maxLength: 100 }), {
          minLength: 1,
          maxLength: 5,
        }), // error messages
        async (jobId, errorMessages) => {
          // Reset mocks
          mockJobFactory.load.mockClear();
          mockJobWriteRepository.save.mockClear();
          mockRetryService.execute.mockClear();

          // Setup
          const sourceConfig = SourceConfiguration.create({
            sourceId: 'test-source',
            sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
            name: 'Test Source',
            config: { url: 'https://example.com' },
            credentials: undefined,
            isActive: true,
          });

          const job = IngestionJob.create(jobId, sourceConfig);
          mockJobFactory.load.mockResolvedValue(job);

          // Simulate failure with the first error message
          const firstError = new Error(errorMessages[0] ?? 'Error');
          mockRetryService.execute.mockResolvedValue({
            success: false,
            error: firstError,
            attempts: errorMessages.length,
            totalTimeMs: 100,
          });

          mockJobWriteRepository.save.mockResolvedValue(undefined);
          mockEventBus.publish.mockResolvedValue(undefined);

          // Execute
          const command = new ExecuteIngestionJobCommand(jobId);
          await handler.execute(command);

          // Get the saved job
          const savedJob = mockJobWriteRepository.save.mock.calls[1]?.[0];

          // Verify: At least one error was logged
          expect(savedJob?.errors.length).toBeGreaterThan(0);

          // Verify: Each error has all required fields
          for (const errorRecord of savedJob?.errors ?? []) {
            expect(errorRecord.errorType).toBeDefined();
            expect(Object.values(ErrorType)).toContain(errorRecord.errorType);
            expect(errorRecord.message).toBeDefined();
            expect(errorRecord.message.length).toBeGreaterThan(0);
            expect(errorRecord.timestamp).toBeInstanceOf(Date);
            expect(errorRecord.errorId).toBeDefined();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property Test: Error types are correctly classified
   *
   * For any error, the error type should be a valid ErrorType enum value.
   */
  it('Property 18: should classify errors with valid error types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }), // jobId
        fc.constantFrom(...Object.values(ErrorType)), // error type
        fc.string({ minLength: 10, maxLength: 200 }), // error message
        async (jobId, _expectedErrorType, errorMessage) => {
          // Reset mocks
          mockJobFactory.load.mockClear();
          mockJobWriteRepository.save.mockClear();
          mockRetryService.execute.mockClear();

          // Setup
          const sourceConfig = SourceConfiguration.create({
            sourceId: 'test-source',
            sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
            name: 'Test Source',
            config: { url: 'https://example.com' },
            credentials: undefined,
            isActive: true,
          });

          const job = IngestionJob.create(jobId, sourceConfig);
          mockJobFactory.load.mockResolvedValue(job);

          const error = new Error(errorMessage);
          mockRetryService.execute.mockResolvedValue({
            success: false,
            error,
            attempts: 1,
            totalTimeMs: 100,
          });

          mockJobWriteRepository.save.mockResolvedValue(undefined);
          mockEventBus.publish.mockResolvedValue(undefined);

          // Execute
          const command = new ExecuteIngestionJobCommand(jobId);
          await handler.execute(command);

          // Get the saved job
          const savedJob = mockJobWriteRepository.save.mock.calls[1]?.[0];
          const errorRecord = savedJob?.errors[savedJob.errors.length - 1];

          // Verify: Error type is a valid ErrorType enum value
          expect(errorRecord?.errorType).toBeDefined();
          expect(Object.values(ErrorType)).toContain(errorRecord?.errorType);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property Test: Fatal errors are also logged
   *
   * For any fatal error (errors that prevent job loading or initial save),
   * the system should attempt to log the error before failing.
   */
  it('Property 18: should attempt to log fatal errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }), // jobId
        fc.string({ minLength: 10, maxLength: 200 }), // error message
        async (jobId, errorMessage) => {
          // Reset mocks
          mockJobFactory.load.mockClear();
          mockJobWriteRepository.save.mockClear();
          mockRetryService.execute.mockClear();

          // Setup: Create source configuration
          const sourceConfig = SourceConfiguration.create({
            sourceId: 'test-source',
            sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
            name: 'Test Source',
            config: { url: 'https://example.com' },
            credentials: undefined,
            isActive: true,
          });

          const job = IngestionJob.create(jobId, sourceConfig);

          // First call: load job successfully
          // Second call: load job for error handling
          mockJobFactory.load
            .mockResolvedValueOnce(job)
            .mockResolvedValueOnce(job);

          // First save: start job - should fail with fatal error
          // This simulates a database failure when trying to start the job
          mockJobWriteRepository.save
            .mockRejectedValueOnce(new Error(errorMessage))
            .mockResolvedValueOnce(undefined); // Second save: error state saved successfully

          // Ingestion should not be called since start fails
          mockRetryService.execute.mockResolvedValue({
            success: true,
            value: {
              itemsCollected: 0,
              duplicatesDetected: 0,
              validationErrors: 0,
              errors: [],
            },
            attempts: 1,
            totalTimeMs: 100,
          });

          mockEventBus.publish.mockResolvedValue(undefined);

          // Execute and expect it to throw
          const command = new ExecuteIngestionJobCommand(jobId);
          await expect(handler.execute(command)).rejects.toThrow();

          // Verify: System attempted to load job for error handling
          expect(mockJobFactory.load).toHaveBeenCalledTimes(2);

          // Verify: System attempted to save error state
          // First save fails (fatal error during start), second save succeeds (error state)
          expect(mockJobWriteRepository.save).toHaveBeenCalledTimes(2);

          // Get the saved job from the second save call (error state)
          const savedJob = mockJobWriteRepository.save.mock.calls[1]?.[0];

          // Verify: Job was transitioned to FAILED state
          expect(savedJob).toBeDefined();
          expect(savedJob.status.getValue()).toBe(IngestionStatusEnum.FAILED);

          // Verify: Error was logged
          expect(savedJob.errors.length).toBeGreaterThan(0);
          const errorRecord = savedJob.errors[savedJob.errors.length - 1];
          expect(errorRecord?.message).toBe(errorMessage);
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Unit Test: Verify error record structure
   *
   * This test verifies the specific structure of error records created by the handler.
   */
  it('should create error records with correct structure', async () => {
    // Setup
    const jobId = 'test-job-123';
    const errorMessage = 'Test error message';

    const sourceConfig = SourceConfiguration.create({
      sourceId: 'test-source',
      sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
      name: 'Test Source',
      config: { url: 'https://example.com' },
      credentials: undefined,
      isActive: true,
    });

    const job = IngestionJob.create(jobId, sourceConfig);
    mockJobFactory.load.mockResolvedValue(job);

    const error = new Error(errorMessage);
    error.stack = 'Error: Test error\n    at test.ts:10:5';

    mockRetryService.execute.mockResolvedValue({
      success: false,
      error,
      attempts: 1,
      totalTimeMs: 100,
    });

    mockJobWriteRepository.save.mockResolvedValue(undefined);
    mockEventBus.publish.mockResolvedValue(undefined);

    // Execute
    const command = new ExecuteIngestionJobCommand(jobId);
    await handler.execute(command);

    // Get the saved job
    const savedJob = mockJobWriteRepository.save.mock.calls[1]?.[0];
    const errorRecord = savedJob?.errors[0];

    // Verify: Error record has correct structure
    expect(errorRecord).toBeDefined();
    expect(errorRecord?.errorId).toBeDefined();
    expect(typeof errorRecord?.errorId).toBe('string');
    expect(errorRecord?.errorType).toBe(ErrorType.UNKNOWN_ERROR);
    expect(errorRecord?.message).toBe(errorMessage);
    expect(errorRecord?.timestamp).toBeInstanceOf(Date);
    expect(errorRecord?.stackTrace).toBe(error.stack);
    expect(errorRecord?.retryCount).toBe(0);
  });
});
