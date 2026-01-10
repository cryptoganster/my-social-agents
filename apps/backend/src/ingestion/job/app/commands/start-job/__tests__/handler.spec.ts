import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { StartJobCommandHandler } from '../handler';
import { StartJobCommand } from '../command';
import { IIngestionJobFactory } from '@/ingestion/job/domain/interfaces/factories/ingestion-job-factory';
import { IIngestionJobWriteRepository } from '@/ingestion/job/domain/interfaces/repositories/ingestion-job-write';
import { IngestionJob } from '@/ingestion/job/domain/aggregates/ingestion-job';
import { SourceConfiguration } from '@/ingestion/source/domain/aggregates/source-configuration';
import {
  SourceType,
  SourceTypeEnum,
} from '@/ingestion/source/domain/value-objects/source-type';
import { JobStartedEvent } from '@/ingestion/job/domain/events';

/**
 * StartJobCommandHandler Tests
 *
 * Tests the handler that starts an ingestion job.
 * Responsibilities:
 * 1. Load job aggregate using factory
 * 2. Transition job to RUNNING state
 * 3. Persist via write repository
 * 4. Publish JobStartedEvent
 *
 * Requirements: 4.3, 4.4
 */
describe('StartJobCommandHandler', () => {
  let handler: StartJobCommandHandler;
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
        StartJobCommandHandler,
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

    handler = module.get<StartJobCommandHandler>(StartJobCommandHandler);
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
      mockJobFactory.load.mockResolvedValue(job);
      mockJobWriteRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      const command = new StartJobCommand(jobId);
      await handler.execute(command);

      // Assert
      expect(mockJobFactory.load).toHaveBeenCalledWith(jobId);
    });

    it('should throw error when job not found', async () => {
      // Arrange
      const jobId = 'non-existent-job';
      mockJobFactory.load.mockResolvedValue(null);

      // Act & Assert
      const command = new StartJobCommand(jobId);
      await expect(handler.execute(command)).rejects.toThrow(
        `Ingestion job not found: ${jobId}`,
      );
    });

    it('should save job after starting', async () => {
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
      mockJobFactory.load.mockResolvedValue(job);
      mockJobWriteRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      const command = new StartJobCommand(jobId);
      await handler.execute(command);

      // Assert
      expect(mockJobWriteRepository.save).toHaveBeenCalled();
      const savedJob = mockJobWriteRepository.save.mock.calls[0]?.[0];
      expect(savedJob?.status.toString()).toBe('RUNNING');
    });

    it('should publish JobStartedEvent', async () => {
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
      mockJobFactory.load.mockResolvedValue(job);
      mockJobWriteRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      const command = new StartJobCommand(jobId);
      await handler.execute(command);

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.any(JobStartedEvent),
      );
      const publishedEvent = mockEventBus.publish.mock
        .calls[0]?.[0] as JobStartedEvent;
      expect(publishedEvent.jobId).toBe(jobId);
      expect(publishedEvent.sourceId).toBe('test-source');
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
      mockJobFactory.load.mockResolvedValue(job);
      mockJobWriteRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      const command = new StartJobCommand(jobId);
      const result = await handler.execute(command);

      // Assert
      expect(result.jobId).toBe(jobId);
      expect(result.sourceId).toBe('test-source');
      expect(result.startedAt).toBeInstanceOf(Date);
    });
  });
});
