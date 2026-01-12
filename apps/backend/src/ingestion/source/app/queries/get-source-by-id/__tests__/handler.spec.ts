import { Test, TestingModule } from '@nestjs/testing';
import { GetSourceByIdQueryHandler } from '../handler';
import { GetSourceByIdQuery } from '../query';
import { ISourceConfigurationReadRepository } from '@/ingestion/source/app/queries/repositories/source-configuration-read';
import { SourceConfigurationReadModel } from '@/ingestion/source/app/queries/read-models/source-configuration';

describe('GetSourceByIdQueryHandler', () => {
  let handler: GetSourceByIdQueryHandler;
  let mockRepository: jest.Mocked<ISourceConfigurationReadRepository>;

  beforeEach(async () => {
    mockRepository = {
      findById: jest.fn(),
      findByIdWithHealth: jest.fn(),
      findActive: jest.fn(),
      findByType: jest.fn(),
      findUnhealthy: jest.fn(),
    } as jest.Mocked<ISourceConfigurationReadRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetSourceByIdQueryHandler,
        {
          provide: 'ISourceConfigurationReadRepository',
          useValue: mockRepository,
        },
      ],
    }).compile();

    handler = module.get<GetSourceByIdQueryHandler>(GetSourceByIdQueryHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return source with health metrics when source exists', async () => {
      // Arrange
      const sourceId = 'source-123';
      const readModel: SourceConfigurationReadModel = {
        sourceId: 'source-123',
        name: 'Test Source',
        sourceType: 'RSS_FEED',
        isActive: true,
        config: {
          url: 'https://example.com/feed',
          interval: 3600,
        },
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-15T10:00:00Z'),
        consecutiveFailures: 0,
        successRate: 95.5,
        totalJobs: 20,
        lastSuccessAt: new Date('2024-01-15T10:00:00Z'),
        lastFailureAt: null,
        version: 1,
      };

      mockRepository.findByIdWithHealth.mockResolvedValue(readModel);

      const query = new GetSourceByIdQuery(sourceId);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toBeDefined();
      expect(result?.sourceId).toBe('source-123');
      expect(result?.healthMetrics.successRate).toBe(95.5);
      expect(mockRepository.findByIdWithHealth).toHaveBeenCalledWith(sourceId);
      expect(mockRepository.findByIdWithHealth).toHaveBeenCalledTimes(1);
    });

    it('should return null when source does not exist', async () => {
      // Arrange
      const sourceId = 'non-existent-source';
      mockRepository.findByIdWithHealth.mockResolvedValue(null);

      const query = new GetSourceByIdQuery(sourceId);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toBeNull();
      expect(mockRepository.findByIdWithHealth).toHaveBeenCalledWith(sourceId);
      expect(mockRepository.findByIdWithHealth).toHaveBeenCalledTimes(1);
    });

    it('should include health metrics in the result', async () => {
      // Arrange
      const sourceId = 'source-456';
      const readModel: SourceConfigurationReadModel = {
        sourceId: 'source-456',
        name: 'Unhealthy Source',
        sourceType: 'WEB_SCRAPER',
        isActive: false,
        config: {
          url: 'https://example.com/page',
          selector: '.content',
        },
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-15T12:00:00Z'),
        consecutiveFailures: 5,
        successRate: 45.2,
        totalJobs: 10,
        lastSuccessAt: new Date('2024-01-10T08:00:00Z'),
        lastFailureAt: new Date('2024-01-15T12:00:00Z'),
        version: 1,
      };

      mockRepository.findByIdWithHealth.mockResolvedValue(readModel);

      const query = new GetSourceByIdQuery(sourceId);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.healthMetrics).toBeDefined();
      expect(result?.healthMetrics.successRate).toBe(45.2);
      expect(result?.healthMetrics.consecutiveFailures).toBe(5);
      expect(result?.healthMetrics.lastSuccessAt).toEqual(
        new Date('2024-01-10T08:00:00Z'),
      );
      expect(result?.healthMetrics.lastFailureAt).toEqual(
        new Date('2024-01-15T12:00:00Z'),
      );
    });

    it('should handle sources with null health metric dates', async () => {
      // Arrange
      const sourceId = 'source-789';
      const readModel: SourceConfigurationReadModel = {
        sourceId: 'source-789',
        name: 'New Source',
        sourceType: 'SOCIAL_MEDIA',
        isActive: true,
        config: {
          platform: 'twitter',
          username: 'testuser',
        },
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        consecutiveFailures: 0,
        successRate: 0,
        totalJobs: 0,
        lastSuccessAt: null,
        lastFailureAt: null,
        version: 1,
      };

      mockRepository.findByIdWithHealth.mockResolvedValue(readModel);

      const query = new GetSourceByIdQuery(sourceId);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.healthMetrics.lastSuccessAt).toBeNull();
      expect(result?.healthMetrics.lastFailureAt).toBeNull();
    });
  });
});
