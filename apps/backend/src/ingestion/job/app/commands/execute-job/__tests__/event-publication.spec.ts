import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, EventBus } from '@nestjs/cqrs';
import { ExecuteIngestionJobCommandHandler } from '../handler';
import { ExecuteIngestionJobCommand } from '../command';
import { IIngestionJobFactory } from '@/ingestion/job/domain/interfaces/factories/ingestion-job-factory';
import { IIngestionJobWriteRepository } from '@/ingestion/job/domain/interfaces/repositories/ingestion-job-write';
import { IngestionJob } from '@/ingestion/job/domain/aggregates/ingestion-job';
import { SourceConfiguration } from '@/ingestion/source/domain/aggregates/source-configuration';
import {
  SourceType,
  SourceTypeEnum,
} from '@/ingestion/source/domain/value-objects/source-type';
import { IRetryService } from '@/shared/interfaces/retry';
import { ICircuitBreaker } from '@/shared/interfaces/circuit-breaker';
import {
  JobStartedEvent,
  JobCompletedEvent,
  JobFailedEvent,
} from '@/ingestion/job/domain/events';
import { IngestContentResult } from '@/ingestion/content/app/commands/ingest-content/result';

/**
 * Unit Tests: Event Publication in ExecuteJobCommandHandler
 *
 * Validates: Requirements 1.3, 1.4, 1.5, 1.6, 1.7
 *
 * Tests that the handler publishes the correct events at the right times:
 * - JobStartedEvent when job starts
 * - JobCompletedEvent when job completes successfully
 * - JobFailedEvent when job fails
 */
describe('ExecuteIngestionJobCommandHandler - Event Publication', () => {
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

  describe('JobStartedEvent publication', () => {
    it('should publish JobStartedEvent when job starts', async () => {
      // Setup
      const jobId = 'test-job-123';
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

      const ingestResult: IngestContentResult = {
        itemsCollected: 10,
        itemsPersisted: 8,
        duplicatesDetected: 2,
        validationErrors: 0,
        errors: [],
      };

      mockRetryService.execute.mockResolvedValue({
        success: true,
        value: ingestResult,
        attempts: 1,
        totalTimeMs: 100,
      });

      mockJobWriteRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Execute
      const command = new ExecuteIngestionJobCommand(jobId);
      await handler.execute(command);

      // Verify: JobStartedEvent was published
      const publishCalls = mockEventBus.publish.mock.calls;
      const startedEventCall = publishCalls.find(
        (call) => call[0] instanceof JobStartedEvent,
      );

      expect(startedEventCall).toBeDefined();
      const startedEvent = startedEventCall?.[0] as JobStartedEvent;
      expect(startedEvent.jobId).toBe(jobId);
      expect(startedEvent.sourceId).toBe('test-source');
      expect(startedEvent.startedAt).toBeInstanceOf(Date);
    });

    it('should publish JobStartedEvent before ingestion begins', async () => {
      // Setup
      const jobId = 'test-job-456';
      const sourceConfig = SourceConfiguration.create({
        sourceId: 'test-source',
        sourceType: SourceType.fromEnum(SourceTypeEnum.RSS),
        name: 'Test RSS',
        config: { feedUrl: 'https://example.com/rss' },
        credentials: undefined,
        isActive: true,
      });

      const job = IngestionJob.create(jobId, sourceConfig);
      mockJobFactory.load.mockResolvedValue(job);

      const ingestResult: IngestContentResult = {
        itemsCollected: 5,
        itemsPersisted: 5,
        duplicatesDetected: 0,
        validationErrors: 0,
        errors: [],
      };

      mockRetryService.execute.mockResolvedValue({
        success: true,
        value: ingestResult,
        attempts: 1,
        totalTimeMs: 50,
      });

      mockJobWriteRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Execute
      const command = new ExecuteIngestionJobCommand(jobId);
      await handler.execute(command);

      // Verify: JobStartedEvent was published before JobCompletedEvent
      const publishCalls = mockEventBus.publish.mock.calls;
      const startedEventIndex = publishCalls.findIndex(
        (call) => call[0] instanceof JobStartedEvent,
      );
      const completedEventIndex = publishCalls.findIndex(
        (call) => call[0] instanceof JobCompletedEvent,
      );

      expect(startedEventIndex).toBeGreaterThanOrEqual(0);
      expect(completedEventIndex).toBeGreaterThanOrEqual(0);
      expect(startedEventIndex).toBeLessThan(completedEventIndex);
    });
  });

  describe('JobCompletedEvent publication', () => {
    it('should publish JobCompletedEvent when job completes successfully', async () => {
      // Setup
      const jobId = 'test-job-789';
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

      const ingestResult: IngestContentResult = {
        itemsCollected: 15,
        itemsPersisted: 12,
        duplicatesDetected: 3,
        validationErrors: 0,
        errors: [],
      };

      mockRetryService.execute.mockResolvedValue({
        success: true,
        value: ingestResult,
        attempts: 1,
        totalTimeMs: 200,
      });

      mockJobWriteRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Execute
      const command = new ExecuteIngestionJobCommand(jobId);
      await handler.execute(command);

      // Verify: JobCompletedEvent was published
      const publishCalls = mockEventBus.publish.mock.calls;
      const completedEventCall = publishCalls.find(
        (call) => call[0] instanceof JobCompletedEvent,
      );

      expect(completedEventCall).toBeDefined();
      const completedEvent = completedEventCall?.[0] as JobCompletedEvent;
      expect(completedEvent.jobId).toBe(jobId);
      expect(completedEvent.sourceId).toBe('test-source');
      expect(completedEvent.completedAt).toBeInstanceOf(Date);
    });

    it('should include correct metrics in JobCompletedEvent', async () => {
      // Setup
      const jobId = 'test-job-metrics';
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

      const ingestResult: IngestContentResult = {
        itemsCollected: 20,
        itemsPersisted: 15,
        duplicatesDetected: 5,
        validationErrors: 2,
        errors: [],
      };

      mockRetryService.execute.mockResolvedValue({
        success: true,
        value: ingestResult,
        attempts: 1,
        totalTimeMs: 300,
      });

      mockJobWriteRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Execute
      const command = new ExecuteIngestionJobCommand(jobId);
      await handler.execute(command);

      // Verify: JobCompletedEvent contains correct metrics
      const publishCalls = mockEventBus.publish.mock.calls;
      const completedEventCall = publishCalls.find(
        (call) => call[0] instanceof JobCompletedEvent,
      );

      const completedEvent = completedEventCall?.[0] as JobCompletedEvent;
      expect(completedEvent.metrics.itemsCollected).toBe(20);
      expect(completedEvent.metrics.itemsPersisted).toBe(15);
      expect(completedEvent.metrics.duplicatesDetected).toBe(5);
      expect(completedEvent.metrics.validationErrors).toBe(2);
      expect(completedEvent.metrics.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('JobFailedEvent publication', () => {
    it('should publish JobFailedEvent when ingestion fails', async () => {
      // Setup
      const jobId = 'test-job-fail';
      const errorMessage = 'Ingestion failed due to network error';
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
      error.stack = 'Error: Network error\n    at test.ts:10:5';

      mockRetryService.execute.mockResolvedValue({
        success: false,
        error,
        attempts: 3,
        totalTimeMs: 500,
      });

      mockJobWriteRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Execute
      const command = new ExecuteIngestionJobCommand(jobId);
      await handler.execute(command);

      // Verify: JobFailedEvent was published
      const publishCalls = mockEventBus.publish.mock.calls;
      const failedEventCall = publishCalls.find(
        (call) => call[0] instanceof JobFailedEvent,
      );

      expect(failedEventCall).toBeDefined();
      const failedEvent = failedEventCall?.[0] as JobFailedEvent;
      expect(failedEvent.jobId).toBe(jobId);
      expect(failedEvent.sourceId).toBe('test-source');
      expect(failedEvent.error.message).toBe(errorMessage);
      expect(failedEvent.error.stack).toBe(error.stack);
      expect(failedEvent.failedAt).toBeInstanceOf(Date);
    });

    it('should publish JobFailedEvent on fatal error', async () => {
      // Setup
      const jobId = 'test-job-fatal';
      const errorMessage = 'Fatal database error';
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
      mockJobFactory.load.mockResolvedValueOnce(job).mockResolvedValueOnce(job);

      // First save: start job - should fail with fatal error
      mockJobWriteRepository.save
        .mockRejectedValueOnce(new Error(errorMessage))
        .mockResolvedValueOnce(undefined); // Second save: error state saved successfully

      mockRetryService.execute.mockResolvedValue({
        success: true,
        value: {
          itemsCollected: 0,
          itemsPersisted: 0,
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

      // Verify: JobFailedEvent was published
      const publishCalls = mockEventBus.publish.mock.calls;
      const failedEventCall = publishCalls.find(
        (call) => call[0] instanceof JobFailedEvent,
      );

      expect(failedEventCall).toBeDefined();
      const failedEvent = failedEventCall?.[0] as JobFailedEvent;
      expect(failedEvent.jobId).toBe(jobId);
      expect(failedEvent.error.message).toBe(errorMessage);
    });

    it('should include error details in JobFailedEvent', async () => {
      // Setup
      const jobId = 'test-job-error-details';
      const errorMessage = 'Detailed error message';
      const errorStack = 'Error: Detailed error\n    at handler.ts:50:10';
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
      error.stack = errorStack;

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

      // Verify: JobFailedEvent contains error details
      const publishCalls = mockEventBus.publish.mock.calls;
      const failedEventCall = publishCalls.find(
        (call) => call[0] instanceof JobFailedEvent,
      );

      const failedEvent = failedEventCall?.[0] as JobFailedEvent;
      expect(failedEvent.error.message).toBe(errorMessage);
      expect(failedEvent.error.type).toBe('UNKNOWN_ERROR');
      expect(failedEvent.error.stack).toBe(errorStack);
    });
  });

  describe('Event publication order', () => {
    it('should publish events in correct order for successful job', async () => {
      // Setup
      const jobId = 'test-job-order';
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

      const ingestResult: IngestContentResult = {
        itemsCollected: 10,
        itemsPersisted: 10,
        duplicatesDetected: 0,
        validationErrors: 0,
        errors: [],
      };

      mockRetryService.execute.mockResolvedValue({
        success: true,
        value: ingestResult,
        attempts: 1,
        totalTimeMs: 100,
      });

      mockJobWriteRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Execute
      const command = new ExecuteIngestionJobCommand(jobId);
      await handler.execute(command);

      // Verify: Events published in correct order
      const publishCalls = mockEventBus.publish.mock.calls;
      expect(publishCalls.length).toBe(2);
      expect(publishCalls[0]?.[0]).toBeInstanceOf(JobStartedEvent);
      expect(publishCalls[1]?.[0]).toBeInstanceOf(JobCompletedEvent);
    });

    it('should publish JobStartedEvent then JobFailedEvent on failure', async () => {
      // Setup
      const jobId = 'test-job-fail-order';
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

      mockRetryService.execute.mockResolvedValue({
        success: false,
        error: new Error('Test error'),
        attempts: 1,
        totalTimeMs: 100,
      });

      mockJobWriteRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Execute
      const command = new ExecuteIngestionJobCommand(jobId);
      await handler.execute(command);

      // Verify: Events published in correct order
      const publishCalls = mockEventBus.publish.mock.calls;
      expect(publishCalls.length).toBe(2);
      expect(publishCalls[0]?.[0]).toBeInstanceOf(JobStartedEvent);
      expect(publishCalls[1]?.[0]).toBeInstanceOf(JobFailedEvent);
    });
  });
});
