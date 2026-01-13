import { ContentRefinement } from '../content-refinement';
import { Chunk } from '@refinement/domain/entities/chunk';
import { ChunkHash } from '@refinement/domain/value-objects/chunk-hash';
import { ChunkPosition } from '@refinement/domain/value-objects/chunk-position';
import { RefinementError } from '@refinement/domain/value-objects/refinement-error';
import { RefinementStatus } from '@refinement/domain/value-objects/refinement-status';

describe('ContentRefinement', () => {
  const validContent = 'A'.repeat(200); // Minimum 200 characters

  describe('create', () => {
    it('should create a new ContentRefinement in PENDING state', () => {
      const refinement = ContentRefinement.create(
        'refinement-123',
        'content-456',
      );

      expect(refinement.id).toBe('refinement-123');
      expect(refinement.contentItemId).toBe('content-456');
      expect(refinement.status.isPending).toBe(true);
      expect(refinement.chunkCount).toBe(0);
      expect(refinement.version.value).toBe(0);
      expect(refinement.error).toBeNull();
      expect(refinement.startedAt).toBeNull();
      expect(refinement.completedAt).toBeNull();
    });

    it('should throw error if contentItemId is empty', () => {
      expect(() => ContentRefinement.create('refinement-123', '')).toThrow(
        'Content item ID cannot be empty',
      );
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute a ContentRefinement from persistence', () => {
      const chunk = Chunk.create({
        contentId: 'content-456',
        content: validContent,
        position: ChunkPosition.create(0, 0, 200),
        hash: ChunkHash.create('a'.repeat(64)),
      });

      const refinement = ContentRefinement.reconstitute('refinement-123', 5, {
        contentItemId: 'content-456',
        chunks: [chunk],
        status: RefinementStatus.completed(),
        error: null,
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T10:05:00Z'),
        rejectedAt: null,
        rejectionReason: null,
      });

      expect(refinement.id).toBe('refinement-123');
      expect(refinement.version.value).toBe(5);
      expect(refinement.chunkCount).toBe(1);
      expect(refinement.status.isCompleted).toBe(true);
    });
  });

  describe('start', () => {
    it('should transition from PENDING to PROCESSING', () => {
      const refinement = ContentRefinement.create(
        'refinement-123',
        'content-456',
      );

      refinement.start();

      expect(refinement.status.isProcessing).toBe(true);
      expect(refinement.startedAt).toBeInstanceOf(Date);
      expect(refinement.version.value).toBe(1);
    });

    it('should throw error if not in PENDING state', () => {
      const refinement = ContentRefinement.create(
        'refinement-123',
        'content-456',
      );
      refinement.start();

      expect(() => refinement.start()).toThrow(
        'Cannot start refinement in processing state',
      );
    });
  });

  describe('addChunk', () => {
    it('should add a chunk to the refinement', () => {
      const refinement = ContentRefinement.create(
        'refinement-123',
        'content-456',
      );
      refinement.start();

      const chunk = Chunk.create({
        contentId: 'content-456',
        content: validContent,
        position: ChunkPosition.create(0, 0, 200),
        hash: ChunkHash.create('a'.repeat(64)),
      });

      refinement.addChunk(chunk);

      expect(refinement.chunkCount).toBe(1);
      expect(refinement.chunks[0]).toBe(chunk);
      expect(refinement.version.value).toBe(2); // start=1, addChunk=2
    });

    it('should throw error if not in PROCESSING state', () => {
      const refinement = ContentRefinement.create(
        'refinement-123',
        'content-456',
      );

      const chunk = Chunk.create({
        contentId: 'content-456',
        content: validContent,
        position: ChunkPosition.create(0, 0, 200),
        hash: ChunkHash.create('a'.repeat(64)),
      });

      expect(() => refinement.addChunk(chunk)).toThrow(
        'Cannot add chunk when refinement is pending',
      );
    });

    it('should throw error if chunk hash is duplicate', () => {
      const refinement = ContentRefinement.create(
        'refinement-123',
        'content-456',
      );
      refinement.start();

      const hash = ChunkHash.create('a'.repeat(64));
      const chunk1 = Chunk.create({
        contentId: 'content-456',
        content: validContent,
        position: ChunkPosition.create(0, 0, 200),
        hash,
      });
      const chunk2 = Chunk.create({
        contentId: 'content-456',
        content: validContent + ' different',
        position: ChunkPosition.create(1, 200, 400),
        hash, // Same hash
      });

      refinement.addChunk(chunk1);

      expect(() => refinement.addChunk(chunk2)).toThrow(
        `Chunk with hash ${hash.value} already exists in refinement`,
      );
    });

    it('should throw error if adding would exceed 100 chunks', () => {
      const refinement = ContentRefinement.create(
        'refinement-123',
        'content-456',
      );
      refinement.start();

      // Add 100 chunks
      for (let i = 0; i < 100; i++) {
        const chunk = Chunk.create({
          contentId: 'content-456',
          content: validContent + i,
          position: ChunkPosition.create(i, i * 200, (i + 1) * 200),
          hash: ChunkHash.create(i.toString().padStart(64, '0')),
        });
        refinement.addChunk(chunk);
      }

      // Try to add 101st chunk
      const extraChunk = Chunk.create({
        contentId: 'content-456',
        content: validContent + '101',
        position: ChunkPosition.create(100, 20000, 20200),
        hash: ChunkHash.create('f'.repeat(64)),
      });

      expect(() => refinement.addChunk(extraChunk)).toThrow(
        'Cannot add more than 100 chunks to refinement',
      );
    });
  });

  describe('complete', () => {
    it('should transition from PROCESSING to COMPLETED', () => {
      const refinement = ContentRefinement.create(
        'refinement-123',
        'content-456',
      );
      refinement.start();

      const chunk = Chunk.create({
        contentId: 'content-456',
        content: validContent,
        position: ChunkPosition.create(0, 0, 200),
        hash: ChunkHash.create('a'.repeat(64)),
      });
      refinement.addChunk(chunk);

      refinement.complete();

      expect(refinement.status.isCompleted).toBe(true);
      expect(refinement.completedAt).toBeInstanceOf(Date);
      expect(refinement.version.value).toBe(3); // start=1, addChunk=2, complete=3
    });

    it('should throw error if not in PROCESSING state', () => {
      const refinement = ContentRefinement.create(
        'refinement-123',
        'content-456',
      );

      expect(() => refinement.complete()).toThrow(
        'Cannot complete refinement in pending state',
      );
    });

    it('should throw error if no chunks have been added', () => {
      const refinement = ContentRefinement.create(
        'refinement-123',
        'content-456',
      );
      refinement.start();

      expect(() => refinement.complete()).toThrow(
        'Cannot complete refinement with zero chunks',
      );
    });
  });

  describe('fail', () => {
    it('should transition from PROCESSING to FAILED', () => {
      const refinement = ContentRefinement.create(
        'refinement-123',
        'content-456',
      );
      refinement.start();

      const error = RefinementError.create(
        'Chunking failed',
        'CHUNKING_FAILED',
      );

      refinement.fail(error);

      expect(refinement.status.isFailed).toBe(true);
      expect(refinement.error).toBe(error);
      expect(refinement.completedAt).toBeInstanceOf(Date);
      expect(refinement.version.value).toBe(2); // start=1, fail=2
    });

    it('should throw error if not in PROCESSING state', () => {
      const refinement = ContentRefinement.create(
        'refinement-123',
        'content-456',
      );

      const error = RefinementError.create(
        'Chunking failed',
        'CHUNKING_FAILED',
      );

      expect(() => refinement.fail(error)).toThrow(
        'Cannot fail refinement in pending state',
      );
    });
  });

  describe('reject', () => {
    it('should transition from PROCESSING to REJECTED', () => {
      const refinement = ContentRefinement.create(
        'refinement-123',
        'content-456',
      );
      refinement.start();

      refinement.reject('Content quality too low');

      expect(refinement.status.isRejected).toBe(true);
      expect(refinement.rejectionReason).toBe('Content quality too low');
      expect(refinement.rejectedAt).toBeInstanceOf(Date);
      expect(refinement.version.value).toBe(2); // start=1, reject=2
    });

    it('should throw error if not in PROCESSING state', () => {
      const refinement = ContentRefinement.create(
        'refinement-123',
        'content-456',
      );

      expect(() => refinement.reject('Low quality')).toThrow(
        'Cannot reject refinement in pending state',
      );
    });

    it('should throw error if reason is empty', () => {
      const refinement = ContentRefinement.create(
        'refinement-123',
        'content-456',
      );
      refinement.start();

      expect(() => refinement.reject('')).toThrow(
        'Rejection reason cannot be empty',
      );
    });
  });

  describe('hasChunkWithHash', () => {
    it('should return true if chunk with hash exists', () => {
      const refinement = ContentRefinement.create(
        'refinement-123',
        'content-456',
      );
      refinement.start();

      const hash = ChunkHash.create('a'.repeat(64));
      const chunk = Chunk.create({
        contentId: 'content-456',
        content: validContent,
        position: ChunkPosition.create(0, 0, 200),
        hash,
      });

      refinement.addChunk(chunk);

      expect(refinement.hasChunkWithHash(hash)).toBe(true);
    });

    it('should return false if chunk with hash does not exist', () => {
      const refinement = ContentRefinement.create(
        'refinement-123',
        'content-456',
      );
      refinement.start();

      const hash = ChunkHash.create('a'.repeat(64));

      expect(refinement.hasChunkWithHash(hash)).toBe(false);
    });
  });

  describe('getDuration', () => {
    it('should return null if not started', () => {
      const refinement = ContentRefinement.create(
        'refinement-123',
        'content-456',
      );

      expect(refinement.getDuration()).toBeNull();
    });

    it('should return duration in milliseconds if completed', async () => {
      const refinement = ContentRefinement.create(
        'refinement-123',
        'content-456',
      );
      refinement.start();

      const chunk = Chunk.create({
        contentId: 'content-456',
        content: validContent,
        position: ChunkPosition.create(0, 0, 200),
        hash: ChunkHash.create('a'.repeat(64)),
      });
      refinement.addChunk(chunk);

      // Wait a bit to ensure measurable duration
      await new Promise((resolve) => setTimeout(resolve, 50));

      refinement.complete();
      const duration = refinement.getDuration();

      expect(duration).not.toBeNull();
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(duration).toBeLessThan(5000); // Should be less than 5 seconds
    });
  });

  describe('chunks immutability', () => {
    it('should return frozen copy of chunks', () => {
      const refinement = ContentRefinement.create(
        'refinement-123',
        'content-456',
      );
      refinement.start();

      const chunk = Chunk.create({
        contentId: 'content-456',
        content: validContent,
        position: ChunkPosition.create(0, 0, 200),
        hash: ChunkHash.create('a'.repeat(64)),
      });
      refinement.addChunk(chunk);

      const chunks = refinement.chunks;

      expect(Object.isFrozen(chunks)).toBe(true);
      expect(() => {
        (chunks as any).push(chunk);
      }).toThrow();
    });
  });
});
