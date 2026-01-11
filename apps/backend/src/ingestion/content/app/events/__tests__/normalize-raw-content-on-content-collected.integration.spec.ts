import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { NormalizeRawContentOnContentCollected } from '../normalize-raw-content-on-content-collected';
import { ContentCollected } from '@/ingestion/content/domain/events';
import { NormalizeRawContentCommand } from '../../commands/normalize-raw-content/command';

/**
 * Integration Test: NormalizeRawContentOnContentCollected
 *
 * Tests the event handler that triggers content normalization
 * when ContentCollected event is received.
 *
 * Pipeline Step 1: ContentCollected → NormalizeRawContentCommand
 *
 * Requirements: 2.1, 2.2
 */
describe('NormalizeRawContentOnContentCollected - Integration Tests', () => {
  let handler: NormalizeRawContentOnContentCollected;
  let mockCommandBus: jest.Mocked<CommandBus>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockCommandBus = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CommandBus>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NormalizeRawContentOnContentCollected,
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
      ],
    }).compile();

    handler = module.get<NormalizeRawContentOnContentCollected>(
      NormalizeRawContentOnContentCollected,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Event Handling', () => {
    it('should trigger NormalizeRawContentCommand when ContentCollected is received', async () => {
      // Arrange
      const collectedAt = new Date();
      const event = new ContentCollected(
        'source-456',
        'job-123',
        'Raw content about Bitcoin and Ethereum',
        {
          title: 'Crypto News',
          author: 'John Doe',
          publishedAt: new Date('2024-01-15'),
          language: 'en',
          sourceUrl: 'https://example.com/article',
        },
        'WEB',
        collectedAt,
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        expect.any(NormalizeRawContentCommand),
      );

      const command = mockCommandBus.execute.mock
        .calls[0][0] as NormalizeRawContentCommand;
      expect(command.jobId).toBe('job-123');
      expect(command.sourceId).toBe('source-456');
      expect(command.rawContent).toBe('Raw content about Bitcoin and Ethereum');
      expect(command.sourceType).toBe('WEB');
      expect(command.metadata.title).toBe('Crypto News');
      expect(command.collectedAt).toBe(collectedAt);
    });

    it('should pass all metadata fields to the command', async () => {
      // Arrange
      const publishedAt = new Date('2024-01-15T10:00:00Z');
      const collectedAt = new Date();
      const event = new ContentCollected(
        'source-abc',
        'job-789',
        'Content with full metadata',
        {
          title: 'Full Metadata Article',
          author: 'Jane Smith',
          publishedAt,
          language: 'es',
          sourceUrl: 'https://example.com/rss/article',
        },
        'RSS',
        collectedAt,
      );

      // Act
      await handler.handle(event);

      // Assert
      const command = mockCommandBus.execute.mock
        .calls[0][0] as NormalizeRawContentCommand;
      expect(command.metadata).toEqual({
        title: 'Full Metadata Article',
        author: 'Jane Smith',
        publishedAt,
        language: 'es',
        sourceUrl: 'https://example.com/rss/article',
      });
    });

    it('should handle events with partial metadata', async () => {
      // Arrange
      const event = new ContentCollected(
        'source-partial',
        'job-partial',
        'Content with partial metadata',
        {
          title: 'Tweet',
          // Missing author, publishedAt, language, sourceUrl
        },
        'SOCIAL_MEDIA',
        new Date(),
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
      const command = mockCommandBus.execute.mock
        .calls[0][0] as NormalizeRawContentCommand;
      expect(command.metadata.title).toBe('Tweet');
      expect(command.metadata.author).toBeUndefined();
    });
  });

  describe('Error Isolation', () => {
    it('should not throw when command execution fails', async () => {
      // Arrange
      const event = new ContentCollected(
        'source-error',
        'job-error',
        'Content that will fail',
        { title: 'Error Test' },
        'WEB',
        new Date(),
      );

      mockCommandBus.execute.mockRejectedValue(
        new Error('Command execution failed'),
      );

      // Act & Assert - should not throw
      await expect(handler.handle(event)).resolves.not.toThrow();
    });

    it('should log error when command execution fails', async () => {
      // Arrange
      const event = new ContentCollected(
        'source-log-error',
        'job-log-error',
        'Content for error logging',
        { title: 'Log Error Test' },
        'WEB',
        new Date(),
      );

      const loggerSpy = jest.spyOn(handler['logger'], 'error');
      mockCommandBus.execute.mockRejectedValue(new Error('Test error message'));

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error triggering normalization'),
        expect.any(String),
      );
    });
  });

  describe('Different Source Types', () => {
    const sourceTypes = [
      'WEB',
      'RSS',
      'SOCIAL_MEDIA',
      'PDF',
      'OCR',
      'WIKIPEDIA',
    ];

    sourceTypes.forEach((sourceType) => {
      it(`should handle ${sourceType} source type`, async () => {
        // Arrange
        const event = new ContentCollected(
          `source-${sourceType.toLowerCase()}`,
          `job-${sourceType.toLowerCase()}`,
          `Content from ${sourceType}`,
          { title: `${sourceType} Content` },
          sourceType,
          new Date(),
        );

        // Act
        await handler.handle(event);

        // Assert
        const command = mockCommandBus.execute.mock
          .calls[0][0] as NormalizeRawContentCommand;
        expect(command.sourceType).toBe(sourceType);
      });
    });
  });
});
