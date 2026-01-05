import { Injectable } from '@nestjs/common';
import {
  ContentItem,
  ContentItemFactory,
  ContentHash,
  ContentMetadata,
  AssetTag,
} from '@/ingestion/domain';
import { TypeOrmContentItemReadRepository } from '../repositories/content-item-read';

/**
 * TypeORM ContentItemFactory Implementation
 *
 * Factory for reconstituting ContentItem aggregates from persistence.
 * Uses TypeORM read repository to load data and reconstructs aggregates with full behavior.
 *
 * Requirements: 10.1
 */
@Injectable()
export class TypeOrmContentItemFactory implements ContentItemFactory {
  constructor(private readonly readRepo: TypeOrmContentItemReadRepository) {}

  async load(contentId: string): Promise<ContentItem | null> {
    // Load data from read repository
    const data = await this.readRepo.findById(contentId);
    if (!data) return null;

    // Reconstitute value objects
    const contentHash = ContentHash.create(data.contentHash);
    const metadata = ContentMetadata.create({
      title: data.title,
      author: data.author,
      publishedAt: data.publishedAt,
      language: data.language,
      sourceUrl: data.sourceUrl,
    });
    const assetTags = data.assetTags.map((tag) =>
      AssetTag.create({ symbol: tag.symbol, confidence: tag.confidence }),
    );

    // Reconstitute aggregate with version from database
    return ContentItem.reconstitute({
      contentId: data.contentId,
      sourceId: data.sourceId,
      contentHash,
      rawContent: data.rawContent,
      normalizedContent: data.normalizedContent,
      metadata,
      assetTags,
      collectedAt: data.collectedAt,
      version: data.version,
    });
  }
}
