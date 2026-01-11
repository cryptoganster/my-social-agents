import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { ValidateContentQualityOnContentNormalized } from '../validate-content-quality-on-content-normalized';
import { ContentNormalized } from '@/ingestion/content/domain/events';
import { ValidateContentQualityCommand } from '../../commands/validate-content-quality/command';

/**
 * Integration Test: ValidateContentQualityOnContentNormalized
 *
 * Tests the event handler that triggers content quality validation
 * when ContentNormalized event is received.
 *
 * Pipeline Step 2: ContentNormalized → ValidateContentQualityCommand
 *
 * Requirements: 2.3, 3.1
 */
describe('ValidateContentQualityOnContentNormalized - Integration Tests', () => {
  let handler: ValidateContentQualityOnContentNormalized;
  let mockCommandBus: jest.Mocked<CommandBus>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockCommandBus = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CommandBus>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidateContentQualityOnContentNormalized,
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
      ],
    }).compile();

    handler = module.get<ValidateContentQualityOnContentNormalized>(
      ValidateContentQualityOnContentNormalized,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Event Handling', () => {
    it('should trigger ValidateContentQualityCommand when ContentNormalized is received', async () => {
      // Arrange
      const collectedAt = new Date('2024-01-15T08:00:00Z');
      const normalizedAt = new Date('2024-01-15T08:00:01Z');
      const event = new ContentNormalized(
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
        collectedAt,
        normalizedAt,
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        expect.any(ValidateContentQualityCommand),
      );

      const command = mockCommandBus.execute.mock
        .calls[0][0] as ValidateContentQualityCommand;
      expect(command.jobId).toBe('job-123');
      expect(command.sourceId).toBe('source-456');
      expect(command.rawContent).toBe('Raw content about Bitcoin');
      expect(command.normalizedContent).toBe(
        'Normalized content about Bitcoin',
      );
      expect(command.assetTags).toEqual(['BTC', 'ETH']);
      expect(command.collectedAt).toBe(collectedAt);
    });

    it('should pass all metadata fields to the command', async () => {
      // Arrange
      const publishedAt = new Date('2024-01-15T10:00:00Z');
      const event = new ContentNormalized(
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
        new Date(),
        new Date(),
      );

      // Act
      await handler.handle(event);

      // Assert
      const command = mockCommandBus.execute.mock
        .calls[0][0] as ValidateContentQualityCommand;
      expect(command.metadata).toEqual({
        title: 'Full Metadata',
        author: 'Jane Smith',
        publishedAt,
        language: 'es',
        sourceUrl: 'https://example.com/article',
      });
    });

    it('should handle events with empty asset tags', async () => {
      // Arrange
      const event = new ContentNormalized(
        'job-no-tags',
        'source-no-tags',
        'Raw content without crypto mentions',
        'Normalized content without crypto mentions',
        { title: 'General News' },
        [], // No asset tags
        new Date(),
        new Date(),
      );

      // Act
      await handler.handle(event);

      // Assert
      const command = mockCommandBus.execute.mock
        .calls[0][0] as ValidateContentQualityCommand;
      expect(command.assetTags).toEqual([]);
    });

    it('should handle events with multiple asset tags', async () => {
      // Arrange
      const event = new ContentNormalized(
        'job-multi-tags',
        'source-multi-tags',
        'Raw content about many cryptos',
        'Normalized content about BTC, ETH, SOL, ADA, DOT',
        { title: 'Multi Crypto News' },
        ['BTC', 'ETH', 'SOL', 'ADA', 'DOT'],
        new Date(),
        new Date(),
      );

      // Act
      await handler.handle(event);

      // Assert
      const command = mockCommandBus.execute.mock
        .calls[0][0] as ValidateContentQualityCommand;
      expect(command.assetTags).toHaveLength(5);
      expect(command.assetTags).toContain('BTC');
      expect(command.assetTags).toContain('DOT');
    });
  });

  describe('Error Isolation', () => {
    it('should not throw when command execution fails', async () => {
      // Arrange
      const event = new ContentNormalized(
        'job-error',
        'source-error',
        'Raw content',
        'Normalized content',
        { title: 'Error Test' },
        [],
        new Date(),
        new Date(),
      );

      mockCommandBus.execute.mockRejectedValue(
        new Error('Validation command failed'),
      );

      // Act & Assert - should not throw
      await expect(handler.handle(event)).resolves.not.toThrow();
    });

    it('should log error when command execution fails', async () => {
      // Arrange
      const event = new ContentNormalized(
        'job-log-error',
        'source-log-error',
        'Raw content',
        'Normalized content',
        { title: 'Log Error Test' },
        [],
        new Date(),
        new Date(),
      );

      const loggerSpy = jest.spyOn(handler['logger'], 'error');
      mockCommandBus.execute.mockRejectedValue(new Error('Test error'));

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error triggering validation'),
        expect.any(String),
      );
    });
  });

  describe('Data Preservation', () => {
    it('should preserve collectedAt timestamp through the pipeline', async () => {
      // Arrange
      const originalCollectedAt = new Date('2024-01-15T08:00:00Z');
      const event = new ContentNormalized(
        'job-timestamp',
        'source-timestamp',
        'Raw content',
        'Normalized content',
        { title: 'Timestamp Test' },
        ['BTC'],
        originalCollectedAt,
        new Date(),
      );

      // Act
      await handler.handle(event);

      // Assert
      const command = mockCommandBus.execute.mock
        .calls[0][0] as ValidateContentQualityCommand;
      expect(command.collectedAt).toEqual(originalCollectedAt);
    });
  });
});
