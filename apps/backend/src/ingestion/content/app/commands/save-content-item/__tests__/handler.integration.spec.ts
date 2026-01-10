import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { SaveContentItemHandler } from '../handler';
import { SaveContentItemCommand } from '../command';
import { ContentIngested } from '@/ingestion/content/domain/events';
import { IContentItemWriteRepository } from '@/ingestion/content/domain/interfaces/repositories/content-item-write';
import { ContentItem } from '@/ingestion/content/domain/aggregates/content-item';

/**
 * Integration Test: SaveContentItemHandler
 *
 * Tests the command handler that creates and persists ContentItem aggregate
 * and publishes ContentIngested event.
 *
 * Pipeline Step 4 Handler: SaveContentItemCommand → ContentIngested
 *
 * Requirements: 3.1, 3.2, 3.3
 */
describe('SaveContentItemHandler - Integration Tests', () => {
  let handler: SaveContentItemHandler;
  let mockWriteRepository: jest.Mocked<IContentItemWriteRepository>;
  let mockEventBus: jest.Mocked<EventBus>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockWriteRepository = {
      save: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<IContentItemWriteRepository>;

    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EventBus>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaveContentItemHandler,
        {
          provide: 'IContentItemWriteRepository',
          useValue: mockWriteRepository,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    handler = module.get<SaveContentItemHandler>(SaveContentItemHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Content Save', () => {
    it('should save content item and publish ContentIngested event', async () => {
      // Arrange
      const collectedAt = new Date('2024-01-15T08:00:00Z');
      const contentHash = 'a'.repeat(64);
      const command = new SaveContentItemCommand(
        'job-123',
        'source-456',
        'Raw content about Bitcoin',
        'Normalized content about Bitcoin',
        {
          title: 'Bitcoin News',
          author: 'John Doe',
          publishedAt: new Date('2024-01-15'),
          language: 'en',
          sourceUrl: 'https://example.com/btc',
        },
        ['BTC', 'ETH'],
        contentHash,
        collectedAt,
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.contentId).toBeDefined();
      expect(result.contentId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      ); // UUID format
      expect(result.persistedAt).toBeInstanceOf(Date);

      expect(mockWriteRepository.save).toHaveBeenCalledTimes(1);
      expect(mockWriteRepository.save).toHaveBeenCalledWith(
        expect.any(ContentItem),
      );

      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const event = mockEventBus.publish.mock.calls[0][0] as ContentIngested;
      expect(event).toBeInstanceOf(ContentIngested);
      expect(event.contentId).toBe(result.contentId);
      expect(event.sourceId).toBe('source-456');
      expect(event.jobId).toBe('job-123');
    });

    it('should create ContentItem with all value objects', async () => {
      // Arrange
      const contentHash = 'b'.repeat(64);
      const publishedAt = new Date('2024-01-14T10:00:00Z');
      const collectedAt = new Date('2024-01-15T08:00:00Z');

      const command = new SaveContentItemCommand(
        'job-vo',
        'source-vo',
        'Raw content',
        'Normalized content with value objects',
        {
          title: 'Value Objects Test',
          author: 'Jane Smith',
          publishedAt,
          language: 'es',
          sourceUrl: 'https://example.com/vo',
        },
        ['BTC', 'ETH', 'SOL'],
        contentHash,
        collectedAt,
      );

      // Act
      await handler.execute(command);

      // Assert
      const savedContentItem = mockWriteRepository.save.mock.calls[0][0];
      expect(savedContentItem).toBeDefined();
    });

    it('should pass all data through to ContentIngested event', async () => {
      // Arrange
      const contentHash = 'c'.repeat(64);
      const publishedAt = new Date('2024-01-14T10:00:00Z');
      const collectedAt = new Date('2024-01-15T08:00:00Z');

      const command = new SaveContentItemCommand(
        'job-event',
        'source-event',
        'Raw content for event',
        'Normalized content for event',
        {
          title: 'Event Data Test',
          author: 'Test Author',
          publishedAt,
          language: 'en',
          sourceUrl: 'https://example.com/event',
        },
        ['BTC', 'ETH'],
        contentHash,
        collectedAt,
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      const event = mockEventBus.publish.mock.calls[0][0] as ContentIngested;
      expect(event.contentId).toBe(result.contentId);
      expect(event.sourceId).toBe('source-event');
      expect(event.jobId).toBe('job-event');
      expect(event.contentHash).toBe(contentHash);
      expect(event.normalizedContent).toBe('Normalized content for event');
      expect(event.metadata.title).toBe('Event Data Test');
      expect(event.metadata.author).toBe('Test Author');
      expect(event.assetTags).toEqual(['BTC', 'ETH']);
      expect(event.collectedAt).toBe(collectedAt);
      expect(event.persistedAt).toBeInstanceOf(Date);
    });
  });

  describe('Asset Tags Handling', () => {
    it('should handle single asset tag', async () => {
      // Arrange
      const command = new SaveContentItemCommand(
        'job-single-tag',
        'source-single-tag',
        'Raw',
        'Normalized',
        { title: 'Single Tag' },
        ['BTC'],
        'a'.repeat(64),
        new Date(),
      );

      // Act
      await handler.execute(command);

      // Assert
      const event = mockEventBus.publish.mock.calls[0][0] as ContentIngested;
      expect(event.assetTags).toEqual(['BTC']);
    });

    it('should handle multiple asset tags', async () => {
      // Arrange
      const assetTags = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT'];
      const command = new SaveContentItemCommand(
        'job-multi-tags',
        'source-multi-tags',
        'Raw',
        'Normalized',
        { title: 'Multi Tags' },
        assetTags,
        'b'.repeat(64),
        new Date(),
      );

      // Act
      await handler.execute(command);

      // Assert
      const event = mockEventBus.publish.mock.calls[0][0] as ContentIngested;
      expect(event.assetTags).toEqual(assetTags);
      expect(event.assetTags).toHaveLength(5);
    });

    it('should handle empty asset tags', async () => {
      // Arrange
      const command = new SaveContentItemCommand(
        'job-no-tags',
        'source-no-tags',
        'Raw',
        'Normalized',
        { title: 'No Tags' },
        [],
        'c'.repeat(64),
        new Date(),
      );

      // Act
      await handler.execute(command);

      // Assert
      const event = mockEventBus.publish.mock.calls[0][0] as ContentIngested;
      expect(event.assetTags).toEqual([]);
    });
  });

  describe('Metadata Handling', () => {
    it('should handle full metadata', async () => {
      // Arrange
      const publishedAt = new Date('2024-01-14T10:00:00Z');
      const command = new SaveContentItemCommand(
        'job-full-meta',
        'source-full-meta',
        'Raw',
        'Normalized',
        {
          title: 'Full Metadata',
          author: 'Author Name',
          publishedAt,
          language: 'en',
          sourceUrl: 'https://example.com/full',
        },
        ['BTC'],
        'd'.repeat(64),
        new Date(),
      );

      // Act
      await handler.execute(command);

      // Assert
      const event = mockEventBus.publish.mock.calls[0][0] as ContentIngested;
      expect(event.metadata.title).toBe('Full Metadata');
      expect(event.metadata.author).toBe('Author Name');
      expect(event.metadata.publishedAt).toEqual(publishedAt);
      expect(event.metadata.language).toBe('en');
      expect(event.metadata.sourceUrl).toBe('https://example.com/full');
    });

    it('should handle partial metadata', async () => {
      // Arrange
      const command = new SaveContentItemCommand(
        'job-partial-meta',
        'source-partial-meta',
        'Raw',
        'Normalized',
        {
          title: 'Partial Metadata',
          // Missing author, publishedAt, language, sourceUrl
        },
        ['ETH'],
        'e'.repeat(64),
        new Date(),
      );

      // Act
      await handler.execute(command);

      // Assert
      const event = mockEventBus.publish.mock.calls[0][0] as ContentIngested;
      expect(event.metadata.title).toBe('Partial Metadata');
      expect(event.metadata.author).toBeUndefined();
    });

    it('should reject empty metadata (domain invariant requires title or sourceUrl)', async () => {
      // Arrange
      const command = new SaveContentItemCommand(
        'job-empty-meta',
        'source-empty-meta',
        'Raw content here',
        'Normalized content here',
        {},
        [],
        'f'.repeat(64),
        new Date(),
      );

      // Act & Assert
      // ContentItem.create() validates that metadata must have at least title or sourceUrl
      await expect(handler.execute(command)).rejects.toThrow(
        'Invalid ContentItem: Metadata must have at least title or sourceUrl',
      );
      expect(mockWriteRepository.save).not.toHaveBeenCalled();
    });

    it('should accept metadata with only sourceUrl', async () => {
      // Arrange
      const command = new SaveContentItemCommand(
        'job-url-only',
        'source-url-only',
        'Raw content here',
        'Normalized content here',
        { sourceUrl: 'https://example.com/article' },
        [],
        'f'.repeat(64),
        new Date(),
      );

      // Act
      await handler.execute(command);

      // Assert
      expect(mockWriteRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('Result Object', () => {
    it('should return SaveContentItemResult with contentId and persistedAt', async () => {
      // Arrange
      const command = new SaveContentItemCommand(
        'job-result',
        'source-result',
        'Raw',
        'Normalized',
        { title: 'Result Test' },
        ['BTC'],
        '1'.repeat(64),
        new Date(),
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.contentId).toBeDefined();
      expect(result.contentId.length).toBeGreaterThan(0);
      expect(result.persistedAt).toBeInstanceOf(Date);
    });

    it('should generate unique contentId for each save', async () => {
      // Arrange
      const command1 = new SaveContentItemCommand(
        'job-1',
        'source-1',
        'Raw 1',
        'Normalized 1',
        { title: 'Item 1' },
        ['BTC'],
        '2'.repeat(64),
        new Date(),
      );

      const command2 = new SaveContentItemCommand(
        'job-2',
        'source-2',
        'Raw 2',
        'Normalized 2',
        { title: 'Item 2' },
        ['ETH'],
        '3'.repeat(64),
        new Date(),
      );

      // Act
      const result1 = await handler.execute(command1);
      const result2 = await handler.execute(command2);

      // Assert
      expect(result1.contentId).not.toBe(result2.contentId);
    });
  });

  describe('Timestamp Handling', () => {
    it('should preserve collectedAt in event', async () => {
      // Arrange
      const originalCollectedAt = new Date('2024-01-15T08:00:00Z');
      const command = new SaveContentItemCommand(
        'job-ts',
        'source-ts',
        'Raw',
        'Normalized',
        { title: 'Timestamp' },
        [],
        '4'.repeat(64),
        originalCollectedAt,
      );

      // Act
      await handler.execute(command);

      // Assert
      const event = mockEventBus.publish.mock.calls[0][0] as ContentIngested;
      expect(event.collectedAt).toEqual(originalCollectedAt);
    });

    it('should set persistedAt to current time', async () => {
      // Arrange
      const beforeExecution = new Date();
      const command = new SaveContentItemCommand(
        'job-persisted',
        'source-persisted',
        'Raw',
        'Normalized',
        { title: 'Persisted' },
        [],
        '5'.repeat(64),
        new Date(),
      );

      // Act
      const result = await handler.execute(command);
      const afterExecution = new Date();

      // Assert
      expect(result.persistedAt.getTime()).toBeGreaterThanOrEqual(
        beforeExecution.getTime(),
      );
      expect(result.persistedAt.getTime()).toBeLessThanOrEqual(
        afterExecution.getTime(),
      );
    });
  });

  describe('Content Hash Handling', () => {
    it('should pass content hash to event', async () => {
      // Arrange
      const contentHash = 'abcdef'.repeat(10) + 'abcd'; // 64 chars
      const command = new SaveContentItemCommand(
        'job-hash',
        'source-hash',
        'Raw',
        'Normalized',
        { title: 'Hash Test' },
        ['BTC'],
        contentHash,
        new Date(),
      );

      // Act
      await handler.execute(command);

      // Assert
      const event = mockEventBus.publish.mock.calls[0][0] as ContentIngested;
      expect(event.contentHash).toBe(contentHash);
    });
  });

  describe('Repository Interaction', () => {
    it('should call repository save before publishing event', async () => {
      // Arrange
      const callOrder: string[] = [];
      mockWriteRepository.save.mockImplementation(async () => {
        callOrder.push('save');
      });
      mockEventBus.publish.mockImplementation(async () => {
        callOrder.push('publish');
      });

      const command = new SaveContentItemCommand(
        'job-order',
        'source-order',
        'Raw',
        'Normalized',
        { title: 'Order Test' },
        [],
        '6'.repeat(64),
        new Date(),
      );

      // Act
      await handler.execute(command);

      // Assert
      expect(callOrder).toEqual(['save', 'publish']);
    });

    it('should propagate repository errors', async () => {
      // Arrange
      mockWriteRepository.save.mockRejectedValue(new Error('Database error'));

      const command = new SaveContentItemCommand(
        'job-error',
        'source-error',
        'Raw',
        'Normalized',
        { title: 'Error Test' },
        [],
        '7'.repeat(64),
        new Date(),
      );

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Database error');
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });
});
