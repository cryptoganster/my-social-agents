import { CommandBus } from '@nestjs/cqrs';
import { IngestionJobsController } from '../http/controllers/ingestion-jobs.controller';
import { SourcesController } from '../http/controllers/sources.controller';
import { ScheduleJobDto } from '../http/dto/schedule-job.dto';
import { ConfigureSourceDto } from '../http/dto/configure-source.dto';
import { IIngestionJobReadRepository } from '@/ingestion/job/domain/interfaces/repositories/ingestion-job-read';
import { ISourceConfigurationReadRepository } from '@/ingestion/source/domain/interfaces/repositories/source-configuration-read';
import { SourceConfigurationReadModel } from '@/ingestion/source/domain/read-models/source-configuration';

/**
 * Integration Tests for API Layer
 *
 * Tests CLI commands and REST controllers end-to-end
 *
 * Requirements: All
 */

describe('Ingestion API Integration Tests', () => {
  describe('IngestionJobsController', () => {
    let controller: IngestionJobsController;
    let mockCommandBus: jest.Mocked<CommandBus>;
    let mockJobReadRepo: jest.Mocked<IIngestionJobReadRepository>;

    beforeEach(() => {
      mockCommandBus = {
        execute: jest.fn(),
      } as unknown as jest.Mocked<CommandBus>;

      mockJobReadRepo = {
        findById: jest.fn(),
        findByStatus: jest.fn(),
        findBySourceId: jest.fn(),
      };

      controller = new IngestionJobsController(mockCommandBus, mockJobReadRepo);
    });

    describe('POST /ingestion/jobs - scheduleJob', () => {
      it('should schedule a job successfully', async () => {
        const dto: ScheduleJobDto = {
          sourceId: 'source-123',
        };

        const expectedResult = {
          jobId: 'job-456',
          sourceId: 'source-123',
          scheduledAt: new Date(),
          isScheduled: true,
        };

        mockCommandBus.execute.mockResolvedValue(expectedResult);

        const result = await controller.scheduleJob(dto);

        expect(result).toEqual({
          jobId: 'job-456',
          sourceId: 'source-123',
          scheduledAt: expectedResult.scheduledAt.toISOString(),
        });

        expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
      });

      it('should schedule a job with specific datetime', async () => {
        const scheduledAt = '2026-02-01T10:00:00.000Z';
        const dto: ScheduleJobDto = {
          sourceId: 'source-123',
          scheduledAt,
        };

        const expectedResult = {
          jobId: 'job-456',
          sourceId: 'source-123',
          scheduledAt: new Date(scheduledAt),
          isScheduled: true,
        };

        mockCommandBus.execute.mockResolvedValue(expectedResult);

        const result = await controller.scheduleJob(dto);

        expect(result.scheduledAt).toBe(scheduledAt);
      });

      it('should throw 404 when source not found', async () => {
        const dto: ScheduleJobDto = {
          sourceId: 'nonexistent-source',
        };

        mockCommandBus.execute.mockRejectedValue(
          new Error('Source configuration not found: nonexistent-source'),
        );

        await expect(controller.scheduleJob(dto)).rejects.toThrow(
          'Source not found',
        );
      });

      it('should throw 400 when source is inactive', async () => {
        const dto: ScheduleJobDto = {
          sourceId: 'inactive-source',
        };

        mockCommandBus.execute.mockRejectedValue(
          new Error('Source configuration is inactive: inactive-source'),
        );

        await expect(controller.scheduleJob(dto)).rejects.toThrow(
          'Source is inactive',
        );
      });
    });

    describe('GET /ingestion/jobs/:id - getJob', () => {
      it('should retrieve a job by ID', async () => {
        const jobId = 'job-123';
        const expectedJob = {
          jobId: 'job-123',
          sourceId: 'source-456',
          status: 'PENDING',
          scheduledAt: new Date(),
          executedAt: null,
          completedAt: null,
          itemsCollected: 0,
          duplicatesDetected: 0,
          errorsEncountered: 0,
          bytesProcessed: 0,
          durationMs: 0,
          errors: [],
          sourceConfig: {
            sourceId: 'source-456',
            sourceType: 'WEB_SCRAPER',
            name: 'Test Source',
            config: {},
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          version: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockJobReadRepo.findById.mockResolvedValue(expectedJob);

        const result = await controller.getJob(jobId);

        expect(result).toEqual(expectedJob);
        expect(mockJobReadRepo.findById).toHaveBeenCalledWith(jobId);
      });

      it('should throw 404 when job not found', async () => {
        const jobId = 'nonexistent-job';

        mockJobReadRepo.findById.mockResolvedValue(null);

        await expect(controller.getJob(jobId)).rejects.toThrow('Job not found');
      });
    });
  });

  describe('SourcesController', () => {
    let controller: SourcesController;
    let mockCommandBus: jest.Mocked<CommandBus>;
    let mockSourceReadRepo: jest.Mocked<ISourceConfigurationReadRepository>;

    beforeEach(() => {
      mockCommandBus = {
        execute: jest.fn(),
      } as unknown as jest.Mocked<CommandBus>;

      mockSourceReadRepo = {
        findById: jest.fn(),
        findActive: jest.fn(),
        findByType: jest.fn(),
      };

      controller = new SourcesController(mockCommandBus, mockSourceReadRepo);
    });

    describe('POST /sources - configureSource', () => {
      it('should configure a new source successfully', async () => {
        const dto: ConfigureSourceDto = {
          name: 'Test Source',
          type: 'WEB_SCRAPER',
          config: { url: 'https://example.com' },
          active: true,
        };

        const expectedResult = {
          sourceId: 'source-789',
          isNew: true,
          isActive: true,
        };

        mockCommandBus.execute.mockResolvedValue(expectedResult);

        const result = await controller.configureSource(dto);

        expect(result).toEqual(expectedResult);
        expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
      });

      it('should update an existing source', async () => {
        const dto: ConfigureSourceDto = {
          name: 'Updated Source',
          type: 'RSS_FEED',
          config: { feedUrl: 'https://example.com/feed' },
          active: true,
          sourceId: 'existing-source-123',
        };

        const expectedResult = {
          sourceId: 'existing-source-123',
          isNew: false,
          isActive: true,
        };

        mockCommandBus.execute.mockResolvedValue(expectedResult);

        const result = await controller.configureSource(dto);

        expect(result).toEqual(expectedResult);
        expect(result.isNew).toBe(false);
      });

      it('should throw 400 for invalid source type', async () => {
        const dto: ConfigureSourceDto = {
          name: 'Invalid Source',
          type: 'INVALID_TYPE',
          config: {},
        };

        mockCommandBus.execute.mockRejectedValue(
          new Error('Invalid source type: INVALID_TYPE'),
        );

        await expect(controller.configureSource(dto)).rejects.toThrow(
          'Invalid input',
        );
      });
    });

    describe('GET /sources - listSources', () => {
      it('should list all active sources', async () => {
        const expectedSources: SourceConfigurationReadModel[] = [
          {
            sourceId: 'source-1',
            name: 'Source 1',
            sourceType: 'WEB_SCRAPER',
            config: {},
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 0,
          },
          {
            sourceId: 'source-2',
            name: 'Source 2',
            sourceType: 'RSS_FEED',
            config: {},
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 0,
          },
        ];

        mockSourceReadRepo.findActive.mockResolvedValue(expectedSources);

        const result = await controller.listSources();

        expect(result).toEqual(expectedSources);
        expect(result).toHaveLength(2);
        expect(mockSourceReadRepo.findActive).toHaveBeenCalledTimes(1);
      });

      it('should return empty array when no active sources', async () => {
        mockSourceReadRepo.findActive.mockResolvedValue([]);

        const result = await controller.listSources();

        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
      });
    });
  });

  describe('Error Handling', () => {
    let jobsController: IngestionJobsController;
    let sourcesController: SourcesController;
    let mockCommandBus: jest.Mocked<CommandBus>;

    beforeEach(() => {
      mockCommandBus = {
        execute: jest.fn(),
      } as unknown as jest.Mocked<CommandBus>;

      jobsController = new IngestionJobsController(mockCommandBus, {
        findById: jest.fn(),
        findByStatus: jest.fn(),
        findBySourceId: jest.fn(),
      });

      sourcesController = new SourcesController(mockCommandBus, {
        findById: jest.fn(),
        findActive: jest.fn(),
        findByType: jest.fn(),
      });
    });

    it('should handle unexpected errors in job scheduling', async () => {
      const dto: ScheduleJobDto = { sourceId: 'source-123' };

      mockCommandBus.execute.mockRejectedValue(
        new Error('Unexpected database error'),
      );

      await expect(jobsController.scheduleJob(dto)).rejects.toThrow(
        'Failed to schedule job',
      );
    });

    it('should handle unexpected errors in source configuration', async () => {
      const dto: ConfigureSourceDto = {
        name: 'Test',
        type: 'WEB_SCRAPER',
        config: {},
      };

      mockCommandBus.execute.mockRejectedValue(new Error('Unexpected error'));

      await expect(sourcesController.configureSource(dto)).rejects.toThrow(
        'Failed to configure source',
      );
    });
  });
});
