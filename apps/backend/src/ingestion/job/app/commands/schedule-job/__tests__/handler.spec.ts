import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { ScheduleJobCommandHandler } from '../handler';
import { ScheduleJobCommand } from '../command';
import { ISourceConfigurationFactory } from '@/ingestion/source/domain/interfaces/factories/source-configuration-factory';
import { IIngestionJobWriteRepository } from '@/ingestion/job/domain/interfaces/repositories/ingestion-job-write';
import { SourceConfiguration } from '@/ingestion/source/domain/aggregates/source-configuration';
import {
  SourceType,
  SourceTypeEnum,
} from '@/ingestion/source/domain/value-objects/source-type';

describe('ScheduleJobCommandHandler', () => {
  let handler: ScheduleJobCommandHandler;
  let sourceConfigFactory: jest.Mocked<ISourceConfigurationFactory>;
  let jobWriteRepository: jest.Mocked<IIngestionJobWriteRepository>;
  let eventBus: jest.Mocked<EventBus>;

  beforeEach(async () => {
    // Create mocks
    sourceConfigFactory = {
      load: jest.fn(),
    } as jest.Mocked<ISourceConfigurationFactory>;

    jobWriteRepository = {
      save: jest.fn(),
    } as jest.Mocked<IIngestionJobWriteRepository>;

    eventBus = {
      publish: jest.fn(),
      publishAll: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleJobCommandHandler,
        {
          provide: 'ISourceConfigurationFactory',
          useValue: sourceConfigFactory,
        },
        {
          provide: 'IIngestionJobWriteRepository',
          useValue: jobWriteRepository,
        },
        {
          provide: EventBus,
          useValue: eventBus,
        },
      ],
    }).compile();

    handler = module.get<ScheduleJobCommandHandler>(ScheduleJobCommandHandler);
  });

  describe('execute', () => {
    it('should schedule an ingestion job successfully', async () => {
      // Arrange
      const sourceId = 'source-123';
      const scheduledAt = new Date(Date.now() + 60000); // 1 minute from now
      const command = new ScheduleJobCommand(sourceId, scheduledAt);

      const mockSourceConfig = SourceConfiguration.reconstitute({
        sourceId,
        sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
        name: 'Test Source',
        config: { url: 'https://example.com' },
        credentials: undefined,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        consecutiveFailures: 0,
        successRate: 95,
        totalJobs: 10,
        lastSuccessAt: new Date(),
        lastFailureAt: null,
        version: 1,
      });

      sourceConfigFactory.load.mockResolvedValue(mockSourceConfig);
      jobWriteRepository.save.mockResolvedValue();

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.jobId).toBeDefined();
      expect(result.scheduledAt).toEqual(scheduledAt);
      expect(sourceConfigFactory.load).toHaveBeenCalledWith(sourceId);
      expect(jobWriteRepository.save).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: result.jobId,
          sourceId,
        }),
      );
    });

    it('should schedule for immediate execution when no scheduledAt provided', async () => {
      // Arrange
      const sourceId = 'source-123';
      const command = new ScheduleJobCommand(sourceId);

      const mockSourceConfig = SourceConfiguration.reconstitute({
        sourceId,
        sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
        name: 'Test Source',
        config: { url: 'https://example.com' },
        credentials: undefined,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        consecutiveFailures: 0,
        successRate: 95,
        totalJobs: 10,
        lastSuccessAt: new Date(),
        lastFailureAt: null,
        version: 1,
      });

      sourceConfigFactory.load.mockResolvedValue(mockSourceConfig);
      jobWriteRepository.save.mockResolvedValue();

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.jobId).toBeDefined();
      expect(result.scheduledAt).toBeDefined();
      expect(sourceConfigFactory.load).toHaveBeenCalledWith(sourceId);
      expect(jobWriteRepository.save).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should throw error when source configuration not found', async () => {
      // Arrange
      const sourceId = 'non-existent-source';
      const command = new ScheduleJobCommand(sourceId);

      sourceConfigFactory.load.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'Source not found: non-existent-source',
      );

      expect(jobWriteRepository.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should throw error when source configuration is inactive', async () => {
      // Arrange
      const sourceId = 'source-123';
      const command = new ScheduleJobCommand(sourceId);

      const mockSourceConfig = SourceConfiguration.reconstitute({
        sourceId,
        sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
        name: 'Test Source',
        config: { url: 'https://example.com' },
        credentials: undefined,
        isActive: false, // Inactive
        createdAt: new Date(),
        updatedAt: new Date(),
        consecutiveFailures: 0,
        successRate: 95,
        totalJobs: 10,
        lastSuccessAt: new Date(),
        lastFailureAt: null,
        version: 1,
      });

      sourceConfigFactory.load.mockResolvedValue(mockSourceConfig);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'Cannot schedule job for inactive source: source-123',
      );

      expect(jobWriteRepository.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should throw error when source has too many consecutive failures', async () => {
      // Arrange
      const sourceId = 'source-123';
      const command = new ScheduleJobCommand(sourceId);

      const mockSourceConfig = SourceConfiguration.reconstitute({
        sourceId,
        sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
        name: 'Test Source',
        config: { url: 'https://example.com' },
        credentials: undefined,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        consecutiveFailures: 5, // High consecutive failures
        successRate: 80,
        totalJobs: 10,
        lastSuccessAt: new Date(Date.now() - 86400000),
        lastFailureAt: new Date(),
        version: 1,
      });

      sourceConfigFactory.load.mockResolvedValue(mockSourceConfig);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'Cannot schedule job for unhealthy source: source-123',
      );

      expect(jobWriteRepository.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should throw error when source has low success rate', async () => {
      // Arrange
      const sourceId = 'source-123';
      const command = new ScheduleJobCommand(sourceId);

      const mockSourceConfig = SourceConfiguration.reconstitute({
        sourceId,
        sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
        name: 'Test Source',
        config: { url: 'https://example.com' },
        credentials: undefined,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        consecutiveFailures: 0,
        successRate: 30, // Low success rate
        totalJobs: 10, // Enough jobs to trigger threshold
        lastSuccessAt: new Date(Date.now() - 86400000),
        lastFailureAt: new Date(),
        version: 1,
      });

      sourceConfigFactory.load.mockResolvedValue(mockSourceConfig);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'Cannot schedule job for unhealthy source: source-123',
      );

      expect(jobWriteRepository.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should allow scheduling for new source with no job history', async () => {
      // Arrange
      const sourceId = 'source-123';
      const command = new ScheduleJobCommand(sourceId);

      const mockSourceConfig = SourceConfiguration.reconstitute({
        sourceId,
        sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
        name: 'Test Source',
        config: { url: 'https://example.com' },
        credentials: undefined,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        consecutiveFailures: 0,
        successRate: 100, // Default for new sources
        totalJobs: 0, // No job history
        lastSuccessAt: null,
        lastFailureAt: null,
        version: 1,
      });

      sourceConfigFactory.load.mockResolvedValue(mockSourceConfig);
      jobWriteRepository.save.mockResolvedValue();

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.jobId).toBeDefined();
      expect(jobWriteRepository.save).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });
  });
});
