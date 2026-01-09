import { Chunk } from '../chunk';
import { ChunkHash } from '@refinement/domain/value-objects/chunk-hash';
import { ChunkPosition } from '@refinement/domain/value-objects/chunk-position';
import { CryptoEntity } from '@refinement/domain/value-objects/crypto-entity';
import { TemporalContext } from '@refinement/domain/value-objects/temporal-context';
import { QualityScore } from '@refinement/domain/value-objects/quality-score';

describe('Chunk', () => {
  const validContent = 'A'.repeat(200); // Minimum 200 characters
  const validHash = ChunkHash.create(
    'a'.repeat(64), // Valid 64-character hex hash
  );
  const validPosition = ChunkPosition.create(0, 0, 200);

  describe('create', () => {
    it('should create a new Chunk with valid properties', () => {
      const chunk = Chunk.create({
        contentId: 'content-123',
        content: validContent,
        position: validPosition,
        hash: validHash,
      });

      expect(chunk.id).toBeDefined();
      expect(chunk.id).toMatch(/^chunk_/);
      expect(chunk.contentId).toBe('content-123');
      expect(chunk.content).toBe(validContent);
      expect(chunk.position).toBe(validPosition);
      expect(chunk.hash).toBe(validHash);
      expect(chunk.entities).toEqual([]);
      expect(chunk.temporalContext).toBeNull();
      expect(chunk.qualityScore.overall).toBe(0);
      expect(chunk.previousChunkId).toBeNull();
      expect(chunk.nextChunkId).toBeNull();
    });

    it('should throw error if content is too short', () => {
      const shortContent = 'A'.repeat(100); // Less than 200 characters

      expect(() =>
        Chunk.create({
          contentId: 'content-123',
          content: shortContent,
          position: ChunkPosition.create(0, 0, 100),
          hash: ChunkHash.create('b'.repeat(64)),
        }),
      ).toThrow('Chunk content must be at least 200 characters');
    });

    it('should throw error if position is invalid', () => {
      expect(() =>
        Chunk.create({
          contentId: 'content-123',
          content: validContent,
          position: ChunkPosition.create(0, 100, 50), // start > end
          hash: validHash,
        }),
      ).toThrow();
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute a Chunk from persistence', () => {
      const entities = [
        CryptoEntity.token('BTC', 0.95, 0, 3),
        CryptoEntity.exchange('Binance', 0.9, 10, 17),
      ];
      const temporalContext = TemporalContext.create(new Date('2024-01-01'));
      const qualityScore = QualityScore.create(0.8, 0.9, 0.8, 0.85, 0.7);

      const chunk = Chunk.reconstitute({
        id: 'chunk-123',
        contentId: 'content-123',
        content: validContent,
        position: validPosition,
        hash: validHash,
        entities,
        temporalContext,
        qualityScore,
        previousChunkId: 'chunk-122',
        nextChunkId: 'chunk-124',
      });

      expect(chunk.id).toBe('chunk-123');
      expect(chunk.contentId).toBe('content-123');
      expect(chunk.entities).toHaveLength(2);
      expect(chunk.temporalContext).toBe(temporalContext);
      expect(chunk.qualityScore).toBe(qualityScore);
      expect(chunk.previousChunkId).toBe('chunk-122');
      expect(chunk.nextChunkId).toBe('chunk-124');
    });
  });

  describe('enrichWithEntities', () => {
    it('should enrich chunk with crypto entities', () => {
      const chunk = Chunk.create({
        contentId: 'content-123',
        content: validContent,
        position: validPosition,
        hash: validHash,
      });

      const entities = [
        CryptoEntity.token('BTC', 0.95, 0, 3),
        CryptoEntity.exchange('Binance', 0.9, 10, 17),
      ];

      chunk.enrichWithEntities(entities);

      expect(chunk.entities).toHaveLength(2);
      expect(chunk.entities[0].value).toBe('BTC');
      expect(chunk.entities[1].value).toBe('Binance');
    });

    it('should throw error if entities array is empty', () => {
      const chunk = Chunk.create({
        contentId: 'content-123',
        content: validContent,
        position: validPosition,
        hash: validHash,
      });

      expect(() => chunk.enrichWithEntities([])).toThrow(
        'Cannot enrich with empty entities array',
      );
    });

    it('should replace existing entities', () => {
      const chunk = Chunk.create({
        contentId: 'content-123',
        content: validContent,
        position: validPosition,
        hash: validHash,
      });

      const entities1 = [CryptoEntity.token('BTC', 0.95, 0, 3)];
      const entities2 = [
        CryptoEntity.token('ETH', 0.9, 0, 3),
        CryptoEntity.exchange('Coinbase', 0.85, 10, 18),
      ];

      chunk.enrichWithEntities(entities1);
      expect(chunk.entities).toHaveLength(1);

      chunk.enrichWithEntities(entities2);
      expect(chunk.entities).toHaveLength(2);
      expect(chunk.entities[0].value).toBe('ETH');
    });
  });

  describe('setTemporalContext', () => {
    it('should set temporal context', () => {
      const chunk = Chunk.create({
        contentId: 'content-123',
        content: validContent,
        position: validPosition,
        hash: validHash,
      });

      const temporalContext = TemporalContext.create(new Date('2024-01-01'));
      chunk.setTemporalContext(temporalContext);

      expect(chunk.temporalContext).toBe(temporalContext);
    });

    it('should throw error if temporal context is null', () => {
      const chunk = Chunk.create({
        contentId: 'content-123',
        content: validContent,
        position: validPosition,
        hash: validHash,
      });

      expect(() => chunk.setTemporalContext(null as any)).toThrow(
        'Temporal context cannot be null',
      );
    });
  });

  describe('calculateQualityScore', () => {
    it('should update quality score', () => {
      const chunk = Chunk.create({
        contentId: 'content-123',
        content: validContent,
        position: validPosition,
        hash: validHash,
      });

      const qualityScore = QualityScore.create(0.75, 0.8, 0.7, 0.75, 0.8);

      chunk.calculateQualityScore(qualityScore);

      expect(chunk.qualityScore).toBe(qualityScore);
      expect(chunk.qualityScore.overall).toBe(0.75);
    });

    it('should throw error if quality score is null', () => {
      const chunk = Chunk.create({
        contentId: 'content-123',
        content: validContent,
        position: validPosition,
        hash: validHash,
      });

      expect(() => chunk.calculateQualityScore(null as any)).toThrow(
        'Quality score cannot be null',
      );
    });

    it('should throw error if quality score is out of range', () => {
      const chunk = Chunk.create({
        contentId: 'content-123',
        content: validContent,
        position: validPosition,
        hash: validHash,
      });

      expect(() =>
        chunk.calculateQualityScore(QualityScore.create(1.5, 1, 1, 1, 1)),
      ).toThrow(
        'Invalid overall score: must be a number between 0 and 1 (inclusive)',
      );
    });
  });

  describe('linkToPrevious', () => {
    it('should link to previous chunk', () => {
      const chunk = Chunk.create({
        contentId: 'content-123',
        content: validContent,
        position: validPosition,
        hash: validHash,
      });

      chunk.linkToPrevious('chunk-122');

      expect(chunk.previousChunkId).toBe('chunk-122');
      expect(chunk.hasPrevious()).toBe(true);
    });

    it('should throw error if previous chunk ID is empty', () => {
      const chunk = Chunk.create({
        contentId: 'content-123',
        content: validContent,
        position: validPosition,
        hash: validHash,
      });

      expect(() => chunk.linkToPrevious('')).toThrow(
        'Previous chunk ID cannot be empty',
      );
    });
  });

  describe('linkToNext', () => {
    it('should link to next chunk', () => {
      const chunk = Chunk.create({
        contentId: 'content-123',
        content: validContent,
        position: validPosition,
        hash: validHash,
      });

      chunk.linkToNext('chunk-124');

      expect(chunk.nextChunkId).toBe('chunk-124');
      expect(chunk.hasNext()).toBe(true);
    });

    it('should throw error if next chunk ID is empty', () => {
      const chunk = Chunk.create({
        contentId: 'content-123',
        content: validContent,
        position: validPosition,
        hash: validHash,
      });

      expect(() => chunk.linkToNext('')).toThrow(
        'Next chunk ID cannot be empty',
      );
    });
  });

  describe('quality checks', () => {
    it('should identify high quality chunks', () => {
      const chunk = Chunk.create({
        contentId: 'content-123',
        content: validContent,
        position: validPosition,
        hash: validHash,
      });

      const highQuality = QualityScore.create(0.8, 0.8, 0.8, 0.8, 0.8);

      chunk.calculateQualityScore(highQuality);

      expect(chunk.hasHighQuality()).toBe(true);
      expect(chunk.hasMediumQuality()).toBe(false);
      expect(chunk.hasLowQuality()).toBe(false);
      expect(chunk.shouldBeRejected()).toBe(false);
    });

    it('should identify medium quality chunks', () => {
      const chunk = Chunk.create({
        contentId: 'content-123',
        content: validContent,
        position: validPosition,
        hash: validHash,
      });

      const mediumQuality = QualityScore.create(0.6, 0.6, 0.6, 0.6, 0.6);

      chunk.calculateQualityScore(mediumQuality);

      expect(chunk.hasHighQuality()).toBe(false);
      expect(chunk.hasMediumQuality()).toBe(true);
      expect(chunk.hasLowQuality()).toBe(false);
      expect(chunk.shouldBeRejected()).toBe(false);
    });

    it('should identify low quality chunks', () => {
      const chunk = Chunk.create({
        contentId: 'content-123',
        content: validContent,
        position: validPosition,
        hash: validHash,
      });

      const lowQuality = QualityScore.create(0.4, 0.4, 0.4, 0.4, 0.4);

      chunk.calculateQualityScore(lowQuality);

      expect(chunk.hasHighQuality()).toBe(false);
      expect(chunk.hasMediumQuality()).toBe(false);
      expect(chunk.hasLowQuality()).toBe(true);
      expect(chunk.shouldBeRejected()).toBe(false);
    });

    it('should identify chunks that should be rejected', () => {
      const chunk = Chunk.create({
        contentId: 'content-123',
        content: validContent,
        position: validPosition,
        hash: validHash,
      });

      const rejectedQuality = QualityScore.create(0.2, 0.2, 0.2, 0.2, 0.2);

      chunk.calculateQualityScore(rejectedQuality);

      expect(chunk.hasHighQuality()).toBe(false);
      expect(chunk.hasMediumQuality()).toBe(false);
      expect(chunk.hasLowQuality()).toBe(false);
      expect(chunk.shouldBeRejected()).toBe(true);
    });
  });

  describe('hasEntities', () => {
    it('should return false when no entities', () => {
      const chunk = Chunk.create({
        contentId: 'content-123',
        content: validContent,
        position: validPosition,
        hash: validHash,
      });

      expect(chunk.hasEntities()).toBe(false);
    });

    it('should return true when entities exist', () => {
      const chunk = Chunk.create({
        contentId: 'content-123',
        content: validContent,
        position: validPosition,
        hash: validHash,
      });

      chunk.enrichWithEntities([CryptoEntity.token('BTC', 0.95, 0, 3)]);

      expect(chunk.hasEntities()).toBe(true);
    });
  });

  describe('hasTemporalContext', () => {
    it('should return false when no temporal context', () => {
      const chunk = Chunk.create({
        contentId: 'content-123',
        content: validContent,
        position: validPosition,
        hash: validHash,
      });

      expect(chunk.hasTemporalContext()).toBe(false);
    });

    it('should return true when temporal context exists', () => {
      const chunk = Chunk.create({
        contentId: 'content-123',
        content: validContent,
        position: validPosition,
        hash: validHash,
      });

      chunk.setTemporalContext(TemporalContext.create(new Date('2024-01-01')));

      expect(chunk.hasTemporalContext()).toBe(true);
    });
  });

  describe('toObject', () => {
    it('should return plain object representation', () => {
      const entities = [CryptoEntity.token('BTC', 0.95, 0, 3)];
      const temporalContext = TemporalContext.create(new Date('2024-01-01'));
      const qualityScore = QualityScore.create(0.8, 0.9, 0.8, 0.85, 0.7);

      const chunk = Chunk.reconstitute({
        id: 'chunk-123',
        contentId: 'content-123',
        content: validContent,
        position: validPosition,
        hash: validHash,
        entities,
        temporalContext,
        qualityScore,
        previousChunkId: 'chunk-122',
        nextChunkId: 'chunk-124',
      });

      const obj = chunk.toObject();

      expect(obj.id).toBe('chunk-123');
      expect(obj.contentId).toBe('content-123');
      expect(obj.content).toBe(validContent);
      expect(obj.position).toBe(validPosition);
      expect(obj.hash).toBe(validHash);
      expect(obj.entities).toHaveLength(1);
      expect(obj.temporalContext).toBe(temporalContext);
      expect(obj.qualityScore).toBe(qualityScore);
      expect(obj.previousChunkId).toBe('chunk-122');
      expect(obj.nextChunkId).toBe('chunk-124');
    });
  });

  describe('entities immutability', () => {
    it('should return frozen copy of entities', () => {
      const chunk = Chunk.create({
        contentId: 'content-123',
        content: validContent,
        position: validPosition,
        hash: validHash,
      });

      chunk.enrichWithEntities([CryptoEntity.token('BTC', 0.95, 0, 3)]);

      const entities = chunk.entities;

      expect(Object.isFrozen(entities)).toBe(true);
      expect(() => {
        (entities as any).push(CryptoEntity.token('ETH', 0.9, 0, 3));
      }).toThrow();
    });
  });
});
