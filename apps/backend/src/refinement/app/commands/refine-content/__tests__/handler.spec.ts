import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { RefineContentCommandHandler } from '../handler';
import { RefineContentCommand } from '../command';
import { RefinementConfig } from '@refinement/domain/value-objects/refinement-config';
import {
  IContentItemFactory,
  ContentItemData,
} from '@refinement/domain/interfaces/factories/content-item-factory';
import { IContentRefinementWriteRepository } from '@refinement/domain/interfaces/repositories/content-refinement-write';
import { IEntityExtractor } from '@refinement/domain/interfaces/services/entity-extractor';
import { ITemporalExtractor } from '@refinement/domain/interfaces/services/temporal-extractor';
import { IQualityAnalyzer } from '@refinement/domain/interfaces/services/quality-analyzer';
import { SemanticChunker } from '@refinement/domain/services/semantic-chunker';
import { Chunk } from '@refinement/domain/entities/chunk';
import { ChunkHash } from '@refinement/domain/value-objects/chunk-hash';
import { ChunkPosition } from '@refinement/domain/value-objects/chunk-position';
import { CryptoEntity } from '@refinement/domain/value-objects/crypto-entity';
import { TemporalContext } from '@refinement/domain/value-objects/temporal-context';
import { QualityScore } from '@refinement/domain/value-objects/quality-score';

describe('RefineContentCommandHandler', () => {
  let handler: RefineContentCommandHandler;
  let mockContentItemFactory: jest.Mocked<IContentItemFactory>;
  let mockWriteRepository: jest.Mocked<IContentRefinementWriteRepository>;
  let mockSemanticChunker: any;
  let mockEntityExtractor: jest.Mocked<IEntityExtractor>;
  let mockTemporalExtractor: jest.Mocked<ITemporalExtractor>;
  let mockQualityAnalyzer: jest.Mocked<IQualityAnalyzer>;
  let mockEventBus: jest.Mocked<EventBus>;

  // Helper to create valid chunk content (min 200 chars)
  const createValidChunkContent = (base: string): string => {
    return base.padEnd(200, ' ');
  };

  beforeEach(async () => {
    // Create mocks
    mockContentItemFactory = {
      load: jest.fn(),
    } as any;

    mockWriteRepository = {
      save: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockSemanticChunker = {
      chunk: jest.fn(),
    } as any;

    mockEntityExtractor = {
      extract: jest.fn(),
    } as any;

    mockTemporalExtractor = {
      extract: jest.fn(),
    } as any;

    mockQualityAnalyzer = {
      analyze: jest.fn(),
    } as any;

    mockEventBus = {
      publish: jest.fn(),
    } as any;

    // Create testing module
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefineContentCommandHandler,
        {
          provide: 'IContentItemFactory',
          useValue: mockContentItemFactory,
        },
        {
          provide: 'IContentRefinementWriteRepository',
          useValue: mockWriteRepository,
        },
        {
          provide: SemanticChunker,
          useValue: mockSemanticChunker,
        },
        {
          provide: 'IEntityExtractor',
          useValue: mockEntityExtractor,
        },
        {
          provide: 'ITemporalExtractor',
          useValue: mockTemporalExtractor,
        },
        {
          provide: 'IQualityAnalyzer',
          useValue: mockQualityAnalyzer,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    handler = module.get<RefineContentCommandHandler>(
      RefineContentCommandHandler,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('successful refinement', () => {
    it('should refine content successfully', async () => {
      // Arrange
      const contentItemId = 'content-123';
      const command = new RefineContentCommand(contentItemId);

      const contentItem: ContentItemData = {
        contentId: contentItemId,
        sourceId: 'source-456',
        normalizedContent:
          'Bitcoin is a cryptocurrency. Ethereum is another blockchain platform. '.repeat(
            10,
          ),
        metadata: {
          title: 'Crypto Article',
          publishedAt: new Date('2024-01-01'),
        },
        collectedAt: new Date('2024-01-01'),
      };

      const mockChunk = Chunk.create({
        contentId: 'refinement-123',
        content: createValidChunkContent('Bitcoin is a cryptocurrency'),
        position: ChunkPosition.create(0, 0, 27),
        hash: ChunkHash.create('a'.repeat(64)), // Valid 64-char hex hash
      });

      const mockEntities = [CryptoEntity.token('Bitcoin', 1.0, 0, 7)];

      const mockTemporalContext = TemporalContext.create(
        new Date('2024-01-01'),
      );

      const mockQualityScore = QualityScore.create(0.8, 0.9, 0.8, 0.7, 0.8);

      mockContentItemFactory.load.mockResolvedValue(contentItem);
      mockSemanticChunker.chunk.mockResolvedValue([mockChunk]);
      mockEntityExtractor.extract.mockResolvedValue(mockEntities);
      mockTemporalExtractor.extract.mockResolvedValue(mockTemporalContext);
      mockQualityAnalyzer.analyze.mockResolvedValue(mockQualityScore);
      mockWriteRepository.save.mockResolvedValue();

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.status).toBe('completed');
      expect(result.contentItemId).toBe(contentItemId);
      expect(result.chunkCount).toBe(1);
      expect(result.durationMs).toBeGreaterThanOrEqual(0); // Can be 0 in fast tests
      expect(result.averageQualityScore).toBeCloseTo(0.8, 1);
      expect(mockContentItemFactory.load).toHaveBeenCalledWith(contentItemId);
      expect(mockSemanticChunker.chunk).toHaveBeenCalled();
      expect(mockEntityExtractor.extract).toHaveBeenCalled();
      expect(mockTemporalExtractor.extract).toHaveBeenCalled();
      expect(mockQualityAnalyzer.analyze).toHaveBeenCalled();
      expect(mockWriteRepository.save).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should process multiple chunks', async () => {
      // Arrange
      const contentItemId = 'content-123';
      const command = new RefineContentCommand(contentItemId);

      const contentItem: ContentItemData = {
        contentId: contentItemId,
        sourceId: 'source-456',
        normalizedContent: 'Content '.repeat(200),
        metadata: {
          publishedAt: new Date('2024-01-01'),
        },
        collectedAt: new Date('2024-01-01'),
      };

      const mockChunks = [
        Chunk.create({
          contentId: 'refinement-123',
          content: createValidChunkContent('Chunk 1'),
          position: ChunkPosition.create(0, 0, 7),
          hash: ChunkHash.create('a'.repeat(64)), // Valid 64-char hex hash
        }),
        Chunk.create({
          contentId: 'refinement-123',
          content: createValidChunkContent('Chunk 2'),
          position: ChunkPosition.create(1, 7, 14),
          hash: ChunkHash.create('b'.repeat(64)), // Valid 64-char hex hash
        }),
        Chunk.create({
          contentId: 'refinement-123',
          content: createValidChunkContent('Chunk 3'),
          position: ChunkPosition.create(2, 14, 21),
          hash: ChunkHash.create('c'.repeat(64)), // Valid 64-char hex hash
        }),
      ];

      mockContentItemFactory.load.mockResolvedValue(contentItem);
      mockSemanticChunker.chunk.mockResolvedValue(mockChunks);
      mockEntityExtractor.extract.mockResolvedValue([]);
      mockTemporalExtractor.extract.mockResolvedValue(
        TemporalContext.create(new Date('2024-01-01')),
      );
      mockQualityAnalyzer.analyze.mockResolvedValue(
        QualityScore.create(0.7, 0.8, 0.7, 0.6, 0.7),
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.status).toBe('completed');
      expect(result.chunkCount).toBe(3);
      expect(mockEntityExtractor.extract).toHaveBeenCalledTimes(3);
      expect(mockTemporalExtractor.extract).toHaveBeenCalledTimes(3);
      expect(mockQualityAnalyzer.analyze).toHaveBeenCalledTimes(3);
    });

    it('should use custom configuration', async () => {
      // Arrange
      const contentItemId = 'content-123';
      const config = RefinementConfig.create({
        chunkSize: 1000,
        chunkOverlap: 200,
        qualityThreshold: 0.5,
      });
      const command = new RefineContentCommand(contentItemId, config);

      const contentItem: ContentItemData = {
        contentId: contentItemId,
        sourceId: 'source-456',
        normalizedContent: 'Content '.repeat(200),
        metadata: {
          publishedAt: new Date('2024-01-01'),
        },
        collectedAt: new Date('2024-01-01'),
      };

      const mockChunk = Chunk.create({
        contentId: 'refinement-123',
        content: createValidChunkContent('Test content'),
        position: ChunkPosition.create(0, 0, 12),
        hash: ChunkHash.create('d'.repeat(64)), // Valid 64-char hex hash
      });

      mockContentItemFactory.load.mockResolvedValue(contentItem);
      mockSemanticChunker.chunk.mockResolvedValue([mockChunk]);
      mockEntityExtractor.extract.mockResolvedValue([]);
      mockTemporalExtractor.extract.mockResolvedValue(
        TemporalContext.create(new Date('2024-01-01')),
      );
      mockQualityAnalyzer.analyze.mockResolvedValue(
        QualityScore.create(0.6, 0.7, 0.6, 0.5, 0.6),
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.status).toBe('completed');
      expect(mockSemanticChunker.chunk).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          chunkSize: 1000,
          chunkOverlap: 200,
        }),
      );
    });
  });

  describe('rejection cases', () => {
    it('should reject when content item not found', async () => {
      // Arrange
      const contentItemId = 'non-existent';
      const command = new RefineContentCommand(contentItemId);

      mockContentItemFactory.load.mockResolvedValue(null);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.status).toBe('rejected');
      expect(result.rejectionReason).toBe('Content item not found');
      expect(mockSemanticChunker.chunk).not.toHaveBeenCalled();
      expect(mockWriteRepository.save).not.toHaveBeenCalled();
    });

    it('should reject when content too short', async () => {
      // Arrange
      const contentItemId = 'content-123';
      const command = new RefineContentCommand(contentItemId);

      const contentItem: ContentItemData = {
        contentId: contentItemId,
        sourceId: 'source-456',
        normalizedContent: 'Too short', // Less than 100 characters
        metadata: {
          publishedAt: new Date('2024-01-01'),
        },
        collectedAt: new Date('2024-01-01'),
      };

      mockContentItemFactory.load.mockResolvedValue(contentItem);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.status).toBe('rejected');
      expect(result.rejectionReason).toContain('too short');
      expect(mockSemanticChunker.chunk).not.toHaveBeenCalled();
    });

    it('should reject when too many chunks', async () => {
      // Arrange
      const contentItemId = 'content-123';
      const command = new RefineContentCommand(contentItemId);

      const contentItem: ContentItemData = {
        contentId: contentItemId,
        sourceId: 'source-456',
        normalizedContent: 'Content '.repeat(200),
        metadata: {
          publishedAt: new Date('2024-01-01'),
        },
        collectedAt: new Date('2024-01-01'),
      };

      // Create 101 chunks (exceeds maximum of 100)
      const mockChunks = Array.from({ length: 101 }, (_, i) =>
        Chunk.create({
          contentId: 'refinement-123',
          content: createValidChunkContent(`Chunk ${i}`),
          position: ChunkPosition.create(i, i * 10, (i + 1) * 10),
          hash: ChunkHash.create(i.toString(16).padStart(64, '0')), // Valid unique hashes
        }),
      );

      mockContentItemFactory.load.mockResolvedValue(contentItem);
      mockSemanticChunker.chunk.mockResolvedValue(mockChunks);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.status).toBe('rejected');
      expect(result.rejectionReason).toContain('Too many chunks');
      expect(mockWriteRepository.save).toHaveBeenCalled();
    });

    it('should reject when no valid chunks after quality filtering', async () => {
      // Arrange
      const contentItemId = 'content-123';
      const command = new RefineContentCommand(contentItemId);

      const contentItem: ContentItemData = {
        contentId: contentItemId,
        sourceId: 'source-456',
        normalizedContent: 'Content '.repeat(200),
        metadata: {
          publishedAt: new Date('2024-01-01'),
        },
        collectedAt: new Date('2024-01-01'),
      };

      const mockChunk = Chunk.create({
        contentId: 'refinement-123',
        content: createValidChunkContent('Low quality content'),
        position: ChunkPosition.create(0, 0, 19),
        hash: ChunkHash.create('a'.repeat(64)), // Valid 64-char hex hash
      });

      mockContentItemFactory.load.mockResolvedValue(contentItem);
      mockSemanticChunker.chunk.mockResolvedValue([mockChunk]);
      mockEntityExtractor.extract.mockResolvedValue([]);
      mockTemporalExtractor.extract.mockResolvedValue(
        TemporalContext.create(new Date('2024-01-01')),
      );
      // Quality score below threshold (0.3)
      mockQualityAnalyzer.analyze.mockResolvedValue(
        QualityScore.create(0.2, 0.3, 0.2, 0.1, 0.2),
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.status).toBe('rejected');
      expect(result.rejectionReason).toContain('No valid chunks');
    });
  });

  describe('failure cases', () => {
    it('should handle chunking errors', async () => {
      // Arrange
      const contentItemId = 'content-123';
      const command = new RefineContentCommand(contentItemId);

      const contentItem: ContentItemData = {
        contentId: contentItemId,
        sourceId: 'source-456',
        normalizedContent: 'Content '.repeat(200),
        metadata: {
          publishedAt: new Date('2024-01-01'),
        },
        collectedAt: new Date('2024-01-01'),
      };

      mockContentItemFactory.load.mockResolvedValue(contentItem);
      mockSemanticChunker.chunk.mockRejectedValue(new Error('Chunking failed'));

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.status).toBe('failed');
      expect(result.error?.code).toBe('REFINEMENT_ERROR');
      expect(result.error?.message).toContain('Chunking failed');
    });

    it('should handle entity extraction errors gracefully', async () => {
      // Arrange
      const contentItemId = 'content-123';
      const command = new RefineContentCommand(contentItemId);

      const contentItem: ContentItemData = {
        contentId: contentItemId,
        sourceId: 'source-456',
        normalizedContent: 'Content '.repeat(200),
        metadata: {
          publishedAt: new Date('2024-01-01'),
        },
        collectedAt: new Date('2024-01-01'),
      };

      const mockChunk = Chunk.create({
        contentId: 'refinement-123',
        content: createValidChunkContent('Test content'),
        position: ChunkPosition.create(0, 0, 12),
        hash: ChunkHash.create('a'.repeat(64)), // Valid 64-char hex hash
      });

      mockContentItemFactory.load.mockResolvedValue(contentItem);
      mockSemanticChunker.chunk.mockResolvedValue([mockChunk]);
      mockEntityExtractor.extract.mockRejectedValue(
        new Error('Extraction failed'),
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      // Should continue processing despite entity extraction failure
      expect(result.status).toBe('rejected'); // No valid chunks due to processing failure
    });

    it('should handle repository save errors', async () => {
      // Arrange
      const contentItemId = 'content-123';
      const command = new RefineContentCommand(contentItemId);

      const contentItem: ContentItemData = {
        contentId: contentItemId,
        sourceId: 'source-456',
        normalizedContent: 'Content '.repeat(200),
        metadata: {
          publishedAt: new Date('2024-01-01'),
        },
        collectedAt: new Date('2024-01-01'),
      };

      const mockChunk = Chunk.create({
        contentId: 'refinement-123',
        content: createValidChunkContent('Test content'),
        position: ChunkPosition.create(0, 0, 12),
        hash: ChunkHash.create('a'.repeat(64)), // Valid 64-char hex hash
      });

      mockContentItemFactory.load.mockResolvedValue(contentItem);
      mockSemanticChunker.chunk.mockResolvedValue([mockChunk]);
      mockEntityExtractor.extract.mockResolvedValue([]);
      mockTemporalExtractor.extract.mockResolvedValue(
        TemporalContext.create(new Date('2024-01-01')),
      );
      mockQualityAnalyzer.analyze.mockResolvedValue(
        QualityScore.create(0.7, 0.8, 0.7, 0.6, 0.7),
      );
      mockWriteRepository.save.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.status).toBe('failed');
      expect(result.error?.message).toContain('Database error');
    });
  });

  describe('quality filtering', () => {
    it('should filter chunks below quality threshold', async () => {
      // Arrange
      const contentItemId = 'content-123';
      const config = RefinementConfig.create({
        qualityThreshold: 0.5,
      });
      const command = new RefineContentCommand(contentItemId, config);

      const contentItem: ContentItemData = {
        contentId: contentItemId,
        sourceId: 'source-456',
        normalizedContent: 'Content '.repeat(200),
        metadata: {
          publishedAt: new Date('2024-01-01'),
        },
        collectedAt: new Date('2024-01-01'),
      };

      const mockChunks = [
        Chunk.create({
          contentId: 'refinement-123',
          content: createValidChunkContent('High quality chunk'),
          position: ChunkPosition.create(0, 0, 18),
          hash: ChunkHash.create('a'.repeat(64)), // Valid 64-char hex hash
        }),
        Chunk.create({
          contentId: 'refinement-123',
          content: createValidChunkContent('Low quality chunk'),
          position: ChunkPosition.create(1, 18, 35),
          hash: ChunkHash.create('b'.repeat(64)), // Valid 64-char hex hash
        }),
      ];

      mockContentItemFactory.load.mockResolvedValue(contentItem);
      mockSemanticChunker.chunk.mockResolvedValue(mockChunks);
      mockEntityExtractor.extract.mockResolvedValue([]);
      mockTemporalExtractor.extract.mockResolvedValue(
        TemporalContext.create(new Date('2024-01-01')),
      );

      // First chunk: high quality (0.7 >= 0.5)
      // Second chunk: low quality (0.3 < 0.5)
      mockQualityAnalyzer.analyze
        .mockResolvedValueOnce(QualityScore.create(0.7, 0.8, 0.7, 0.6, 0.7))
        .mockResolvedValueOnce(QualityScore.create(0.3, 0.4, 0.3, 0.2, 0.3));

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.status).toBe('completed');
      expect(result.chunkCount).toBe(1); // Only high quality chunk
    });
  });

  describe('event publishing', () => {
    it('should publish domain events', async () => {
      // Arrange
      const contentItemId = 'content-123';
      const command = new RefineContentCommand(contentItemId);

      const contentItem: ContentItemData = {
        contentId: contentItemId,
        sourceId: 'source-456',
        normalizedContent: 'Content '.repeat(200),
        metadata: {
          publishedAt: new Date('2024-01-01'),
        },
        collectedAt: new Date('2024-01-01'),
      };

      const mockChunk = Chunk.create({
        contentId: 'refinement-123',
        content: createValidChunkContent('Test content'),
        position: ChunkPosition.create(0, 0, 12),
        hash: ChunkHash.create('a'.repeat(64)), // Valid 64-char hex hash
      });

      mockContentItemFactory.load.mockResolvedValue(contentItem);
      mockSemanticChunker.chunk.mockResolvedValue([mockChunk]);
      mockEntityExtractor.extract.mockResolvedValue([]);
      mockTemporalExtractor.extract.mockResolvedValue(
        TemporalContext.create(new Date('2024-01-01')),
      );
      mockQualityAnalyzer.analyze.mockResolvedValue(
        QualityScore.create(0.7, 0.8, 0.7, 0.6, 0.7),
      );

      // Act
      await handler.execute(command);

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalled();
      // Should publish: ContentRefinementStarted, ChunkAdded, RefinementCompleted
      expect(mockEventBus.publish).toHaveBeenCalledTimes(3);
    });
  });
});
