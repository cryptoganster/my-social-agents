import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { NormalizeRawContentHandler } from '../handler';
import { NormalizeRawContentCommand } from '../command';
import { ContentNormalized } from '@/ingestion/content/domain/events';
import { IContentNormalizationService } from '@/ingestion/content/domain/interfaces/services/content-normalization';
import {
  ContentMetadata,
  AssetTag,
} from '@/ingestion/content/domain/value-objects';

/**
 * Integration Test: NormalizeRawContentHandler
 *
 * Tests the command handler that normalizes raw content,
 * extracts metadata, detects asset tags, and publishes ContentNormalized event.
 *
 * Pipeline Step 1 Handler: NormalizeRawContentCommand → ContentNormalized
 *
 * Requirements: 2.1, 2.2
 */
describe('NormalizeRawContentHandler - Integration Tests', () => {
  let handler: NormalizeRawContentHandler;
  let mockNormalizationService: jest.Mocked<IContentNormalizationService>;
  let mockEventBus: jest.Mocked<EventBus>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockNormalizationService = {
      normalize: jest.fn(),
      extractMetadata: jest.fn(),
      detectAssets: jest.fn(),
    } as jest.Mocked<IContentNormalizationService>;

    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EventBus>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NormalizeRawContentHandler,
        {
          provide: 'IContentNormalizationService',
          useValue: mockNormalizationService,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    handler = module.get<NormalizeRawContentHandler>(
      NormalizeRawContentHandler,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Content Normalization', () => {
    it('should normalize content and publish ContentNormalized event', async () => {
      // Arrange
      const collectedAt = new Date('2024-01-15T08:00:00Z');
      const command = new NormalizeRawContentCommand(
        'job-123',
        'source-456',
        '<html><body>Bitcoin price reaches $50,000</body></html>',
        'WEB',
        {
          title: 'Bitcoin News',
          author: 'John Doe',
          publishedAt: new Date('2024-01-15'),
          language: 'en',
          sourceUrl: 'https://example.com/btc',
        },
        collectedAt,
      );

      mockNormalizationService.normalize.mockReturnValue(
        'Bitcoin price reaches $50,000',
      );
      mockNormalizationService.extractMetadata.mockReturnValue(
        ContentMetadata.create({
          title: 'Bitcoin News',
          author: 'John Doe',
        }),
      );
      mockNormalizationService.detectAssets.mockReturnValue([
        AssetTag.create({ symbol: 'BTC', confidence: 0.95 }),
      ]);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.normalizedContent).toBe('Bitcoin price reaches $50,000');
      expect(result.assetTags).toEqual(['BTC']);
      expect(result.normalizedAt).toBeInstanceOf(Date);

      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const event = mockEventBus.publish.mock.calls[0][0] as ContentNormalized;
      expect(event).toBeInstanceOf(ContentNormalized);
      expect(event.jobId).toBe('job-123');
      expect(event.sourceId).toBe('source-456');
      expect(event.normalizedContent).toBe('Bitcoin price reaches $50,000');
    });

    it('should merge command metadata with extracted metadata', async () => {
      // Arrange
      const command = new NormalizeRawContentCommand(
        'job-merge',
        'source-merge',
        'Raw content about Ethereum',
        'RSS',
        {
          title: 'Command Title', // From command
          // author missing in command
          publishedAt: new Date('2024-01-15'),
        },
        new Date(),
      );

      mockNormalizationService.normalize.mockReturnValue(
        'Normalized Ethereum content',
      );
      mockNormalizationService.extractMetadata.mockReturnValue(
        ContentMetadata.create({
          title: 'Extracted Title', // Should be overridden by command
          author: 'Extracted Author', // Should be used (missing in command)
          language: 'en',
        }),
      );
      mockNormalizationService.detectAssets.mockReturnValue([
        AssetTag.create({ symbol: 'ETH', confidence: 0.9 }),
      ]);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.metadata.title).toBe('Command Title'); // Command takes precedence
      expect(result.metadata.author).toBe('Extracted Author'); // Extracted used as fallback
      expect(result.metadata.language).toBe('en'); // Extracted
    });

    it('should detect multiple asset tags', async () => {
      // Arrange
      const command = new NormalizeRawContentCommand(
        'job-multi',
        'source-multi',
        'Bitcoin and Ethereum are leading cryptocurrencies. Solana is also popular.',
        'WEB',
        { title: 'Multi Crypto' },
        new Date(),
      );

      mockNormalizationService.normalize.mockReturnValue(
        'Bitcoin and Ethereum are leading cryptocurrencies. Solana is also popular.',
      );
      mockNormalizationService.extractMetadata.mockReturnValue(
        ContentMetadata.empty(),
      );
      mockNormalizationService.detectAssets.mockReturnValue([
        AssetTag.create({ symbol: 'BTC', confidence: 0.95 }),
        AssetTag.create({ symbol: 'ETH', confidence: 0.92 }),
        AssetTag.create({ symbol: 'SOL', confidence: 0.88 }),
      ]);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.assetTags).toEqual(['BTC', 'ETH', 'SOL']);
    });

    it('should handle content with no asset tags', async () => {
      // Arrange
      const command = new NormalizeRawContentCommand(
        'job-no-tags',
        'source-no-tags',
        'General news article without crypto mentions',
        'WEB',
        { title: 'General News' },
        new Date(),
      );

      mockNormalizationService.normalize.mockReturnValue(
        'General news article without crypto mentions',
      );
      mockNormalizationService.extractMetadata.mockReturnValue(
        ContentMetadata.empty(),
      );
      mockNormalizationService.detectAssets.mockReturnValue([]);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.assetTags).toEqual([]);
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
      it(`should normalize ${sourceType} content correctly`, async () => {
        // Arrange
        const command = new NormalizeRawContentCommand(
          `job-${sourceType.toLowerCase()}`,
          `source-${sourceType.toLowerCase()}`,
          `Raw content from ${sourceType}`,
          sourceType,
          { title: `${sourceType} Content` },
          new Date(),
        );

        mockNormalizationService.normalize.mockReturnValue(
          `Normalized content from ${sourceType}`,
        );
        mockNormalizationService.extractMetadata.mockReturnValue(
          ContentMetadata.empty(),
        );
        mockNormalizationService.detectAssets.mockReturnValue([]);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.normalizedContent).toBe(
          `Normalized content from ${sourceType}`,
        );
        expect(mockNormalizationService.normalize).toHaveBeenCalledWith(
          `Raw content from ${sourceType}`,
          expect.anything(), // SourceType value object
        );
      });
    });
  });

  describe('Event Publishing', () => {
    it('should publish ContentNormalized with all required fields', async () => {
      // Arrange
      const collectedAt = new Date('2024-01-15T08:00:00Z');
      const publishedAt = new Date('2024-01-14T10:00:00Z');
      const command = new NormalizeRawContentCommand(
        'job-event',
        'source-event',
        'Raw content for event test',
        'WEB',
        {
          title: 'Event Test',
          author: 'Test Author',
          publishedAt,
          language: 'en',
          sourceUrl: 'https://example.com/test',
        },
        collectedAt,
      );

      mockNormalizationService.normalize.mockReturnValue('Normalized content');
      mockNormalizationService.extractMetadata.mockReturnValue(
        ContentMetadata.empty(),
      );
      mockNormalizationService.detectAssets.mockReturnValue([
        AssetTag.create({ symbol: 'BTC', confidence: 0.9 }),
      ]);

      // Act
      await handler.execute(command);

      // Assert
      const event = mockEventBus.publish.mock.calls[0][0] as ContentNormalized;
      expect(event.jobId).toBe('job-event');
      expect(event.sourceId).toBe('source-event');
      expect(event.rawContent).toBe('Raw content for event test');
      expect(event.normalizedContent).toBe('Normalized content');
      expect(event.metadata.title).toBe('Event Test');
      expect(event.metadata.author).toBe('Test Author');
      expect(event.assetTags).toEqual(['BTC']);
      expect(event.collectedAt).toBe(collectedAt);
      expect(event.normalizedAt).toBeInstanceOf(Date);
    });

    it('should preserve collectedAt timestamp in event', async () => {
      // Arrange
      const originalCollectedAt = new Date('2024-01-15T08:00:00Z');
      const command = new NormalizeRawContentCommand(
        'job-timestamp',
        'source-timestamp',
        'Content for timestamp test',
        'WEB',
        { title: 'Timestamp Test' },
        originalCollectedAt,
      );

      mockNormalizationService.normalize.mockReturnValue('Normalized');
      mockNormalizationService.extractMetadata.mockReturnValue(
        ContentMetadata.empty(),
      );
      mockNormalizationService.detectAssets.mockReturnValue([]);

      // Act
      await handler.execute(command);

      // Assert
      const event = mockEventBus.publish.mock.calls[0][0] as ContentNormalized;
      expect(event.collectedAt).toEqual(originalCollectedAt);
    });
  });

  describe('Result Object', () => {
    it('should return NormalizeRawContentResult with all fields', async () => {
      // Arrange
      const command = new NormalizeRawContentCommand(
        'job-result',
        'source-result',
        'Raw content',
        'WEB',
        {
          title: 'Result Test',
          author: 'Author',
          publishedAt: new Date('2024-01-15'),
          language: 'en',
          sourceUrl: 'https://example.com',
        },
        new Date(),
      );

      mockNormalizationService.normalize.mockReturnValue('Normalized content');
      mockNormalizationService.extractMetadata.mockReturnValue(
        ContentMetadata.empty(),
      );
      mockNormalizationService.detectAssets.mockReturnValue([
        AssetTag.create({ symbol: 'BTC', confidence: 0.9 }),
        AssetTag.create({ symbol: 'ETH', confidence: 0.85 }),
      ]);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.normalizedContent).toBe('Normalized content');
      expect(result.metadata.title).toBe('Result Test');
      expect(result.metadata.author).toBe('Author');
      expect(result.assetTags).toEqual(['BTC', 'ETH']);
      expect(result.normalizedAt).toBeInstanceOf(Date);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty raw content', async () => {
      // Arrange
      const command = new NormalizeRawContentCommand(
        'job-empty',
        'source-empty',
        '',
        'WEB',
        { title: 'Empty Content' },
        new Date(),
      );

      mockNormalizationService.normalize.mockReturnValue('');
      mockNormalizationService.extractMetadata.mockReturnValue(
        ContentMetadata.empty(),
      );
      mockNormalizationService.detectAssets.mockReturnValue([]);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.normalizedContent).toBe('');
      expect(result.assetTags).toEqual([]);
    });

    it('should handle very long content', async () => {
      // Arrange
      const longContent = 'Bitcoin '.repeat(10000);
      const command = new NormalizeRawContentCommand(
        'job-long',
        'source-long',
        longContent,
        'WEB',
        { title: 'Long Content' },
        new Date(),
      );

      mockNormalizationService.normalize.mockReturnValue(longContent.trim());
      mockNormalizationService.extractMetadata.mockReturnValue(
        ContentMetadata.empty(),
      );
      mockNormalizationService.detectAssets.mockReturnValue([
        AssetTag.create({ symbol: 'BTC', confidence: 1.0 }),
      ]);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.normalizedContent.length).toBeGreaterThan(0);
      expect(result.assetTags).toContain('BTC');
    });

    it('should handle special characters in content', async () => {
      // Arrange
      const specialContent =
        'Bitcoin 🚀 price: $50,000! <script>alert("xss")</script>';
      const command = new NormalizeRawContentCommand(
        'job-special',
        'source-special',
        specialContent,
        'WEB',
        { title: 'Special Chars' },
        new Date(),
      );

      mockNormalizationService.normalize.mockReturnValue(
        'Bitcoin price: $50,000!',
      );
      mockNormalizationService.extractMetadata.mockReturnValue(
        ContentMetadata.empty(),
      );
      mockNormalizationService.detectAssets.mockReturnValue([
        AssetTag.create({ symbol: 'BTC', confidence: 0.9 }),
      ]);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.normalizedContent).toBe('Bitcoin price: $50,000!');
    });
  });
});
