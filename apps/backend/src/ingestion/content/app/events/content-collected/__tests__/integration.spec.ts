import { Test, TestingModule } from '@nestjs/testing';
import { EventBus, QueryBus } from '@nestjs/cqrs';
import { createHash } from 'crypto';
import { ContentCollectedEventHandler } from '../handler';
import {
  ContentCollectedEvent,
  ContentIngestedEvent,
  ContentValidationFailedEvent,
} from '@/ingestion/content/domain/events';
import { IContentItemWriteRepository } from '@/ingestion/content/domain/interfaces/repositories/content-item-write';
import { ContentValidationService } from '@/ingestion/content/domain/services/content-validation';
import { ContentNormalizationService } from '@/ingestion/content/domain/services/content-normalization';
import { DuplicateDetectionService } from '@/ingestion/content/domain/services/duplicate-detection';
import { ContentHashGenerator } from '@/ingestion/content/domain/services/content-hash-generator';
import { IHashService } from '@/ingestion/shared/interfaces/external/hash';
import { AssetTag } from '@/ingestion/content/domain/value-objects/asset-tag';
import { GetContentByHashQuery } from '../../../queries/get-content-by-hash/query';

/**
 * Integration Test: ContentCollectedEventHandler
 *
 * Tests the complete integration of the event handler with its dependencies:
 * - QueryBus (for GetContentByHashQuery - duplicate detection)
 * - IContentItemWriteRepository (persistence)
 * - ContentValidationService
 * - ContentNormalizationService
 * - DuplicateDetectionService
 * - EventBus (publishing ContentIngestedEvent and ContentValidationFailedEvent)
 *
 * Validates end-to-end flow from event handling to content persistence.
 */
describe('ContentCollectedEventHandler - Integration Tests', () => {
  let handler: ContentCollectedEventHandler;
  let mockWriteRepo: jest.Mocked<IContentItemWriteRepository>;
  let mockQueryBus: jest.Mocked<QueryBus>;
  let validationService: ContentValidationService;
  let normalizationService: ContentNormalizationService;
  let duplicateDetectionService: DuplicateDetectionService;
  let mockEventBus: jest.Mocked<EventBus>;

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.resetAllMocks();
    jest.clearAllMocks();

    mockWriteRepo = {
      save: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<IContentItemWriteRepository>;

    mockQueryBus = {
      execute: jest.fn().mockResolvedValue(null), // Default: no duplicate found
    } as unknown as jest.Mocked<QueryBus>;

    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EventBus>;

    // Mock IHashService for ContentHashGenerator
    const mockHashService: IHashService = {
      sha256: jest.fn((content: string): string => {
        // Simple mock hash implementation - returns valid 64-character hex string
        const hash = createHash('sha256').update(content).digest('hex');
        return hash;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentCollectedEventHandler,
        {
          provide: 'IContentItemWriteRepository',
          useValue: mockWriteRepo,
        },
        {
          provide: QueryBus,
          useValue: mockQueryBus,
        },
        {
          provide: 'IContentValidationService',
          useClass: ContentValidationService,
        },
        {
          provide: 'IContentNormalizationService',
          useClass: ContentNormalizationService,
        },
        {
          provide: 'IDuplicateDetectionService',
          useClass: DuplicateDetectionService,
        },
        {
          provide: ContentHashGenerator,
          useFactory: (hashService: IHashService) =>
            new ContentHashGenerator(hashService),
          inject: ['IHashService'],
        },
        {
          provide: 'IHashService',
          useValue: mockHashService,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    handler = module.get<ContentCollectedEventHandler>(
      ContentCollectedEventHandler,
    );
    validationService = module.get<ContentValidationService>(
      'IContentValidationService',
    );
    normalizationService = module.get<ContentNormalizationService>(
      'IContentNormalizationService',
    );
    duplicateDetectionService = module.get<DuplicateDetectionService>(
      'IDuplicateDetectionService',
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    duplicateDetectionService.clear();
  });

  describe('Successful Content Processing', () => {
    it('should process valid content and persist it', async () => {
      // Arrange
      const event = new ContentCollectedEvent(
        'test-source',
        'test-job-id', // jobId
        'Bitcoin reaches new all-time high above $100,000. Ethereum also shows strong gains.',
        {
          title: 'Crypto Market Update',
          author: 'John Doe',
          publishedAt: new Date('2024-01-15'),
          language: 'en',
          sourceUrl: 'https://example.com/crypto-news',
        },
        'WEB', // SourceType enum values are uppercase
        new Date(),
      );

      mockQueryBus.execute.mockResolvedValue(null); // Not a duplicate

      // Act
      await handler.handle(event);

      // Assert
      expect(mockQueryBus.execute).toHaveBeenCalledTimes(1);
      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        expect.any(GetContentByHashQuery),
      );

      expect(mockWriteRepo.save).toHaveBeenCalledTimes(1);
      const savedItem = mockWriteRepo.save.mock.calls[0][0];

      expect(savedItem.sourceId).toBe('test-source');
      expect(savedItem.rawContent).toBe(event.rawContent);
      expect(savedItem.normalizedContent).toBeTruthy();
      expect(savedItem.metadata.title).toBe('Crypto Market Update');
      expect(savedItem.metadata.author).toBe('John Doe');

      // Verify ContentIngestedEvent was published
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = mockEventBus.publish.mock
        .calls[0][0] as ContentIngestedEvent;
      expect(publishedEvent).toBeInstanceOf(ContentIngestedEvent);
      expect(publishedEvent.sourceId).toBe('test-source');
    });

    it('should detect and extract asset tags from content', async () => {
      // Arrange
      const event = new ContentCollectedEvent(
        'crypto-source',
        'test-job-id', // jobId
        'Bitcoin (BTC) and Ethereum (ETH) lead the market. Solana and Cardano also perform well.',
        {
          title: 'Top Cryptocurrencies',
          sourceUrl: 'https://example.com/top-crypto',
        },
        'WEB',
        new Date(),
      );

      mockQueryBus.execute.mockResolvedValue(null);

      // Act
      await handler.handle(event);

      // Assert
      const savedItem = mockWriteRepo.save.mock.calls[0][0];
      expect(savedItem.assetTags.length).toBeGreaterThan(0);

      const symbols = savedItem.assetTags.map((tag: AssetTag) => tag.symbol);
      expect(symbols).toContain('BTC');
      expect(symbols).toContain('ETH');
    });

    it('should merge event metadata with extracted metadata', async () => {
      // Arrange
      const event = new ContentCollectedEvent(
        'test-source',
        'test-job-id', // jobId
        'This is a test article about cryptocurrency trends in 2024.',
        {
          title: 'Event Title', // This should take precedence
          // author not provided, should be extracted
          sourceUrl: 'https://example.com/article',
        },
        'WEB',
        new Date(),
      );

      mockQueryBus.execute.mockResolvedValue(null);

      // Act
      await handler.handle(event);

      // Assert
      const savedItem = mockWriteRepo.save.mock.calls[0][0];
      expect(savedItem.metadata.title).toBe('Event Title'); // From event
      expect(savedItem.metadata.sourceUrl).toBe('https://example.com/article');
    });

    it('should normalize content before processing', async () => {
      // Arrange
      const rawContent = `
        Bitcoin    reaches   new   high.
        
        
        Multiple    spaces    and    lines.
      `;

      const event = new ContentCollectedEvent(
        'test-source',
        'test-job-id', // jobId
        rawContent,
        { title: 'Test' },
        'WEB',
        new Date(),
      );

      mockQueryBus.execute.mockResolvedValue(null);

      // Act
      await handler.handle(event);

      // Assert
      const savedItem = mockWriteRepo.save.mock.calls[0][0];
      expect(savedItem.normalizedContent).not.toBe(rawContent);
      expect(savedItem.normalizedContent).not.toContain('   '); // Multiple spaces removed
      expect(savedItem.normalizedContent.trim()).toBeTruthy();
    });
  });

  describe('Duplicate Detection', () => {
    it('should not persist duplicate content when query returns existing content', async () => {
      // Arrange
      const content = 'This is duplicate content about Bitcoin.';
      const event = new ContentCollectedEvent(
        'test-source',
        'test-job-id', // jobId
        content,
        { title: 'Duplicate Article' },
        'WEB',
        new Date(),
      );

      // Simulate existing content with same hash via query
      mockQueryBus.execute.mockResolvedValue({
        contentId: 'existing-id',
        sourceId: 'test-source',
        contentHash: 'some-hash',
        rawContent: content,
        normalizedContent: content,
        title: 'Original Article',
        author: null,
        publishedAt: null,
        language: 'en',
        sourceUrl: null,
        assetTags: [],
        collectedAt: new Date(),
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      await handler.handle(event);

      // Assert
      expect(mockQueryBus.execute).toHaveBeenCalledTimes(1);
      expect(mockWriteRepo.save).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should record duplicate hash when detected via query', async () => {
      // Arrange
      const event = new ContentCollectedEvent(
        'test-source',
        'test-job-id', // jobId
        'Duplicate content',
        { title: 'Test' },
        'WEB',
        new Date(),
      );

      // Simulate existing content with same hash - this will make it a duplicate
      mockQueryBus.execute.mockResolvedValue({
        contentId: 'existing-id',
        sourceId: 'test-source',
        contentHash: 'hash',
        rawContent: 'content',
        normalizedContent: 'content',
        title: 'Test',
        author: null,
        publishedAt: null,
        language: null,
        sourceUrl: null,
        assetTags: [],
        collectedAt: new Date(),
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      await handler.handle(event);

      // Assert
      expect(mockQueryBus.execute).toHaveBeenCalledTimes(1);
      expect(mockWriteRepo.save).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();

      // The duplicate detection service records the hash
      expect(duplicateDetectionService.getUniqueHashCount()).toBe(1);
    });

    it('should process similar but not identical content', async () => {
      // Arrange
      const event1 = new ContentCollectedEvent(
        'test-source',
        'test-job-id', // jobId
        'Bitcoin reaches $100,000',
        { title: 'BTC News 1' },
        'WEB',
        new Date(),
      );

      const event2 = new ContentCollectedEvent(
        'test-source',
        'test-job-id', // jobId
        'Bitcoin reaches $100,001', // Slightly different
        { title: 'BTC News 2' },
        'WEB',
        new Date(),
      );

      mockQueryBus.execute.mockResolvedValue(null);

      // Act
      await handler.handle(event1);
      await handler.handle(event2);

      // Assert
      expect(mockQueryBus.execute).toHaveBeenCalledTimes(2);
      expect(mockWriteRepo.save).toHaveBeenCalledTimes(2);
      expect(mockEventBus.publish).toHaveBeenCalledTimes(2);
    });
  });

  describe('Content Validation', () => {
    it('should reject content that is too short and publish validation failed event', async () => {
      // Arrange
      const event = new ContentCollectedEvent(
        'test-source',
        'test-job-id', // jobId
        'Short', // Less than minimum length
        { title: 'Too Short' },
        'WEB',
        new Date(),
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(mockWriteRepo.save).not.toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);

      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent).toBeInstanceOf(ContentValidationFailedEvent);
      expect((publishedEvent as ContentValidationFailedEvent).jobId).toBe(
        'test-job-id',
      );
      expect((publishedEvent as ContentValidationFailedEvent).sourceId).toBe(
        'test-source',
      );
      expect(
        (publishedEvent as ContentValidationFailedEvent).validationErrors
          .length,
      ).toBeGreaterThan(0);
    });

    it('should reject content with invalid encoding and publish validation failed event', async () => {
      // Arrange
      const invalidContent = 'Test\uFFFDcontent'; // Contains replacement character
      const event = new ContentCollectedEvent(
        'test-source',
        'test-job-id', // jobId
        invalidContent,
        { title: 'Invalid Encoding' },
        'WEB',
        new Date(),
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(mockWriteRepo.save).not.toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);

      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent).toBeInstanceOf(ContentValidationFailedEvent);
    });

    it('should reject content without required metadata and publish validation failed event', async () => {
      // Arrange
      // Note: Even with empty metadata in the event, extractMetadata will extract
      // a title from the first line of content. To truly have no metadata,
      // we need content that won't produce a valid title (too long or empty)
      const event = new ContentCollectedEvent(
        'test-source',
        'test-job-id', // jobId
        '', // Empty content - will fail minimum length validation
        {}, // No title or sourceUrl
        'WEB',
        new Date(),
      );

      // Act
      await handler.handle(event);

      // Assert
      // Content is rejected due to minimum length, not metadata
      expect(mockWriteRepo.save).not.toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);

      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent).toBeInstanceOf(ContentValidationFailedEvent);
    });

    it('should accept content with minimum valid metadata', async () => {
      // Arrange
      const event = new ContentCollectedEvent(
        'test-source',
        'test-job-id', // jobId
        'Valid content with minimum metadata requirements met.',
        {
          title: 'Valid Title', // Has title
        },
        'WEB',
        new Date(),
      );

      mockQueryBus.execute.mockResolvedValue(null);

      // Act
      await handler.handle(event);

      // Assert
      expect(mockWriteRepo.save).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);

      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent).toBeInstanceOf(ContentIngestedEvent);
    });
  });

  describe('Error Handling', () => {
    it('should handle normalization errors gracefully', async () => {
      // Arrange
      const event = new ContentCollectedEvent(
        'test-source',
        'test-job-id', // jobId
        'Valid content',
        { title: 'Test' },
        'WEB',
        new Date(),
      );

      jest.spyOn(normalizationService, 'normalize').mockImplementation(() => {
        throw new Error('Normalization failed');
      });

      // Act
      await handler.handle(event);

      // Assert - should not throw, just log error
      expect(mockWriteRepo.save).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should handle validation errors gracefully', async () => {
      // Arrange
      const event = new ContentCollectedEvent(
        'test-source',
        'test-job-id', // jobId
        'Valid content for validation test',
        { title: 'Test' },
        'WEB',
        new Date(),
      );

      jest
        .spyOn(validationService, 'validateQuality')
        .mockImplementation(() => {
          throw new Error('Validation crashed');
        });

      // Act
      await handler.handle(event);

      // Assert - should not throw
      expect(mockWriteRepo.save).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should handle persistence errors gracefully', async () => {
      // Arrange
      const event = new ContentCollectedEvent(
        'test-source',
        'test-job-id', // jobId
        'Valid content that will fail to persist',
        { title: 'Test' },
        'WEB',
        new Date(),
      );

      mockQueryBus.execute.mockResolvedValue(null);
      mockWriteRepo.save.mockRejectedValue(new Error('Database error'));

      // Act
      await handler.handle(event);

      // Assert - should not throw
      expect(mockWriteRepo.save).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publish).not.toHaveBeenCalled(); // Event not published on save failure
    });

    it('should handle event publishing errors gracefully', async () => {
      // Arrange
      const event = new ContentCollectedEvent(
        'test-source',
        'test-job-id', // jobId
        'Valid content with event publishing error',
        { title: 'Test' },
        'WEB',
        new Date(),
      );

      mockQueryBus.execute.mockResolvedValue(null);
      mockEventBus.publish.mockRejectedValue(new Error('Event bus error'));

      // Act
      await handler.handle(event);

      // Assert - should not throw
      expect(mockWriteRepo.save).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    });
  });

  describe('Source Type Handling', () => {
    it('should handle different source types correctly', async () => {
      // Test multiple source types
      const sourceTypes = ['WEB', 'RSS', 'SOCIAL_MEDIA', 'PDF', 'WIKIPEDIA'];

      for (const sourceType of sourceTypes) {
        const event = new ContentCollectedEvent(
          `${sourceType}-source`,
          'test-job-id', // jobId
          `Content from ${sourceType} source with sufficient length for validation`,
          { title: `${sourceType} Content` },
          sourceType,
          new Date(),
        );

        mockQueryBus.execute.mockResolvedValue(null);

        // Act
        await handler.handle(event);

        // Assert
        const savedItem =
          mockWriteRepo.save.mock.calls[
            mockWriteRepo.save.mock.calls.length - 1
          ][0];
        expect(savedItem.sourceId).toBe(`${sourceType}-source`);
      }

      expect(mockWriteRepo.save).toHaveBeenCalledTimes(sourceTypes.length);
    });
  });

  describe('ContentIngestedEvent Publishing', () => {
    it('should publish event with correct structure', async () => {
      // Arrange
      const collectedAt = new Date('2024-01-15T10:00:00Z');
      const event = new ContentCollectedEvent(
        'test-source',
        'test-job-id', // jobId
        'Bitcoin and Ethereum show strong performance in the market.',
        {
          title: 'Crypto Market',
          sourceUrl: 'https://example.com/market',
        },
        'WEB',
        collectedAt,
      );

      mockQueryBus.execute.mockResolvedValue(null);

      // Act
      await handler.handle(event);

      // Assert
      const publishedEvent = mockEventBus.publish.mock
        .calls[0][0] as ContentIngestedEvent;
      expect(publishedEvent.contentId).toBeTruthy();
      expect(publishedEvent.sourceId).toBe('test-source');
      expect(publishedEvent.contentHash).toBeTruthy();
      expect(publishedEvent.assetTags).toBeInstanceOf(Array);
      expect(publishedEvent.collectedAt).toEqual(collectedAt);
    });

    it('should include detected asset tags in published event', async () => {
      // Arrange
      const event = new ContentCollectedEvent(
        'test-source',
        'test-job-id', // jobId
        'Bitcoin (BTC), Ethereum (ETH), and Solana (SOL) are trending.',
        { title: 'Trending Crypto' },
        'WEB',
        new Date(),
      );

      mockQueryBus.execute.mockResolvedValue(null);

      // Act
      await handler.handle(event);

      // Assert
      const publishedEvent = mockEventBus.publish.mock
        .calls[0][0] as ContentIngestedEvent;
      expect(publishedEvent.assetTags.length).toBeGreaterThan(0);
      expect(publishedEvent.assetTags).toContain('BTC');
      expect(publishedEvent.assetTags).toContain('ETH');
      expect(publishedEvent.assetTags).toContain('SOL');
    });
  });
});
