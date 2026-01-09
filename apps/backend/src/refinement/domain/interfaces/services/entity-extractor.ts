import { CryptoEntity } from '@refinement/domain/value-objects/crypto-entity';

/**
 * IEntityExtractor Interface
 *
 * Defines the contract for crypto entity extraction from content.
 * Implementations can use regex, LLM, or hybrid approaches.
 *
 * Requirements: Refinement 3
 * Design: Domain Services section - CryptoEntityExtractor
 */
export interface IEntityExtractor {
  /**
   * Extracts crypto-specific entities from content
   *
   * @param content - The content to extract entities from
   * @returns Array of extracted crypto entities with positions and confidence scores
   */
  extract(content: string): Promise<CryptoEntity[]>;
}
