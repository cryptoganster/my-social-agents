import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { FailJobCommandHandler } from '../handler';
import { FailJobCommand } from '../command';
import { IIngestionJobFactory } from '@/ingestion/job/domain/interfaces/factories/ingestion-job-factory';
import { IIngestionJobWriteRepository } from '@/ingestion/job/domain/interfaces/repositories/ingestion-job-write';
import { IngestionJob } from '@/ingestion/job/domain/aggregates/ingestion-job';
import { SourceConfiguration } from '@/ingestion/source/domain/aggregates/source-configuration';
import {
  SourceType,
  SourceTypeEnum,
} from '@/ingestion/source/domain/value-objects/source-type';
import { JobFailed } from '@/ingestion/job/domain/events';

/**
 * FailJobCommandHandler Tests
 *
 * Tests the handler that fails an ingestion job.
 * Responsibilities:
 * 1. Load job aggregate using factory
 * 2. Transition job to FAILED state with error
 * 3. Persist via write repository
 * 4. Publish JobFailed
 *
 * Requirements: 4.6
 */
describe('FailJobCommandHandler', () => {
  let handler: FailJobCommandHandler;
  let mockJobFactory: jest.Mocked<IIngestionJobFactory>;
  let mockJobWriteRepository: jest.Mocked<IIngestionJobWriteRepository>;
  let mockEventBus: jest.Mocked<EventBus>;

  beforeEach(async () => {
    jest.resetAllMocks();
    jest.clearAllMocks();

    mockJobFactory = {
      load: jest.fn(),
    } as jest.Mocked<IIngestionJobFactory>;

    mockJobWriteRepository = {
      save: jest.fn(),
    } as jest.Mocked<IIngestionJobWriteRepository>;

    mockEventBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FailJobCommandHandler,
        {
          provide: 'IIngestionJobFactory',
          useValue: mockJobFactory,
        },
        {
          provide: 'IIngestionJobWriteRepository',
          useValue: mockJobWriteRepository,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    handler = module.get<FailJobCommandHandler>(FailJobCommandHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('execute', () => {
    it('should load job using factory', async () => {
      // Arrange
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
      job.start(); // Job must be running to fail
      mockJobFactory.load.mockResolvedValue(job);
      mockJobWriteRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      const command = new FailJobCommand(
        jobId,
        'Network error',
        'NETWORK_ERROR',
        'Error stack trace',
      );
      await handler.execute(command);

      // Assert
      expect(mockJobFactory.load).toHaveBeenCalledWith(jobId);
    });

    it('should throw error when job not found', async () => {
      // Arrange
      const jobId = 'non-existent-job';
      mockJobFactory.load.mockResolvedValue(null);

      // Act & Assert
      const command = new FailJobCommand(
        jobId,
        'Network error',
        'NETWORK_ERROR',
      );
      await expect(handler.execute(command)).rejects.toThrow(
        `Ingestion job not found: ${jobId}`,
      );
    });

    it('should save job after failing', async () => {
      // Arrange
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
      job.start();
      mockJobFactory.load.mockResolvedValue(job);
      mockJobWriteRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      const command = new FailJobCommand(
        jobId,
        'Network error',
        'NETWORK_ERROR',
      );
      await handler.execute(command);

      // Assert
      expect(mockJobWriteRepository.save).toHaveBeenCalled();
      const savedJob = mockJobWriteRepository.save.mock.calls[0]?.[0];
      expect(savedJob?.status.toString()).toBe('FAILED');
    });

    it('should publish JobFailed', async () => {
      // Arrange
      const jobId = 'test-job-123';
      const errorMessage = 'Network error';
      const errorType = 'NETWORK_ERROR';
      const stackTrace = 'Error stack trace';
      const sourceConfig = SourceConfiguration.create({
        sourceId: 'test-source',
        sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
        name: 'Test Source',
        config: { url: 'https://example.com' },
        credentials: undefined,
        isActive: true,
      });
      const job = IngestionJob.create(jobId, sourceConfig);
      job.start();
      mockJobFactory.load.mockResolvedValue(job);
      mockJobWriteRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      const command = new FailJobCommand(
        jobId,
        errorMessage,
        errorType,
        stackTrace,
      );
      await handler.execute(command);

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(JobFailed));
      const publishedEvent = mockEventBus.publish.mock
        .calls[0]?.[0] as JobFailed;
      expect(publishedEvent.jobId).toBe(jobId);
      expect(publishedEvent.sourceId).toBe('test-source');
      expect(publishedEvent.error.message).toBe(errorMessage);
      expect(publishedEvent.error.type).toBe(errorType);
      expect(publishedEvent.error.stack).toBe(stackTrace);
    });

    it('should return result with job details', async () => {
      // Arrange
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
      job.start();
      mockJobFactory.load.mockResolvedValue(job);
      mockJobWriteRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      const command = new FailJobCommand(
        jobId,
        'Network error',
        'NETWORK_ERROR',
      );
      const result = await handler.execute(command);

      // Assert
      expect(result.jobId).toBe(jobId);
      expect(result.failedAt).toBeInstanceOf(Date);
    });

    it('should handle optional stack trace', async () => {
      // Arrange
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
      job.start();
      mockJobFactory.load.mockResolvedValue(job);
      mockJobWriteRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act - no stack trace provided
      const command = new FailJobCommand(
        jobId,
        'Network error',
        'NETWORK_ERROR',
      );
      await handler.execute(command);

      // Assert
      const publishedEvent = mockEventBus.publish.mock
        .calls[0]?.[0] as JobFailed;
      expect(publishedEvent.error.stack).toBeUndefined();
    });
  });
});
