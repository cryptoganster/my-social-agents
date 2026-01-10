import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { IngestContentCommandHandler } from '../handler';
import { IngestContentCommand } from '../command';
import { ContentCollected } from '@/ingestion/content/domain/events';
import {
  SourceAdapter,
  RawContent,
} from '@/ingestion/source/domain/interfaces/source-adapter';
import { SourceConfiguration } from '@/ingestion/source/domain/aggregates/source-configuration';
import {
  SourceType,
  SourceTypeEnum,
} from '@/ingestion/source/domain/value-objects/source-type';
import { ISourceConfigurationFactory } from '@/ingestion/source/domain/interfaces/factories/source-configuration-factory';
import { AdapterRegistry } from '@/ingestion/source/domain/services/adapter-registry';

/**
 * Integration Test: IngestContentCommandHandler
 *
 * Tests the complete integration of the command handler with its dependencies:
 * - SourceConfigurationFactory
 * - SourceAdapter
 * - EventBus
 *
 * Validates end-to-end flow from command execution to event publishing.
 */
describe('IngestContentCommandHandler - Integration Tests', () => {
  let handler: IngestContentCommandHandler;
  let mockSourceConfigFactory: jest.Mocked<{ load: jest.Mock }>;
  let mockEventBus: jest.Mocked<EventBus>;
  let mockAdapter: jest.Mocked<SourceAdapter>;
  let mockAdapterRegistry: jest.Mocked<AdapterRegistry>;

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.resetAllMocks();
    jest.clearAllMocks();

    mockSourceConfigFactory = {
      load: jest.fn(),
    };

    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EventBus>;

    mockAdapter = {
      collect: jest.fn(),
      supports: jest.fn().mockReturnValue(true),
      validateConfig: jest.fn(),
    } as jest.Mocked<SourceAdapter>;

    mockAdapterRegistry = {
      getAdapter: jest.fn().mockReturnValue(mockAdapter),
      getRegisteredTypes: jest.fn().mockReturnValue(['WEB_SCRAPER']),
    } as unknown as jest.Mocked<AdapterRegistry>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: IngestContentCommandHandler,
          useFactory: (
            factory: ISourceConfigurationFactory,
            adapterRegistry: AdapterRegistry,
            eventBus: EventBus,
          ) => {
            return new IngestContentCommandHandler(
              factory,
              adapterRegistry,
              eventBus,
            );
          },
          inject: ['ISourceConfigurationFactory', 'AdapterRegistry', EventBus],
        },
        {
          provide: 'ISourceConfigurationFactory',
          useValue: mockSourceConfigFactory,
        },
        {
          provide: 'AdapterRegistry',
          useValue: mockAdapterRegistry,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    handler = module.get<IngestContentCommandHandler>(
      IngestContentCommandHandler,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('Successful Content Collection', () => {
    it('should collect content and publish events for all items', async () => {
      // Arrange
      const sourceConfig = SourceConfiguration.create({
        sourceId: 'test-source-1',
        sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
        name: 'Test Web Source',
        config: { url: 'https://example.com' },
        credentials: undefined,
        isActive: true,
      });

      const rawContent: RawContent[] = [
        {
          content: 'Bitcoin price reaches new high',
          metadata: {
            title: 'BTC News',
            sourceUrl: 'https://example.com/btc',
          },
        },
        {
          content: 'Ethereum upgrade scheduled',
          metadata: {
            title: 'ETH Update',
            sourceUrl: 'https://example.com/eth',
          },
        },
        {
          content: 'DeFi protocols gain traction',
          metadata: {
            title: 'DeFi News',
            sourceUrl: 'https://example.com/defi',
          },
        },
      ];

      mockSourceConfigFactory.load.mockResolvedValue(sourceConfig);
      mockAdapter.collect.mockResolvedValue(rawContent);

      // Act
      const result = await handler.execute(
        new IngestContentCommand('test-source-1'),
      );

      // Assert
      expect(result.itemsCollected).toBe(3);
      expect(result.errors).toHaveLength(0);

      // Verify factory was called
      expect(mockSourceConfigFactory.load).toHaveBeenCalledWith(
        'test-source-1',
      );

      // Verify adapter was called
      expect(mockAdapter.collect).toHaveBeenCalledWith(sourceConfig);

      // Verify events were published
      expect(mockEventBus.publish).toHaveBeenCalledTimes(3);

      // Verify event structure
      const firstEvent = mockEventBus.publish.mock
        .calls[0]?.[0] as ContentCollected;
      expect(firstEvent).toBeInstanceOf(ContentCollected);
      expect(firstEvent.sourceId).toBe('test-source-1');
      expect(firstEvent.rawContent).toBe('Bitcoin price reaches new high');
      expect(firstEvent.metadata.title).toBe('BTC News');
      expect(firstEvent.sourceType).toBe('WEB'); // SourceType returns uppercase
    });

    it('should handle empty content collection', async () => {
      // Arrange
      const sourceConfig = SourceConfiguration.create({
        sourceId: 'empty-source',
        sourceType: SourceType.fromEnum(SourceTypeEnum.RSS),
        name: 'Empty RSS Feed',
        config: { url: 'https://example.com/rss' },
        credentials: undefined,
        isActive: true,
      });

      mockSourceConfigFactory.load.mockResolvedValue(sourceConfig);
      mockAdapter.collect.mockResolvedValue([]);

      // Act
      const result = await handler.execute(
        new IngestContentCommand('empty-source'),
      );

      // Assert
      expect(result.itemsCollected).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should handle large batch of content items', async () => {
      // Arrange
      const sourceConfig = SourceConfiguration.create({
        sourceId: 'large-source',
        sourceType: SourceType.fromEnum(SourceTypeEnum.SOCIAL_MEDIA),
        name: 'Twitter Feed',
        config: { username: 'cryptonews' },
        credentials: undefined,
        isActive: true,
      });

      const largeContent: RawContent[] = Array.from(
        { length: 100 },
        (_, i) => ({
          content: `Tweet content ${i}`,
          metadata: {
            title: `Tweet ${i}`,
            sourceUrl: `https://twitter.com/status/${i}`,
          },
        }),
      );

      mockSourceConfigFactory.load.mockResolvedValue(sourceConfig);
      mockAdapter.collect.mockResolvedValue(largeContent);

      // Act
      const result = await handler.execute(
        new IngestContentCommand('large-source'),
      );

      // Assert
      expect(result.itemsCollected).toBe(100);
      expect(result.errors).toHaveLength(0);
      expect(mockEventBus.publish).toHaveBeenCalledTimes(100);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when source configuration not found', async () => {
      // Arrange
      mockSourceConfigFactory.load.mockResolvedValue(null);

      // Act & Assert
      await expect(
        handler.execute(new IngestContentCommand('non-existent')),
      ).rejects.toThrow('Source configuration not found: non-existent');

      expect(mockAdapter.collect).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should throw error when source configuration is inactive', async () => {
      // Arrange
      const inactiveConfig = SourceConfiguration.create({
        sourceId: 'inactive-source',
        sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
        name: 'Inactive Source',
        config: { url: 'https://example.com' },
        credentials: undefined,
        isActive: false,
      });

      mockSourceConfigFactory.load.mockResolvedValue(inactiveConfig);

      // Act & Assert
      await expect(
        handler.execute(new IngestContentCommand('inactive-source')),
      ).rejects.toThrow('Source configuration is inactive: inactive-source');

      expect(mockAdapter.collect).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should throw error when no adapter supports source type', async () => {
      // Arrange
      const sourceConfig = SourceConfiguration.create({
        sourceId: 'unsupported-source',
        sourceType: SourceType.fromEnum(SourceTypeEnum.PDF),
        name: 'PDF Source',
        config: { path: '/docs' },
        credentials: undefined,
        isActive: true,
      });

      mockSourceConfigFactory.load.mockResolvedValue(sourceConfig);
      // Mock getAdapter to throw error (as AdapterRegistry does when no adapter found)
      mockAdapterRegistry.getAdapter.mockImplementation(() => {
        throw new Error('No adapter registered for source type: PDF');
      });

      // Act & Assert
      await expect(
        handler.execute(new IngestContentCommand('unsupported-source')),
      ).rejects.toThrow('No adapter registered for source type: PDF');

      expect(mockAdapter.collect).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should isolate event publishing errors and continue processing', async () => {
      // Arrange
      const sourceConfig = SourceConfiguration.create({
        sourceId: 'error-source',
        sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
        name: 'Error Source',
        config: { url: 'https://example.com' },
        credentials: undefined,
        isActive: true,
      });

      const rawContent: RawContent[] = [
        { content: 'Item 1', metadata: { title: 'Title 1' } },
        { content: 'Item 2', metadata: { title: 'Title 2' } },
        { content: 'Item 3', metadata: { title: 'Title 3' } },
      ];

      mockSourceConfigFactory.load.mockResolvedValue(sourceConfig);
      mockAdapter.collect.mockResolvedValue(rawContent);

      // Simulate error on second event
      let callCount = 0;
      mockEventBus.publish.mockImplementation((): Promise<void> => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Event bus error');
        }
        return Promise.resolve();
      });

      // Act
      const result = await handler.execute(
        new IngestContentCommand('error-source'),
      );

      // Assert
      expect(result.itemsCollected).toBe(3);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Event bus error');

      // All items were attempted
      expect(mockEventBus.publish).toHaveBeenCalledTimes(3);

      // Reset call count for next test
      callCount = 0;
    });

    it('should propagate adapter collection errors', async () => {
      // Arrange
      const sourceConfig = SourceConfiguration.create({
        sourceId: 'failing-source',
        sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
        name: 'Failing Source',
        config: { url: 'https://example.com' },
        credentials: undefined,
        isActive: true,
      });

      mockSourceConfigFactory.load.mockResolvedValue(sourceConfig);
      mockAdapter.collect.mockRejectedValue(new Error('Network timeout'));

      // Act & Assert
      await expect(
        handler.execute(new IngestContentCommand('failing-source')),
      ).rejects.toThrow('Network timeout');

      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('Adapter Selection', () => {
    it('should select correct adapter based on source type', async () => {
      // Arrange
      const webAdapter = {
        collect: jest.fn().mockResolvedValue([]),
        supports: jest.fn((type: SourceType) => {
          const value: string = type.getValue();
          return value === 'WEB';
        }),
        validateConfig: jest.fn(),
      } as jest.Mocked<SourceAdapter>;

      const rssAdapter = {
        collect: jest.fn().mockResolvedValue([]),
        supports: jest.fn((type: SourceType) => {
          const value: string = type.getValue();
          return value === 'RSS';
        }),
        validateConfig: jest.fn(),
      } as jest.Mocked<SourceAdapter>;

      // Mock the adapter registry to return the RSS adapter for RSS source type
      mockAdapterRegistry.getAdapter.mockImplementation(
        (sourceType: SourceType) => {
          const value: string = sourceType.getValue();
          if (value === 'RSS') {
            return rssAdapter;
          }
          return webAdapter;
        },
      );

      const sourceConfig = SourceConfiguration.create({
        sourceId: 'rss-source',
        sourceType: SourceType.fromEnum(SourceTypeEnum.RSS),
        name: 'RSS Feed',
        config: { url: 'https://example.com/rss' },
        credentials: undefined,
        isActive: true,
      });

      mockSourceConfigFactory.load.mockResolvedValue(sourceConfig);

      // Act
      await handler.execute(new IngestContentCommand('rss-source'));

      // Assert
      expect(webAdapter.collect).not.toHaveBeenCalled();
      expect(rssAdapter.collect).toHaveBeenCalledWith(sourceConfig);
    });
  });

  describe('Event Metadata', () => {
    it('should preserve all metadata in published events', async () => {
      // Arrange
      const sourceConfig = SourceConfiguration.create({
        sourceId: 'metadata-source',
        sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
        name: 'Metadata Test',
        config: { url: 'https://example.com' },
        credentials: undefined,
        isActive: true,
      });

      const publishedDate = new Date('2024-01-15T10:00:00Z');
      const rawContent: RawContent[] = [
        {
          content: 'Full metadata content',
          metadata: {
            title: 'Complete Article',
            author: 'John Doe',
            publishedAt: publishedDate,
            language: 'en',
            sourceUrl: 'https://example.com/article',
          },
        },
      ];

      mockSourceConfigFactory.load.mockResolvedValue(sourceConfig);
      mockAdapter.collect.mockResolvedValue(rawContent);

      // Act
      await handler.execute(new IngestContentCommand('metadata-source'));

      // Assert
      const event = mockEventBus.publish.mock.calls[0][0] as ContentCollected;
      expect(event.metadata.title).toBe('Complete Article');
      expect(event.metadata.author).toBe('John Doe');
      expect(event.metadata.publishedAt).toEqual(publishedDate);
      expect(event.metadata.language).toBe('en');
      expect(event.metadata.sourceUrl).toBe('https://example.com/article');
    });

    it('should handle partial metadata gracefully', async () => {
      // Arrange
      const sourceConfig = SourceConfiguration.create({
        sourceId: 'partial-metadata',
        sourceType: SourceType.fromEnum(SourceTypeEnum.SOCIAL_MEDIA),
        name: 'Social Feed',
        config: { username: 'user' },
        credentials: undefined,
        isActive: true,
      });

      const rawContent: RawContent[] = [
        {
          content: 'Tweet without full metadata',
          metadata: {
            title: 'Tweet',
            // Missing author, publishedAt, language, sourceUrl
          },
        },
      ];

      mockSourceConfigFactory.load.mockResolvedValue(sourceConfig);
      mockAdapter.collect.mockResolvedValue(rawContent);

      // Act
      await handler.execute(new IngestContentCommand('partial-metadata'));

      // Assert
      const event = mockEventBus.publish.mock.calls[0][0] as ContentCollected;
      expect(event.metadata.title).toBe('Tweet');
      expect(event.metadata.author).toBeUndefined();
      expect(event.metadata.publishedAt).toBeUndefined();
      expect(event.metadata.language).toBeUndefined();
      expect(event.metadata.sourceUrl).toBeUndefined();
    });
  });
});
