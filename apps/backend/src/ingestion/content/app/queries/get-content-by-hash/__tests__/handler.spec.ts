import { Test, TestingModule } from '@nestjs/testing';
import { GetContentByHashQueryHandler } from '../handler';
import { GetContentByHashQuery } from '../query';
import { IContentItemReadRepository } from '@/ingestion/content/domain/interfaces/repositories/content-item-read';
import { ContentItemReadModel } from '@/ingestion/content/domain/read-models/content-item';
import { ContentHash } from '@/ingestion/content/domain/value-objects/content-hash';

/**
 * Unit Test: GetContentByHashQueryHandler
 *
 * Tests the query handler with mocked dependencies.
 * Validates:
 * - Returns read model when content exists
 * - Returns null when content not found
 * - Properly converts hash string to ContentHash value object
 *
 * Requirements: 2.1, 2.2
 */
describe('GetContentByHashQueryHandler', () => {
  let handler: GetContentByHashQueryHandler;
  let mockReadRepository: jest.Mocked<IContentItemReadRepository>;

  beforeEach(async () => {
    mockReadRepository = {
      findByHash: jest.fn(),
      findById: jest.fn(),
      findBySource: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetContentByHashQueryHandler,
        {
          provide: 'IContentItemReadRepository',
          useValue: mockReadRepository,
        },
      ],
    }).compile();

    handler = module.get<GetContentByHashQueryHandler>(
      GetContentByHashQueryHandler,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return read model when content exists', async () => {
      // Arrange
      const hashValue = 'a'.repeat(64); // Valid 64-character hex string
      const query = new GetContentByHashQuery(hashValue);

      const expectedReadModel: ContentItemReadModel = {
        contentId: 'content-123',
        sourceId: 'source-456',
        contentHash: hashValue,
        rawContent: 'Bitcoin price reaches new high',
        normalizedContent: 'bitcoin price reaches new high',
        title: 'BTC News',
        author: 'John Doe',
        publishedAt: new Date('2024-01-15T10:00:00Z'),
        language: 'en',
        sourceUrl: 'https://example.com/btc',
        assetTags: [
          { symbol: 'BTC', confidence: 0.95 },
          { symbol: 'BITCOIN', confidence: 0.9 },
        ],
        collectedAt: new Date('2024-01-15T10:05:00Z'),
        version: 1,
        createdAt: new Date('2024-01-15T10:05:00Z'),
        updatedAt: new Date('2024-01-15T10:05:00Z'),
      };

      mockReadRepository.findByHash.mockResolvedValue(expectedReadModel);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual(expectedReadModel);
      expect(mockReadRepository.findByHash).toHaveBeenCalledTimes(1);

      // Verify ContentHash value object was created correctly
      const calledWithHash = mockReadRepository.findByHash.mock.calls[0][0];
      expect(calledWithHash).toBeInstanceOf(ContentHash);
      expect(calledWithHash.toString()).toBe(hashValue);
    });

    it('should return null when content does not exist', async () => {
      // Arrange
      const hashValue = 'b'.repeat(64); // Valid 64-character hex string
      const query = new GetContentByHashQuery(hashValue);

      mockReadRepository.findByHash.mockResolvedValue(null);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toBeNull();
      expect(mockReadRepository.findByHash).toHaveBeenCalledTimes(1);

      // Verify ContentHash value object was created correctly
      const calledWithHash = mockReadRepository.findByHash.mock.calls[0][0];
      expect(calledWithHash).toBeInstanceOf(ContentHash);
      expect(calledWithHash.toString()).toBe(hashValue);
    });

    it('should handle different hash values correctly', async () => {
      // Arrange
      const hash1 = '1'.repeat(64);
      const hash2 = '2'.repeat(64);

      const readModel1: ContentItemReadModel = {
        contentId: 'content-1',
        sourceId: 'source-1',
        contentHash: hash1,
        rawContent: 'Content 1',
        normalizedContent: 'content 1',
        title: 'Title 1',
        author: null,
        publishedAt: null,
        language: 'en',
        sourceUrl: null,
        assetTags: [],
        collectedAt: new Date(),
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockReadRepository.findByHash
        .mockResolvedValueOnce(readModel1)
        .mockResolvedValueOnce(null);

      // Act
      const result1 = await handler.execute(new GetContentByHashQuery(hash1));
      const result2 = await handler.execute(new GetContentByHashQuery(hash2));

      // Assert
      expect(result1).toEqual(readModel1);
      expect(result2).toBeNull();
      expect(mockReadRepository.findByHash).toHaveBeenCalledTimes(2);
    });

    it('should propagate repository errors', async () => {
      // Arrange
      const hashValue = 'c'.repeat(64);
      const query = new GetContentByHashQuery(hashValue);

      mockReadRepository.findByHash.mockRejectedValue(
        new Error('Database connection failed'),
      );

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow(
        'Database connection failed',
      );
      expect(mockReadRepository.findByHash).toHaveBeenCalledTimes(1);
    });
  });
});
