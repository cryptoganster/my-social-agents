import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleIngestionJobCommandHandler } from '../handler';
import { ScheduleIngestionJobCommand } from '../command';
import { ISourceConfigurationFactory } from '@/ingestion/source/domain/interfaces/factories/source-configuration-factory';
import { IIngestionJobWriteRepository } from '@/ingestion/job/domain/interfaces/repositories/ingestion-job-write';
import { IJobScheduler } from '@/shared/kernel';
import { SourceConfiguration } from '@/ingestion/source/domain/aggregates/source-configuration';
import {
  SourceType,
  SourceTypeEnum,
} from '@/ingestion/source/domain/value-objects/source-type';

describe('ScheduleIngestionJobCommandHandler', () => {
  let handler: ScheduleIngestionJobCommandHandler;
  let sourceConfigFactory: jest.Mocked<ISourceConfigurationFactory>;
  let jobWriteRepository: jest.Mocked<IIngestionJobWriteRepository>;
  let jobScheduler: jest.Mocked<IJobScheduler>;

  beforeEach(async () => {
    // Create mocks
    sourceConfigFactory = {
      load: jest.fn(),
    } as jest.Mocked<ISourceConfigurationFactory>;

    jobWriteRepository = {
      save: jest.fn(),
    } as jest.Mocked<IIngestionJobWriteRepository>;

    jobScheduler = {
      scheduleOnce: jest.fn(),
      scheduleRecurring: jest.fn(),
      cancel: jest.fn(),
      isScheduled: jest.fn(),
      cancelAll: jest.fn(),
    } as jest.Mocked<IJobScheduler>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleIngestionJobCommandHandler,
        {
          provide: 'ISourceConfigurationFactory',
          useValue: sourceConfigFactory,
        },
        {
          provide: 'IIngestionJobWriteRepository',
          useValue: jobWriteRepository,
        },
        {
          provide: 'IJobScheduler',
          useValue: jobScheduler,
        },
      ],
    }).compile();

    handler = module.get<ScheduleIngestionJobCommandHandler>(
      ScheduleIngestionJobCommandHandler,
    );
  });

  describe('execute', () => {
    it('should schedule an ingestion job successfully', async () => {
      // Arrange
      const sourceId = 'source-123';
      const scheduledAt = new Date(Date.now() + 60000); // 1 minute from now
      const command = new ScheduleIngestionJobCommand(
        sourceId,
        scheduledAt,
        'job-123',
      );

      const mockSourceConfig = SourceConfiguration.reconstitute({
        sourceId,
        sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
        name: 'Test Source',
        config: { url: 'https://example.com' },
        credentials: undefined,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      });

      sourceConfigFactory.load.mockResolvedValue(mockSourceConfig);
      jobWriteRepository.save.mockResolvedValue();

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result).toEqual({
        jobId: 'job-123',
        sourceId,
        scheduledAt,
        isScheduled: true,
      });

      expect(sourceConfigFactory.load).toHaveBeenCalledWith(sourceId);
      expect(jobWriteRepository.save).toHaveBeenCalledTimes(1);
      expect(jobScheduler.scheduleOnce).toHaveBeenCalledWith(
        'job-123',
        expect.any(Function),
        scheduledAt,
      );
    });

    it('should schedule for immediate execution when no scheduledAt provided', async () => {
      // Arrange
      const sourceId = 'source-123';
      const command = new ScheduleIngestionJobCommand(sourceId);

      const mockSourceConfig = SourceConfiguration.reconstitute({
        sourceId,
        sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
        name: 'Test Source',
        config: { url: 'https://example.com' },
        credentials: undefined,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      });

      sourceConfigFactory.load.mockResolvedValue(mockSourceConfig);
      jobWriteRepository.save.mockResolvedValue();

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isScheduled).toBe(true);
      expect(sourceConfigFactory.load).toHaveBeenCalledWith(sourceId);
      expect(jobWriteRepository.save).toHaveBeenCalledTimes(1);
      expect(jobScheduler.scheduleOnce).toHaveBeenCalledTimes(1);
    });

    it('should throw error when source configuration not found', async () => {
      // Arrange
      const sourceId = 'non-existent-source';
      const command = new ScheduleIngestionJobCommand(sourceId);

      sourceConfigFactory.load.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'Source configuration not found: non-existent-source',
      );

      expect(jobWriteRepository.save).not.toHaveBeenCalled();
      expect(jobScheduler.scheduleOnce).not.toHaveBeenCalled();
    });

    it('should throw error when source configuration is inactive', async () => {
      // Arrange
      const sourceId = 'source-123';
      const command = new ScheduleIngestionJobCommand(sourceId);

      const mockSourceConfig = SourceConfiguration.reconstitute({
        sourceId,
        sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
        name: 'Test Source',
        config: { url: 'https://example.com' },
        credentials: undefined,
        isActive: false, // Inactive
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      });

      sourceConfigFactory.load.mockResolvedValue(mockSourceConfig);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'Source configuration is inactive: source-123',
      );

      expect(jobWriteRepository.save).not.toHaveBeenCalled();
      expect(jobScheduler.scheduleOnce).not.toHaveBeenCalled();
    });

    it('should throw error when source configuration is invalid', async () => {
      // Arrange
      const sourceId = 'source-123';
      const command = new ScheduleIngestionJobCommand(sourceId);

      const mockSourceConfig = SourceConfiguration.reconstitute({
        sourceId,
        sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
        name: 'Test Source',
        config: {}, // Invalid config - missing required fields
        credentials: undefined,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      });

      sourceConfigFactory.load.mockResolvedValue(mockSourceConfig);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'Invalid source configuration',
      );

      expect(jobWriteRepository.save).not.toHaveBeenCalled();
      expect(jobScheduler.scheduleOnce).not.toHaveBeenCalled();
    });
  });
});
