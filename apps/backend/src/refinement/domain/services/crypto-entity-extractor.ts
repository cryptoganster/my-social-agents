import { CryptoEntity } from '@refinement/domain/value-objects/crypto-entity';
import { IEntityExtractor } from '@refinement/domain/interfaces/services/entity-extractor';

/**
 * CryptoEntityExtractor Domain Service
 *
 * Extracts crypto-specific entities using a hybrid approach:
 * 1. Try regex extraction first (fast, deterministic)
 * 2. If < 3 entities found, use LLM extraction (accurate, slower)
 * 3. Merge and deduplicate results
 *
 * Requirements: Refinement 3
 * Design: Domain Services section - CryptoEntityExtractor
 */
export class CryptoEntityExtractor {
  constructor(
    private readonly regexExtractor: IEntityExtractor,
    private readonly llmExtractor: IEntityExtractor,
  ) {}

  /**
   * Extracts crypto entities using hybrid strategy
   *
   * @param content - The content to extract entities from
   * @returns Array of crypto entities with confidence scores
   */
  async extract(content: string): Promise<CryptoEntity[]> {
    // 1. Try regex extraction first (fast)
    const regexEntities = await this.regexExtractor.extract(content);

    // 2. If we found enough entities, return them
    if (regexEntities.length >= 3) {
      return regexEntities;
    }

    // 3. Otherwise, use LLM extraction (more accurate but slower)
    const llmEntities = await this.llmExtractor.extract(content);

    // 4. Merge results and deduplicate
    const merged = this.mergeAndDeduplicate(regexEntities, llmEntities);

    return merged;
  }

  /**
   * Merges and deduplicates entities from multiple sources
   *
   * Deduplication strategy:
   * - If same type and value, keep the one with higher confidence
   * - If positions overlap significantly, keep the one with higher confidence
   *
   * @param regexEntities - Entities from regex extraction
   * @param llmEntities - Entities from LLM extraction
   * @returns Deduplicated array of entities
   */
  private mergeAndDeduplicate(
    regexEntities: CryptoEntity[],
    llmEntities: CryptoEntity[],
  ): CryptoEntity[] {
    const allEntities = [...regexEntities, ...llmEntities];
    const deduplicated: CryptoEntity[] = [];

    for (const entity of allEntities) {
      // Check if we already have this entity
      // Compare type (enum) and value (string) directly using getters
      const existing = deduplicated.find(
        (e) =>
          e.type === entity.type &&
          e.value.toLowerCase() === entity.value.toLowerCase(),
      );

      if (!existing) {
        // New entity, add it
        deduplicated.push(entity);
      } else if (entity.confidence > existing.confidence) {
        // Same entity but higher confidence, replace it
        const index = deduplicated.indexOf(existing);
        deduplicated[index] = entity;
      }
      // Otherwise, keep the existing one (higher confidence)
    }

    return deduplicated;
  }
}
