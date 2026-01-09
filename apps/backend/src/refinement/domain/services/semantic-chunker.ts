import { Chunk } from '@refinement/domain/entities/chunk';
import { ChunkHash } from '@refinement/domain/value-objects/chunk-hash';
import { ChunkPosition } from '@refinement/domain/value-objects/chunk-position';
import {
  IChunkingStrategy,
  ChunkingConfig,
} from '@refinement/domain/interfaces/services/chunking-strategy';

/**
 * SemanticChunker Domain Service
 *
 * Splits content into semantically coherent chunks using a pluggable strategy.
 * Creates Chunk entities with proper linking (previous/next) and metadata.
 *
 * Requirements: Refinement 2
 * Design: Domain Services section - SemanticChunker
 */
export class SemanticChunker {
  constructor(private readonly strategy: IChunkingStrategy) {}

  /**
   * Chunks content and creates Chunk entities
   *
   * @param contentId - ID of the content being chunked
   * @param content - The content to chunk
   * @param config - Chunking configuration
   * @returns Array of Chunk entities with linking
   *
   * @throws Error if chunking produces more than 100 chunks
   * @throws Error if any chunk is too short
   */
  async chunk(
    contentId: string,
    content: string,
    config: ChunkingConfig,
  ): Promise<Chunk[]> {
    // 1. Split content using strategy
    const textChunks = await this.strategy.chunk(content, config);

    // 2. Validate chunk count
    if (textChunks.length > 100) {
      throw new Error(
        `Chunking produced ${textChunks.length} chunks, maximum is 100`,
      );
    }

    if (textChunks.length === 0) {
      throw new Error('Chunking produced zero chunks');
    }

    // 3. Create Chunk entities
    const chunks: Chunk[] = [];
    let currentOffset = 0;

    for (let i = 0; i < textChunks.length; i++) {
      const chunkText = textChunks[i];
      const startOffset = currentOffset;
      const endOffset = startOffset + chunkText.length;

      // Create chunk hash
      const hash = ChunkHash.create(chunkText);

      // Create chunk position
      const position = ChunkPosition.create(i, startOffset, endOffset);

      // Create chunk entity
      const chunk = Chunk.create({
        contentId,
        content: chunkText,
        position,
        hash,
      });

      chunks.push(chunk);
      currentOffset = endOffset;
    }

    // 4. Link chunks (previous/next)
    for (let i = 0; i < chunks.length; i++) {
      if (i > 0) {
        chunks[i].linkToPrevious(chunks[i - 1].id);
      }
      if (i < chunks.length - 1) {
        chunks[i].linkToNext(chunks[i + 1].id);
      }
    }

    return chunks;
  }
}
