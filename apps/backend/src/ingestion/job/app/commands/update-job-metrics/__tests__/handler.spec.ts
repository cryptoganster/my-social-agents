import { Test, TestingModule } from '@nestjs/testing';
import { UpdateJobMetricsCommandHandler } from '../handler';
import { UpdateJobMetricsCommand } from '../command';
import { IIngestionJobFactory } from '@/ingestion/job/domain/interfaces/factories/ingestion-job-factory';
import { IIngestionJobWriteRepository } from '@/ingestion/job/domain/interfaces/repositories/ingestion-job-write';
import { IngestionJob } from '@/ingestion/job/domain/aggregates/ingestion-job';
import { SourceConfiguration } from '@/ingestion/source/domain/aggregates/source-configuration';
import {
  SourceType,
  SourceTypeEnum,
} from '@/ingestion/source/domain/value-objects/source-type';

describe('UpdateJobMetricsCommandHandler', () => {
  let handler: UpdateJobMetricsCommandHandler;
  let jobFactory: jest.Mocked<IIngestionJobFactory>;
  let jobWriteRepository: jest.Mocked<IIngestionJobWriteRepository>;

  beforeEach(async () => {
    // Create mocks
    jobFactory = {
      load: jest.fn(),
    } as any;

    jobWriteRepository = {
      save: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateJobMetricsCommandHandler,
        {
          provide: 'IIngestionJobFactory',
          useValue: jobFactory,
        },
        {
          provide: 'IIngestionJobWriteRepository',
          useValue: jobWriteRepository,
        },
      ],
    }).compile();

    handler = module.get<UpdateJobMetricsCommandHandler>(
      UpdateJobMetricsCommandHandler,
    );
  });

  describe('execute', () => {
    it('should successfully update job metrics', async () => {
      // Arrange
      const jobId = 'job-123';
      const command = new UpdateJobMetricsCommand(jobId, {
        itemsCollected: 5,
        duplicatesDetected: 2,
      });

      // Create a mock source configuration
      const sourceConfig = SourceConfiguration.reconstitute({
        sourceId: 'source-123',
        sourceType: SourceType.fromEnum(SourceTypeEnum.RSS),
        name: 'Test Source',
        config: { feedUrl: 'https://example.com/feed' },
        credentials: undefined,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        consecutiveFailures: 0,
        successRate: 100,
        totalJobs: 0,
        lastSuccessAt: null,
        lastFailureAt: null,
        version: 1,
      });

      // Create a job with initial metrics
      const job = IngestionJob.create(jobId, sourceConfig);

      jobFactory.load.mockResolvedValue(job);
      jobWriteRepository.save.mockResolvedValue(undefined);

      // Act
      await handler.execute(command);

      // Assert
      expect(jobFactory.load).toHaveBeenCalledWith(jobId);
      expect(jobWriteRepository.save).toHaveBeenCalledWith(job);

      // Verify metrics were updated
      expect(job.metrics.itemsCollected).toBe(5);
      expect(job.metrics.duplicatesDetected).toBe(2);
    });

    it('should increment existing metrics', async () => {
      // Arrange
      const jobId = 'job-123';

      // Create a mock source configuration
      const sourceConfig = SourceConfiguration.reconstitute({
        sourceId: 'source-123',
        sourceType: SourceType.fromEnum(SourceTypeEnum.RSS),
        name: 'Test Source',
        config: { feedUrl: 'https://example.com/feed' },
        credentials: undefined,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        consecutiveFailures: 0,
        successRate: 100,
        totalJobs: 0,
        lastSuccessAt: null,
        lastFailureAt: null,
        version: 1,
      });

      // Create a job and update metrics once
      const job = IngestionJob.create(jobId, sourceConfig);
      job.updateMetrics({ itemsCollected: 10, duplicatesDetected: 3 });

      jobFactory.load.mockResolvedValue(job);
      jobWriteRepository.save.mockResolvedValue(undefined);

      // Act - Update metrics again
      const command = new UpdateJobMetricsCommand(jobId, {
        itemsCollected: 5,
        validationErrors: 1,
      });
      await handler.execute(command);

      // Assert
      expect(job.metrics.itemsCollected).toBe(15); // 10 + 5
      expect(job.metrics.duplicatesDetected).toBe(3); // unchanged
      expect(job.metrics.errorsEncountered).toBe(1); // 0 + 1
    });

    it('should throw error when job is not found', async () => {
      // Arrange
      const jobId = 'non-existent-job';
      const command = new UpdateJobMetricsCommand(jobId, {
        itemsCollected: 5,
      });

      jobFactory.load.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        `Ingestion job not found: ${jobId}`,
      );

      expect(jobWriteRepository.save).not.toHaveBeenCalled();
    });

    it('should handle partial metric updates', async () => {
      // Arrange
      const jobId = 'job-123';
      const command = new UpdateJobMetricsCommand(jobId, {
        validationErrors: 2, // Only update validation errors
      });

      // Create a mock source configuration
      const sourceConfig = SourceConfiguration.reconstitute({
        sourceId: 'source-123',
        sourceType: SourceType.fromEnum(SourceTypeEnum.RSS),
        name: 'Test Source',
        config: { feedUrl: 'https://example.com/feed' },
        credentials: undefined,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        consecutiveFailures: 0,
        successRate: 100,
        totalJobs: 0,
        lastSuccessAt: null,
        lastFailureAt: null,
        version: 1,
      });

      const job = IngestionJob.create(jobId, sourceConfig);
      job.updateMetrics({ itemsCollected: 10 });

      jobFactory.load.mockResolvedValue(job);
      jobWriteRepository.save.mockResolvedValue(undefined);

      // Act
      await handler.execute(command);

      // Assert
      expect(job.metrics.itemsCollected).toBe(10); // unchanged
      expect(job.metrics.errorsEncountered).toBe(2); // updated
    });

    it('should increment version on metrics update', async () => {
      // Arrange
      const jobId = 'job-123';
      const command = new UpdateJobMetricsCommand(jobId, {
        itemsCollected: 1,
      });

      // Create a mock source configuration
      const sourceConfig = SourceConfiguration.reconstitute({
        sourceId: 'source-123',
        sourceType: SourceType.fromEnum(SourceTypeEnum.RSS),
        name: 'Test Source',
        config: { feedUrl: 'https://example.com/feed' },
        credentials: undefined,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        consecutiveFailures: 0,
        successRate: 100,
        totalJobs: 0,
        lastSuccessAt: null,
        lastFailureAt: null,
        version: 1,
      });

      const job = IngestionJob.create(jobId, sourceConfig);
      const initialVersion = job.version.value;

      jobFactory.load.mockResolvedValue(job);
      jobWriteRepository.save.mockResolvedValue(undefined);

      // Act
      await handler.execute(command);

      // Assert
      expect(job.version.value).toBe(initialVersion + 1);
    });
  });
});
