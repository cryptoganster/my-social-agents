import { Test, TestingModule } from '@nestjs/testing';
import { GetSourceByIdQueryHandler } from './handler';
import { GetSourceByIdQuery, GetSourceByIdResult } from './query';
import { ISourceConfigurationReadRepository } from '@/ingestion/source/domain/interfaces/repositories/source-configuration-read';

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
      const expectedResult: GetSourceByIdResult = {
        sourceId: 'source-123',
        name: 'Test Source',
        sourceType: 'RSS_FEED',
        isActive: true,
        healthMetrics: {
          successRate: 95.5,
          consecutiveFailures: 0,
          totalJobs: 20,
          lastSuccessAt: new Date('2024-01-15T10:00:00Z'),
          lastFailureAt: null,
        },
        config: {
          url: 'https://example.com/feed',
          interval: 3600,
        },
      };

      mockRepository.findByIdWithHealth.mockResolvedValue(expectedResult);

      const query = new GetSourceByIdQuery(sourceId);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(expectedResult);
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
      const resultWithHealthMetrics: GetSourceByIdResult = {
        sourceId: 'source-456',
        name: 'Unhealthy Source',
        sourceType: 'WEB_SCRAPER',
        isActive: false,
        healthMetrics: {
          successRate: 45.2,
          consecutiveFailures: 5,
          totalJobs: 10,
          lastSuccessAt: new Date('2024-01-10T08:00:00Z'),
          lastFailureAt: new Date('2024-01-15T12:00:00Z'),
        },
        config: {
          url: 'https://example.com/page',
          selector: '.content',
        },
      };

      mockRepository.findByIdWithHealth.mockResolvedValue(
        resultWithHealthMetrics,
      );

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
      const resultWithNullDates: GetSourceByIdResult = {
        sourceId: 'source-789',
        name: 'New Source',
        sourceType: 'SOCIAL_MEDIA',
        isActive: true,
        healthMetrics: {
          successRate: 0,
          consecutiveFailures: 0,
          totalJobs: 0,
          lastSuccessAt: null,
          lastFailureAt: null,
        },
        config: {
          platform: 'twitter',
          username: 'testuser',
        },
      };

      mockRepository.findByIdWithHealth.mockResolvedValue(resultWithNullDates);

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
