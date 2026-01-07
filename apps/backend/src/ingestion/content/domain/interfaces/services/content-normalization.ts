import { SourceType } from '@/ingestion/source/domain/value-objects';
import { ContentMetadata, AssetTag } from '../../value-objects';

/**
 * IContentNormalizationService
 *
 * Interface for content normalization service.
 * Transforms raw content into normalized format and extracts metadata.
 *
 * Requirements: 2.1, 2.2, 2.3
 */
export interface IContentNormalizationService {
  /**
   * Normalizes raw content into a consistent format
   */
  normalize(rawContent: string, sourceType: SourceType): string;

  /**
   * Extracts metadata from raw content
   */
  extractMetadata(rawContent: string, sourceType: SourceType): ContentMetadata;

  /**
   * Detects cryptocurrency asset mentions in content
   */
  detectAssets(content: string): AssetTag[];
}
