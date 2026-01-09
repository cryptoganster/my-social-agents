/**
 * IChunkingStrategy Interface
 *
 * Defines the contract for content chunking strategies.
 * Different strategies can be used for different content types (text, markdown, code).
 *
 * Requirements: Refinement 2
 * Design: Domain Services section - SemanticChunker
 */

export interface ChunkingConfig {
  chunkSize: number; // Target chunk size in tokens (500-1000)
  chunkOverlap: number; // Overlap between chunks in tokens (100-200)
}

export interface IChunkingStrategy {
  /**
   * Chunks content into semantically coherent fragments
   *
   * @param content - The content to chunk
   * @param config - Chunking configuration
   * @returns Array of content chunks (strings)
   */
  chunk(content: string, config: ChunkingConfig): Promise<string[]>;
}
