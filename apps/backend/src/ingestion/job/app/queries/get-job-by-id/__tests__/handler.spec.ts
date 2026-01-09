import { Test, TestingModule } from '@nestjs/testing';
import { GetJobByIdQueryHandler } from '../handler';
import { GetJobByIdQuery } from '../query';
import { IIngestionJobReadRepository } from '@/ingestion/job/domain/interfaces/repositories/ingestion-job-read';
import { IngestionJobReadModel } from '@/ingestion/job/domain/read-models/ingestion-job';

describe('GetJobByIdQueryHandler', () => {
  let handler: GetJobByIdQueryHandler;
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
        GetJobByIdQueryHandler,
        {
          provide: 'IIngestionJobReadRepository',
          useValue: mockJobReadRepository,
        },
      ],
    }).compile();

    handler = module.get<GetJobByIdQueryHandler>(GetJobByIdQueryHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return job read model when job exists', async () => {
      // Arrange
      const jobId = 'job-123';
      const mockJobReadModel: IngestionJobReadModel = {
        jobId: 'job-123',
        sourceId: 'source-456',
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
          sourceId: 'source-456',
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
      };

      mockJobReadRepository.findById.mockResolvedValue(mockJobReadModel);

      const query = new GetJobByIdQuery(jobId);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(mockJobReadModel);
      expect(mockJobReadRepository.findById).toHaveBeenCalledWith(jobId);
      expect(mockJobReadRepository.findById).toHaveBeenCalledTimes(1);
    });

    it('should return null when job does not exist', async () => {
      // Arrange
      const jobId = 'non-existent-job';
      mockJobReadRepository.findById.mockResolvedValue(null);

      const query = new GetJobByIdQuery(jobId);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toBeNull();
      expect(mockJobReadRepository.findById).toHaveBeenCalledWith(jobId);
      expect(mockJobReadRepository.findById).toHaveBeenCalledTimes(1);
    });

    it('should handle repository errors', async () => {
      // Arrange
      const jobId = 'job-123';
      const error = new Error('Database connection failed');
      mockJobReadRepository.findById.mockRejectedValue(error);

      const query = new GetJobByIdQuery(jobId);

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow(
        'Database connection failed',
      );
      expect(mockJobReadRepository.findById).toHaveBeenCalledWith(jobId);
    });
  });
});
