import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { IngestionJobsController } from '../http/controllers/ingestion-jobs.controller';
import { SourcesController } from '../http/controllers/sources.controller';
import { ScheduleJobDto } from '../http/dto/schedule-job.dto';
import { ConfigureSourceDto } from '../http/dto/configure-source.dto';
import { ISourceConfigurationReadRepository } from '@/ingestion/source/app/queries/repositories/source-configuration-read';
import { SourceConfigurationReadModel } from '@/ingestion/source/app/queries/read-models/source-configuration';

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
    let mockQueryBus: jest.Mocked<QueryBus>;

    beforeEach(() => {
      mockCommandBus = {
        execute: jest.fn(),
      } as unknown as jest.Mocked<CommandBus>;

      mockQueryBus = {
        execute: jest.fn(),
      } as any;

      controller = new IngestionJobsController(mockCommandBus, mockQueryBus);
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

        mockQueryBus.execute.mockResolvedValue(expectedJob);

        const result = await controller.getJob(jobId);

        expect(result).toEqual(expectedJob);
        expect(mockQueryBus.execute).toHaveBeenCalledWith(
          expect.objectContaining({ jobId }),
        );
      });

      it('should throw 404 when job not found', async () => {
        const jobId = 'nonexistent-job';

        mockQueryBus.execute.mockResolvedValue(null);

        await expect(controller.getJob(jobId)).rejects.toThrow('Job not found');
      });
    });
  });

  describe('SourcesController', () => {
    let controller: SourcesController;
    let mockCommandBus: jest.Mocked<CommandBus>;
    let mockQueryBus: jest.Mocked<QueryBus>;
    let mockSourceReadRepo: jest.Mocked<ISourceConfigurationReadRepository>;

    beforeEach(() => {
      mockCommandBus = {
        execute: jest.fn(),
      } as unknown as jest.Mocked<CommandBus>;

      mockQueryBus = {
        execute: jest.fn(),
      } as any;

      mockSourceReadRepo = {
        findById: jest.fn(),
        findActive: jest.fn(),
        findByType: jest.fn(),
      } as any;

      controller = new SourcesController(
        mockCommandBus,
        mockQueryBus,
        mockSourceReadRepo,
      );
    });

    describe('POST /sources - createSource', () => {
      it('should create a new source successfully', async () => {
        const dto: ConfigureSourceDto = {
          name: 'Test Source',
          type: 'WEB_SCRAPER',
          config: { url: 'https://example.com' },
          active: true,
        };

        const expectedResult = {
          sourceId: 'source-789',
          isActive: true,
        };

        mockCommandBus.execute.mockResolvedValue(expectedResult);

        const result = await controller.createSource(dto);

        expect(result).toEqual(expectedResult);
        expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
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

        await expect(controller.createSource(dto)).rejects.toThrow(
          'Invalid input',
        );
      });
    });

    describe('PUT /sources/:id - updateSource', () => {
      it('should update an existing source', async () => {
        const sourceId = 'existing-source-123';
        const dto: ConfigureSourceDto = {
          name: 'Updated Source',
          type: 'RSS_FEED',
          config: { feedUrl: 'https://example.com/feed' },
          active: true,
        };

        const expectedResult = {
          sourceId: 'existing-source-123',
          isActive: true,
        };

        mockCommandBus.execute.mockResolvedValue(expectedResult);

        const result = await controller.updateSource(sourceId, dto);

        expect(result).toEqual(expectedResult);
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
            consecutiveFailures: 0,
            successRate: 100.0,
            totalJobs: 0,
            lastSuccessAt: null,
            lastFailureAt: null,
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
            consecutiveFailures: 0,
            successRate: 100.0,
            totalJobs: 0,
            lastSuccessAt: null,
            lastFailureAt: null,
          },
        ];

        mockSourceReadRepo.findActive.mockResolvedValue(expectedSources);

        const result = await controller.listSources();

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
    let mockQueryBus: jest.Mocked<QueryBus>;
    let mockSourceReadRepo: jest.Mocked<ISourceConfigurationReadRepository>;

    beforeEach(() => {
      mockCommandBus = {
        execute: jest.fn(),
      } as unknown as jest.Mocked<CommandBus>;

      mockQueryBus = {
        execute: jest.fn(),
      } as any;

      mockSourceReadRepo = {
        findById: jest.fn(),
        findActive: jest.fn(),
        findByType: jest.fn(),
      } as any;

      jobsController = new IngestionJobsController(
        mockCommandBus,
        mockQueryBus,
      );

      sourcesController = new SourcesController(
        mockCommandBus,
        mockQueryBus,
        mockSourceReadRepo,
      );
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

    it('should handle unexpected errors in source creation', async () => {
      const dto: ConfigureSourceDto = {
        name: 'Test',
        type: 'WEB_SCRAPER',
        config: {},
      };

      mockCommandBus.execute.mockRejectedValue(new Error('Unexpected error'));

      await expect(sourcesController.createSource(dto)).rejects.toThrow(
        'Failed to create source',
      );
    });
  });
});
