import { Test, TestingModule } from '@nestjs/testing';
import { QueryBus, EventBus } from '@nestjs/cqrs';
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
  let queryBus: jest.Mocked<QueryBus>;
  let sourceConfigFactory: jest.Mocked<ISourceConfigurationFactory>;
  let jobWriteRepository: jest.Mocked<IIngestionJobWriteRepository>;
  let eventBus: jest.Mocked<EventBus>;

  beforeEach(async () => {
    // Create mocks
    queryBus = {
      execute: jest.fn(),
    } as any;

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
          provide: QueryBus,
          useValue: queryBus,
        },
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
        totalJobs: 0,
        lastSuccessAt: new Date(),
        lastFailureAt: null,
        version: 1,
      });

      queryBus.execute.mockResolvedValue({
        isActive: true,
        healthMetrics: {
          successRate: 95, // 95% as a number 0-100
          consecutiveFailures: 0,
          lastSuccessAt: new Date(),
          lastFailureAt: null,
        },
      });
      sourceConfigFactory.load.mockResolvedValue(mockSourceConfig);
      jobWriteRepository.save.mockResolvedValue();

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.jobId).toBeDefined();
      expect(result.scheduledAt).toEqual(scheduledAt);
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({ sourceId }),
      );
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
        totalJobs: 0,
        lastSuccessAt: new Date(),
        lastFailureAt: null,
        version: 1,
      });

      queryBus.execute.mockResolvedValue({
        isActive: true,
        healthMetrics: {
          successRate: 95, // 95% as a number 0-100
          consecutiveFailures: 0,
          lastSuccessAt: new Date(),
          lastFailureAt: null,
        },
      });
      sourceConfigFactory.load.mockResolvedValue(mockSourceConfig);
      jobWriteRepository.save.mockResolvedValue();

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.jobId).toBeDefined();
      expect(result.scheduledAt).toBeDefined();
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({ sourceId }),
      );
      expect(jobWriteRepository.save).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should throw error when source configuration not found', async () => {
      // Arrange
      const sourceId = 'non-existent-source';
      const command = new ScheduleJobCommand(sourceId);

      queryBus.execute.mockResolvedValue(null);

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

      queryBus.execute.mockResolvedValue({
        isActive: false, // Inactive
        healthMetrics: {
          successRate: 95, // 95% as a number 0-100
          consecutiveFailures: 0,
          lastSuccessAt: new Date(),
          lastFailureAt: null,
        },
      });

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'Cannot schedule job for inactive source: source-123',
      );

      expect(jobWriteRepository.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should throw error when source configuration is unhealthy', async () => {
      // Arrange
      const sourceId = 'source-123';
      const command = new ScheduleJobCommand(sourceId);

      queryBus.execute.mockResolvedValue({
        isActive: true,
        healthMetrics: {
          successRate: 30, // 30% as a number 0-100 (Low success rate)
          consecutiveFailures: 5, // High consecutive failures
          lastSuccessAt: new Date(Date.now() - 86400000),
          lastFailureAt: new Date(),
        },
      });

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'Cannot schedule job for unhealthy source: source-123',
      );

      expect(jobWriteRepository.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });
});
