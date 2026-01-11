import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { SaveContentItemCommand } from './command';
import { SaveContentItemResult } from './result';
import { IContentItemWriteRepository } from '@/ingestion/content/domain/interfaces/repositories/content-item-write';
import { ContentItem } from '@/ingestion/content/domain/aggregates/content-item';
import { ContentMetadata } from '@/ingestion/content/domain/value-objects/content-metadata';
import { ContentHash } from '@/ingestion/content/domain/value-objects/content-hash';
import { AssetTag } from '@/ingestion/content/domain/value-objects/asset-tag';
import { ContentIngested } from '@/ingestion/content/domain/events';

/**
 * SaveContentItemHandler
 *
 * Handles SaveContentItemCommand by:
 * 1. Creating ContentItem aggregate
 * 2. Persisting to database
 * 3. Publishing ContentIngested event
 *
 * Requirements: 3.1, 3.2, 3.3
 */
@Injectable()
@CommandHandler(SaveContentItemCommand)
export class SaveContentItemHandler implements ICommandHandler<
  SaveContentItemCommand,
  SaveContentItemResult
> {
  private readonly logger = new Logger(SaveContentItemHandler.name);

  constructor(
    @Inject('IContentItemWriteRepository')
    private readonly contentItemWriteRepo: IContentItemWriteRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(
    command: SaveContentItemCommand,
  ): Promise<SaveContentItemResult> {
    this.logger.debug(`Saving content item for source: ${command.sourceId}`);

    // 1. Create value objects
    const contentId = uuidv4();
    const contentHash = ContentHash.create(command.contentHash);
    const metadata = ContentMetadata.create({
      title: command.metadata.title,
      author: command.metadata.author,
      publishedAt: command.metadata.publishedAt,
      language: command.metadata.language,
      sourceUrl: command.metadata.sourceUrl,
    });
    const assetTags = command.assetTags.map((symbol) =>
      AssetTag.create({ symbol, confidence: 1.0 }),
    );

    // 2. Create ContentItem aggregate
    const contentItem = ContentItem.create({
      contentId,
      sourceId: command.sourceId,
      contentHash,
      rawContent: command.rawContent,
      normalizedContent: command.normalizedContent,
      metadata,
      assetTags,
      collectedAt: command.collectedAt,
    });

    // 3. Persist content item
    await this.contentItemWriteRepo.save(contentItem);

    const persistedAt = new Date();

    // 4. Publish ContentIngested event
    const event = new ContentIngested(
      contentId,
      command.sourceId,
      command.jobId,
      command.contentHash,
      command.normalizedContent,
      command.metadata,
      command.assetTags,
      command.collectedAt,
      persistedAt,
    );

    await this.eventBus.publish(event);

    this.logger.debug(`Content item saved: ${contentId}`);

    return new SaveContentItemResult(contentId, persistedAt);
  }
}
