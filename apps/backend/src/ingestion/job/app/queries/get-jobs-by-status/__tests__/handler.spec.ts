import { Test, TestingModule } from '@nestjs/testing';
import { GetJobsByStatusQueryHandler } from '../handler';
import { GetJobsByStatusQuery } from '../query';
import { IIngestionJobReadRepository } from '@/ingestion/job/domain/interfaces/repositories/ingestion-job-read';
import { IngestionJobReadModel } from '@/ingestion/job/domain/read-models/ingestion-job';

describe('GetJobsByStatusQueryHandler', () => {
  let handler: GetJobsByStatusQueryHandler;
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
        GetJobsByStatusQueryHandler,
        {
          provide: 'IIngestionJobReadRepository',
          useValue: mockJobReadRepository,
        },
      ],
    }).compile();

    handler = module.get<GetJobsByStatusQueryHandler>(
      GetJobsByStatusQueryHandler,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return paginated jobs with total count', async () => {
      // Arrange
      const status = 'COMPLETED';
      const limit = 10;
      const offset = 0;

      const mockJobs: IngestionJobReadModel[] = [
        {
          jobId: 'job-1',
          sourceId: 'source-1',
          status: 'COMPLETED',
          scheduledAt: new Date('2024-01-01T00:00:00Z'),
          executedAt: new Date('2024-01-01T00:01:00Z'),
          completedAt: new Date('2024-01-01T00:05:00Z'),
          itemsCollected: 10,
          duplicatesDetected: 2,
          errorsEncountered: 0,
          bytesProcessed: 1024,
          durationMs: 240000,
          errors: [],
          sourceConfig: {
            sourceId: 'source-1',
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
        {
          jobId: 'job-2',
          sourceId: 'source-2',
          status: 'COMPLETED',
          scheduledAt: new Date('2024-01-02T00:00:00Z'),
          executedAt: new Date('2024-01-02T00:01:00Z'),
          completedAt: new Date('2024-01-02T00:05:00Z'),
          itemsCollected: 5,
          duplicatesDetected: 1,
          errorsEncountered: 0,
          bytesProcessed: 512,
          durationMs: 120000,
          errors: [],
          sourceConfig: {
            sourceId: 'source-2',
            sourceType: 'WEB_SCRAPER',
            name: 'Test Source 2',
            config: {},
            isActive: true,
            createdAt: new Date('2024-01-02T00:00:00Z'),
            updatedAt: new Date('2024-01-02T00:00:00Z'),
          },
          version: 1,
          createdAt: new Date('2024-01-02T00:00:00Z'),
          updatedAt: new Date('2024-01-02T00:05:00Z'),
        },
      ];

      mockJobReadRepository.findByStatus.mockResolvedValue(mockJobs);
      mockJobReadRepository.countByStatus.mockResolvedValue(25);

      const query = new GetJobsByStatusQuery(status, limit, offset);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.jobs).toEqual(mockJobs);
      expect(result.total).toBe(25);
      expect(mockJobReadRepository.findByStatus).toHaveBeenCalledWith(
        status,
        limit,
        offset,
      );
      expect(mockJobReadRepository.countByStatus).toHaveBeenCalledWith(status);
    });

    it('should handle different statuses', async () => {
      // Arrange
      const status = 'FAILED';
      const mockJobs: IngestionJobReadModel[] = [
        {
          jobId: 'job-3',
          sourceId: 'source-3',
          status: 'FAILED',
          scheduledAt: new Date('2024-01-03T00:00:00Z'),
          executedAt: new Date('2024-01-03T00:01:00Z'),
          completedAt: null,
          itemsCollected: 0,
          duplicatesDetected: 0,
          errorsEncountered: 1,
          bytesProcessed: 0,
          durationMs: 5000,
          errors: [
            {
              errorId: 'error-1',
              timestamp: new Date('2024-01-03T00:01:05Z'),
              errorType: 'NetworkError',
              message: 'Connection timeout',
              stackTrace: null,
              retryCount: 0,
            },
          ],
          sourceConfig: {
            sourceId: 'source-3',
            sourceType: 'RSS_FEED',
            name: 'Test Source 3',
            config: {},
            isActive: true,
            createdAt: new Date('2024-01-03T00:00:00Z'),
            updatedAt: new Date('2024-01-03T00:00:00Z'),
          },
          version: 1,
          createdAt: new Date('2024-01-03T00:00:00Z'),
          updatedAt: new Date('2024-01-03T00:01:05Z'),
        },
      ];

      mockJobReadRepository.findByStatus.mockResolvedValue(mockJobs);
      mockJobReadRepository.countByStatus.mockResolvedValue(3);

      const query = new GetJobsByStatusQuery(status);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.jobs).toEqual(mockJobs);
      expect(result.total).toBe(3);
      expect(mockJobReadRepository.findByStatus).toHaveBeenCalledWith(
        status,
        undefined,
        undefined,
      );
    });

    it('should handle pagination with offset', async () => {
      // Arrange
      const status = 'RUNNING';
      const limit = 5;
      const offset = 10;

      mockJobReadRepository.findByStatus.mockResolvedValue([]);
      mockJobReadRepository.countByStatus.mockResolvedValue(15);

      const query = new GetJobsByStatusQuery(status, limit, offset);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.jobs).toEqual([]);
      expect(result.total).toBe(15);
      expect(mockJobReadRepository.findByStatus).toHaveBeenCalledWith(
        status,
        limit,
        offset,
      );
    });

    it('should return empty array when no jobs match status', async () => {
      // Arrange
      const status = 'PENDING';
      mockJobReadRepository.findByStatus.mockResolvedValue([]);
      mockJobReadRepository.countByStatus.mockResolvedValue(0);

      const query = new GetJobsByStatusQuery(status);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.jobs).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle repository errors', async () => {
      // Arrange
      const status = 'COMPLETED';
      const error = new Error('Database connection failed');
      mockJobReadRepository.findByStatus.mockRejectedValue(error);

      const query = new GetJobsByStatusQuery(status);

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
