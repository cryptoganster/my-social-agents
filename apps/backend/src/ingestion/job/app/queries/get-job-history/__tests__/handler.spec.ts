import { Test, TestingModule } from '@nestjs/testing';
import { GetJobHistoryQueryHandler } from '../handler';
import { GetJobHistoryQuery } from '../query';
import { IIngestionJobReadRepository } from '@/ingestion/job/domain/interfaces/repositories/ingestion-job-read';
import { IngestionJobReadModel } from '@/ingestion/job/domain/read-models/ingestion-job';

describe('GetJobHistoryQueryHandler', () => {
  let handler: GetJobHistoryQueryHandler;
  let mockJobReadRepository: jest.Mocked<IIngestionJobReadRepository>;

  beforeEach(async () => {
    mockJobReadRepository = {
      findById: jest.fn(),
      findByStatus: jest.fn(),
      countByStatus: jest.fn(),
      findBySourceId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetJobHistoryQueryHandler,
        {
          provide: 'IIngestionJobReadRepository',
          useValue: mockJobReadRepository,
        },
      ],
    }).compile();

    handler = module.get<GetJobHistoryQueryHandler>(GetJobHistoryQueryHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return jobs ordered by executedAt DESC', async () => {
      // Arrange
      const sourceId = 'source-123';
      const mockJobs: IngestionJobReadModel[] = [
        {
          jobId: 'job-3',
          sourceId: 'source-123',
          status: 'COMPLETED',
          scheduledAt: new Date('2024-01-03T00:00:00Z'),
          executedAt: new Date('2024-01-03T00:01:00Z'),
          completedAt: new Date('2024-01-03T00:05:00Z'),
          itemsCollected: 15,
          duplicatesDetected: 3,
          errorsEncountered: 0,
          bytesProcessed: 2048,
          durationMs: 240000,
          errors: [],
          sourceConfig: {
            sourceId: 'source-123',
            sourceType: 'RSS_FEED',
            name: 'Test Source',
            config: {},
            isActive: true,
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-01T00:00:00Z'),
          },
          version: 1,
          createdAt: new Date('2024-01-03T00:00:00Z'),
          updatedAt: new Date('2024-01-03T00:05:00Z'),
        },
        {
          jobId: 'job-2',
          sourceId: 'source-123',
          status: 'COMPLETED',
          scheduledAt: new Date('2024-01-02T00:00:00Z'),
          executedAt: new Date('2024-01-02T00:01:00Z'),
          completedAt: new Date('2024-01-02T00:05:00Z'),
          itemsCollected: 10,
          duplicatesDetected: 2,
          errorsEncountered: 0,
          bytesProcessed: 1024,
          durationMs: 240000,
          errors: [],
          sourceConfig: {
            sourceId: 'source-123',
            sourceType: 'RSS_FEED',
            name: 'Test Source',
            config: {},
            isActive: true,
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-01T00:00:00Z'),
          },
          version: 1,
          createdAt: new Date('2024-01-02T00:00:00Z'),
          updatedAt: new Date('2024-01-02T00:05:00Z'),
        },
        {
          jobId: 'job-1',
          sourceId: 'source-123',
          status: 'COMPLETED',
          scheduledAt: new Date('2024-01-01T00:00:00Z'),
          executedAt: new Date('2024-01-01T00:01:00Z'),
          completedAt: new Date('2024-01-01T00:05:00Z'),
          itemsCollected: 5,
          duplicatesDetected: 1,
          errorsEncountered: 0,
          bytesProcessed: 512,
          durationMs: 240000,
          errors: [],
          sourceConfig: {
            sourceId: 'source-123',
            sourceType: 'RSS_FEED',
            name: 'Test Source',
            config: {},
            isActive: true,
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-01T00:00:00Z'),
          },
          version: 1,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:05:00Z'),
        },
      ];

      mockJobReadRepository.findBySourceId.mockResolvedValue(mockJobs);

      const query = new GetJobHistoryQuery(sourceId);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.jobs).toEqual(mockJobs);
      expect(result.total).toBe(3);
      expect(mockJobReadRepository.findBySourceId).toHaveBeenCalledWith(
        sourceId,
        undefined,
      );
      // Verify ordering (most recent first)
      expect(result.jobs[0].executedAt).toEqual(
        new Date('2024-01-03T00:01:00Z'),
      );
      expect(result.jobs[1].executedAt).toEqual(
        new Date('2024-01-02T00:01:00Z'),
      );
      expect(result.jobs[2].executedAt).toEqual(
        new Date('2024-01-01T00:01:00Z'),
      );
    });

    it('should respect limit parameter', async () => {
      // Arrange
      const sourceId = 'source-456';
      const limit = 5;
      const mockJobs: IngestionJobReadModel[] = [
        {
          jobId: 'job-5',
          sourceId: 'source-456',
          status: 'COMPLETED',
          scheduledAt: new Date('2024-01-05T00:00:00Z'),
          executedAt: new Date('2024-01-05T00:01:00Z'),
          completedAt: new Date('2024-01-05T00:05:00Z'),
          itemsCollected: 8,
          duplicatesDetected: 1,
          errorsEncountered: 0,
          bytesProcessed: 800,
          durationMs: 240000,
          errors: [],
          sourceConfig: {
            sourceId: 'source-456',
            sourceType: 'WEB_SCRAPER',
            name: 'Test Source 2',
            config: {},
            isActive: true,
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-01T00:00:00Z'),
          },
          version: 1,
          createdAt: new Date('2024-01-05T00:00:00Z'),
          updatedAt: new Date('2024-01-05T00:05:00Z'),
        },
      ];

      mockJobReadRepository.findBySourceId.mockResolvedValue(mockJobs);

      const query = new GetJobHistoryQuery(sourceId, limit);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.jobs).toEqual(mockJobs);
      expect(result.total).toBe(1);
      expect(mockJobReadRepository.findBySourceId).toHaveBeenCalledWith(
        sourceId,
        limit,
      );
    });

    it('should return empty array when source has no jobs', async () => {
      // Arrange
      const sourceId = 'source-no-jobs';
      mockJobReadRepository.findBySourceId.mockResolvedValue([]);

      const query = new GetJobHistoryQuery(sourceId);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.jobs).toEqual([]);
      expect(result.total).toBe(0);
      expect(mockJobReadRepository.findBySourceId).toHaveBeenCalledWith(
        sourceId,
        undefined,
      );
    });

    it('should handle repository errors', async () => {
      // Arrange
      const sourceId = 'source-123';
      const error = new Error('Database connection failed');
      mockJobReadRepository.findBySourceId.mockRejectedValue(error);

      const query = new GetJobHistoryQuery(sourceId);

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow(
        'Database connection failed',
      );
      expect(mockJobReadRepository.findBySourceId).toHaveBeenCalledWith(
        sourceId,
        undefined,
      );
    });
  });
});
