import { QueryBus } from '@nestjs/cqrs';
import { IngestionJobsController } from '../ingestion-jobs.controller';
import { SourcesController } from '../sources.controller';
import { GetJobsByStatusResponse } from '@/ingestion/job/app/queries/get-jobs-by-status/query';
import { GetJobHistoryResponse } from '@/ingestion/job/app/queries/get-job-history/query';
import { ISourceConfigurationReadRepository } from '@/ingestion/source/app/queries/repositories/source-configuration-read';
import { IngestionJobReadModel } from '@/ingestion/job/app/queries/read-models/ingestion-job';

/**
 * Integration Tests for HTTP Query Endpoints
 *
 * Tests the new query endpoints added to controllers:
 * - GET /ingestion/jobs?status=completed (GetJobsByStatusQuery)
 * - GET /sources/:id/jobs (GetJobHistoryQuery)
 *
 * Requirements: 6.1-6.4
 */

describe('HTTP Query Endpoints Integration Tests', () => {
  describe('IngestionJobsController - GET /ingestion/jobs', () => {
    let controller: IngestionJobsController;
    let mockQueryBus: jest.Mocked<QueryBus>;

    beforeEach(() => {
      mockQueryBus = {
        execute: jest.fn(),
      } as unknown as jest.Mocked<QueryBus>;

      controller = new IngestionJobsController(
        {} as any, // CommandBus not needed for these tests
        mockQueryBus,
      );
    });

    it('should retrieve jobs by status', async () => {
      const status = 'COMPLETED';
      const expectedJobs: IngestionJobReadModel[] = [
        {
          jobId: 'job-1',
          sourceId: 'source-1',
          status: 'COMPLETED',
          scheduledAt: new Date('2026-01-01T10:00:00Z'),
          executedAt: new Date('2026-01-01T10:01:00Z'),
          completedAt: new Date('2026-01-01T10:05:00Z'),
          itemsCollected: 10,
          duplicatesDetected: 2,
          errorsEncountered: 0,
          bytesProcessed: 1024,
          durationMs: 240000,
          errors: [],
          sourceConfig: {
            sourceId: 'source-1',
            sourceType: 'RSS_FEED',
            name: 'Test Feed',
            config: {},
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const expectedResult: GetJobsByStatusResponse = {
        jobs: expectedJobs,
        total: 1,
      };

      mockQueryBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.getJobsByStatus(status);

      expect(result).toEqual(expectedResult);
      expect(result.jobs).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'COMPLETED',
        }),
      );
    });

    it('should retrieve jobs by status with pagination', async () => {
      const status = 'PENDING';
      const limit = '10';
      const offset = '20';

      const expectedResult: GetJobsByStatusResponse = {
        jobs: [],
        total: 50,
      };

      mockQueryBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.getJobsByStatus(status, limit, offset);

      expect(result.total).toBe(50);
      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'PENDING',
          limit: 10,
          offset: 20,
        }),
      );
    });

    it('should throw 400 when status parameter is missing', async () => {
      await expect(
        controller.getJobsByStatus(undefined as any),
      ).rejects.toThrow('Status query parameter is required');
    });

    it('should handle query execution errors', async () => {
      const status = 'COMPLETED';

      mockQueryBus.execute.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(controller.getJobsByStatus(status)).rejects.toThrow(
        'Failed to retrieve jobs',
      );
    });
  });

  describe('SourcesController - GET /sources/:id/jobs', () => {
    let controller: SourcesController;
    let mockQueryBus: jest.Mocked<QueryBus>;
    let mockSourceReadRepo: jest.Mocked<ISourceConfigurationReadRepository>;

    beforeEach(() => {
      mockQueryBus = {
        execute: jest.fn(),
      } as unknown as jest.Mocked<QueryBus>;

      mockSourceReadRepo = {
        findById: jest.fn(),
        findActive: jest.fn(),
        findByType: jest.fn(),
      } as any;

      controller = new SourcesController(
        {} as any, // CommandBus not needed for these tests
        mockQueryBus,
        mockSourceReadRepo,
      );
    });

    it('should retrieve job history for a source', async () => {
      const sourceId = 'source-123';
      const expectedJobs: IngestionJobReadModel[] = [
        {
          jobId: 'job-1',
          sourceId: 'source-123',
          status: 'COMPLETED',
          scheduledAt: new Date('2026-01-03T10:00:00Z'),
          executedAt: new Date('2026-01-03T10:01:00Z'),
          completedAt: new Date('2026-01-03T10:05:00Z'),
          itemsCollected: 15,
          duplicatesDetected: 3,
          errorsEncountered: 0,
          bytesProcessed: 2048,
          durationMs: 240000,
          errors: [],
          sourceConfig: {
            sourceId: 'source-123',
            sourceType: 'WEB_SCRAPER',
            name: 'Test Scraper',
            config: {},
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          jobId: 'job-2',
          sourceId: 'source-123',
          status: 'COMPLETED',
          scheduledAt: new Date('2026-01-02T10:00:00Z'),
          executedAt: new Date('2026-01-02T10:01:00Z'),
          completedAt: new Date('2026-01-02T10:05:00Z'),
          itemsCollected: 12,
          duplicatesDetected: 1,
          errorsEncountered: 0,
          bytesProcessed: 1536,
          durationMs: 240000,
          errors: [],
          sourceConfig: {
            sourceId: 'source-123',
            sourceType: 'WEB_SCRAPER',
            name: 'Test Scraper',
            config: {},
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const expectedResult: GetJobHistoryResponse = {
        jobs: expectedJobs,
        total: 2,
      };

      mockQueryBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.getJobHistory(sourceId);

      expect(result).toEqual(expectedResult);
      expect(result.jobs).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceId: 'source-123',
        }),
      );
    });

    it('should retrieve job history with limit', async () => {
      const sourceId = 'source-456';
      const limit = '5';

      const expectedResult: GetJobHistoryResponse = {
        jobs: [],
        total: 20,
      };

      mockQueryBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.getJobHistory(sourceId, limit);

      expect(result.total).toBe(20);
      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceId: 'source-456',
          limit: 5,
        }),
      );
    });

    it('should return empty history for source with no jobs', async () => {
      const sourceId = 'source-789';

      const expectedResult: GetJobHistoryResponse = {
        jobs: [],
        total: 0,
      };

      mockQueryBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.getJobHistory(sourceId);

      expect(result.jobs).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle query execution errors', async () => {
      const sourceId = 'source-123';

      mockQueryBus.execute.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(controller.getJobHistory(sourceId)).rejects.toThrow(
        'Failed to retrieve job history',
      );
    });
  });

  describe('Query Parameter Parsing', () => {
    let jobsController: IngestionJobsController;
    let mockQueryBus: jest.Mocked<QueryBus>;

    beforeEach(() => {
      mockQueryBus = {
        execute: jest.fn().mockResolvedValue({ jobs: [], total: 0 }),
      } as unknown as jest.Mocked<QueryBus>;

      jobsController = new IngestionJobsController({} as any, mockQueryBus);
    });

    it('should parse limit and offset as integers', async () => {
      await jobsController.getJobsByStatus('PENDING', '25', '50');

      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 25,
          offset: 50,
        }),
      );
    });

    it('should handle undefined limit and offset', async () => {
      await jobsController.getJobsByStatus('COMPLETED');

      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'COMPLETED',
          limit: undefined,
          offset: undefined,
        }),
      );
    });
  });
});
