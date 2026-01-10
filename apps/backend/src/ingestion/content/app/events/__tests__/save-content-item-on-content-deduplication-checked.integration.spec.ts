import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { SaveContentItemOnContentDeduplicationChecked } from '../save-content-item-on-content-deduplication-checked';
import { ContentDeduplicationChecked } from '@/ingestion/content/domain/events';
import { SaveContentItemCommand } from '../../commands/save-content-item/command';

/**
 * Integration Test: SaveContentItemOnContentDeduplicationChecked
 *
 * Tests the event handler that triggers content item save
 * when ContentDeduplicationChecked event is received (only if NOT duplicate).
 *
 * Pipeline Step 4: ContentDeduplicationChecked (isDuplicate: false) → SaveContentItemCommand
 *
 * Requirements: 3.1, 3.2, 3.3
 */
describe('SaveContentItemOnContentDeduplicationChecked - Integration Tests', () => {
  let handler: SaveContentItemOnContentDeduplicationChecked;
  let mockCommandBus: jest.Mocked<CommandBus>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockCommandBus = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CommandBus>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaveContentItemOnContentDeduplicationChecked,
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
      ],
    }).compile();

    handler = module.get<SaveContentItemOnContentDeduplicationChecked>(
      SaveContentItemOnContentDeduplicationChecked,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Non-Duplicate Content (Should Save)', () => {
    it('should trigger SaveContentItemCommand when content is NOT a duplicate', async () => {
      // Arrange
      const collectedAt = new Date('2024-01-15T08:00:00Z');
      const checkedAt = new Date('2024-01-15T08:00:03Z');
      const event = new ContentDeduplicationChecked(
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
        'abc123def456...', // contentHash
        false, // isDuplicate = false
        null, // existingContentId
        collectedAt,
        checkedAt,
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        expect.any(SaveContentItemCommand),
      );

      const command = mockCommandBus.execute.mock
        .calls[0][0] as SaveContentItemCommand;
      expect(command.jobId).toBe('job-123');
      expect(command.sourceId).toBe('source-456');
      expect(command.rawContent).toBe('Raw content about Bitcoin');
      expect(command.normalizedContent).toBe(
        'Normalized content about Bitcoin',
      );
      expect(command.contentHash).toBe('abc123def456...');
      expect(command.assetTags).toEqual(['BTC', 'ETH']);
      expect(command.collectedAt).toBe(collectedAt);
    });

    it('should pass all metadata fields to the command', async () => {
      // Arrange
      const publishedAt = new Date('2024-01-15T10:00:00Z');
      const event = new ContentDeduplicationChecked(
        'job-meta',
        'source-meta',
        'Raw content',
        'Normalized content',
        {
          title: 'Full Metadata',
          author: 'Jane Smith',
          publishedAt,
          language: 'es',
          sourceUrl: 'https://example.com/article',
        },
        ['SOL'],
        'hash123',
        false,
        null,
        new Date(),
        new Date(),
      );

      // Act
      await handler.handle(event);

      // Assert
      const command = mockCommandBus.execute.mock
        .calls[0][0] as SaveContentItemCommand;
      expect(command.metadata).toEqual({
        title: 'Full Metadata',
        author: 'Jane Smith',
        publishedAt,
        language: 'es',
        sourceUrl: 'https://example.com/article',
      });
    });
  });

  describe('Duplicate Content (Should Skip)', () => {
    it('should NOT trigger SaveContentItemCommand when content IS a duplicate', async () => {
      // Arrange
      const event = new ContentDeduplicationChecked(
        'job-dup',
        'source-dup',
        'Duplicate raw content',
        'Duplicate normalized content',
        { title: 'Duplicate Article' },
        ['BTC'],
        'existing-hash-123',
        true, // isDuplicate = true
        'existing-content-id-456', // existingContentId
        new Date(),
        new Date(),
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).not.toHaveBeenCalled();
    });

    it('should log debug message when skipping duplicate', async () => {
      // Arrange
      const event = new ContentDeduplicationChecked(
        'job-dup-log',
        'source-dup-log',
        'Duplicate content',
        'Normalized duplicate',
        { title: 'Duplicate' },
        [],
        'duplicate-hash-xyz',
        true,
        'existing-id',
        new Date(),
        new Date(),
      );

      const loggerSpy = jest.spyOn(handler['logger'], 'debug');

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Skipping save for duplicate content'),
      );
      expect(mockCommandBus.execute).not.toHaveBeenCalled();
    });

    it('should handle duplicate with existing content ID', async () => {
      // Arrange
      const existingContentId = 'content-already-exists-123';
      const event = new ContentDeduplicationChecked(
        'job-existing',
        'source-existing',
        'Content that already exists',
        'Normalized existing content',
        { title: 'Existing Article' },
        ['ETH'],
        'hash-of-existing',
        true,
        existingContentId,
        new Date(),
        new Date(),
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).not.toHaveBeenCalled();
    });
  });

  describe('Error Isolation', () => {
    it('should not throw when command execution fails', async () => {
      // Arrange
      const event = new ContentDeduplicationChecked(
        'job-error',
        'source-error',
        'Raw content',
        'Normalized content',
        { title: 'Error Test' },
        [],
        'error-hash',
        false,
        null,
        new Date(),
        new Date(),
      );

      mockCommandBus.execute.mockRejectedValue(
        new Error('Save command failed'),
      );

      // Act & Assert - should not throw
      await expect(handler.handle(event)).resolves.not.toThrow();
    });

    it('should log error when command execution fails', async () => {
      // Arrange
      const event = new ContentDeduplicationChecked(
        'job-log-error',
        'source-log-error',
        'Raw content',
        'Normalized content',
        { title: 'Log Error Test' },
        [],
        'log-error-hash',
        false,
        null,
        new Date(),
        new Date(),
      );

      const loggerSpy = jest.spyOn(handler['logger'], 'error');
      mockCommandBus.execute.mockRejectedValue(new Error('Database error'));

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error triggering save'),
        expect.any(String),
      );
    });
  });

  describe('Data Preservation', () => {
    it('should preserve content hash through the pipeline', async () => {
      // Arrange
      const contentHash = 'a'.repeat(64); // Valid 64-char hash
      const event = new ContentDeduplicationChecked(
        'job-hash',
        'source-hash',
        'Raw content',
        'Normalized content',
        { title: 'Hash Test' },
        ['BTC'],
        contentHash,
        false,
        null,
        new Date(),
        new Date(),
      );

      // Act
      await handler.handle(event);

      // Assert
      const command = mockCommandBus.execute.mock
        .calls[0][0] as SaveContentItemCommand;
      expect(command.contentHash).toBe(contentHash);
    });

    it('should preserve all timestamps through the pipeline', async () => {
      // Arrange
      const originalCollectedAt = new Date('2024-01-15T08:00:00Z');
      const event = new ContentDeduplicationChecked(
        'job-timestamp',
        'source-timestamp',
        'Raw content',
        'Normalized content',
        { title: 'Timestamp Test' },
        ['BTC'],
        'timestamp-hash',
        false,
        null,
        originalCollectedAt,
        new Date(),
      );

      // Act
      await handler.handle(event);

      // Assert
      const command = mockCommandBus.execute.mock
        .calls[0][0] as SaveContentItemCommand;
      expect(command.collectedAt).toEqual(originalCollectedAt);
    });

    it('should preserve asset tags through the pipeline', async () => {
      // Arrange
      const assetTags = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT'];
      const event = new ContentDeduplicationChecked(
        'job-tags',
        'source-tags',
        'Raw content',
        'Normalized content',
        { title: 'Tags Test' },
        assetTags,
        'tags-hash',
        false,
        null,
        new Date(),
        new Date(),
      );

      // Act
      await handler.handle(event);

      // Assert
      const command = mockCommandBus.execute.mock
        .calls[0][0] as SaveContentItemCommand;
      expect(command.assetTags).toEqual(assetTags);
    });
  });
});
