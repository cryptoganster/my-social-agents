import { Injectable, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { ChunkContentCommand } from './command';
import { ChunkContentResult } from './result';
import { IContentItemFactory } from '@refinement/domain/interfaces/factories/content-item-factory';
import { IContentRefinementWriteRepository } from '@refinement/domain/interfaces/repositories/content-refinement-write';
import { IContentRefinementFactory } from '@refinement/app/interfaces/factories/content-refinement-factory';
import { ChunkingConfig } from '@refinement/domain/interfaces/services/chunking-strategy';
import { SemanticChunker } from '@refinement/domain/services/semantic-chunker';
import {
  ContentChunked,
  ChunkData,
} from '@refinement/domain/events/content-chunked';

/**
 * ChunkContentCommandHandler
 *
 * Handles the ChunkContentCommand to split content into semantic chunks.
 * This is a focused handler with single responsibility: chunking.
 *
 * Process:
 * 1. Load content item from ingestion context
 * 2. Load refinement aggregate
 * 3. Chunk content using semantic chunker
 * 4. Publish ContentChunked event for downstream processing
 *
 * Requirements: Refinement 2
 * Design: Application Layer - Command Handlers (Event-Driven Pipeline)
 */
@Injectable()
@CommandHandler(ChunkContentCommand)
export class ChunkContentCommandHandler implements ICommandHandler<
  ChunkContentCommand,
  ChunkContentResult
> {
  private readonly logger = new Logger(ChunkContentCommandHandler.name);

  constructor(
    @Inject('IContentItemFactory')
    private readonly contentItemFactory: IContentItemFactory,
    @Inject('IContentRefinementFactory')
    private readonly refinementFactory: IContentRefinementFactory,
    @Inject('IContentRefinementWriteRepository')
    private readonly writeRepository: IContentRefinementWriteRepository,
    @Inject('ISemanticChunker')
    private readonly semanticChunker: SemanticChunker,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: ChunkContentCommand): Promise<ChunkContentResult> {
    const { refinementId, contentItemId, chunkSize, chunkOverlap } = command;

    this.logger.log(`Chunking content for refinement: ${refinementId}`);

    try {
      // 1. Load content item from ingestion context
      const contentItem = await this.contentItemFactory.load(contentItemId);
      if (!contentItem) {
        this.logger.warn(`Content item not found: ${contentItemId}`);
        return new ChunkContentResult(
          refinementId,
          contentItemId,
          0,
          [],
          'rejected',
          'Content item not found',
        );
      }

      // 2. Validate minimum content length
      if (contentItem.normalizedContent.length < 100) {
        this.logger.warn(
          `Content too short: ${contentItem.normalizedContent.length} characters`,
        );
        return new ChunkContentResult(
          refinementId,
          contentItemId,
          0,
          [],
          'rejected',
          'Content too short (minimum 100 characters)',
        );
      }

      // 3. Load refinement aggregate
      const refinement = await this.refinementFactory.load(refinementId);
      if (!refinement) {
        this.logger.warn(`Refinement not found: ${refinementId}`);
        return new ChunkContentResult(
          refinementId,
          contentItemId,
          0,
          [],
          'failed',
          undefined,
          { code: 'REFINEMENT_NOT_FOUND', message: 'Refinement not found' },
        );
      }

      // 4. Chunk content
      const chunkingConfig: ChunkingConfig = { chunkSize, chunkOverlap };
      const chunks = await this.semanticChunker.chunk(
        refinementId,
        contentItem.normalizedContent,
        chunkingConfig,
      );

      // 5. Validate chunk count
      if (chunks.length > 100) {
        this.logger.warn(`Too many chunks: ${chunks.length} (maximum 100)`);
        refinement.reject('Too many chunks (maximum 100)');
        await this.writeRepository.save(refinement);
        this.publishAggregateEvents(refinement);

        return new ChunkContentResult(
          refinementId,
          contentItemId,
          chunks.length,
          [],
          'rejected',
          'Too many chunks (maximum 100)',
        );
      }

      if (chunks.length === 0) {
        this.logger.warn('Chunking produced zero chunks');
        refinement.reject('Chunking produced zero chunks');
        await this.writeRepository.save(refinement);
        this.publishAggregateEvents(refinement);

        return new ChunkContentResult(
          refinementId,
          contentItemId,
          0,
          [],
          'rejected',
          'Chunking produced zero chunks',
        );
      }

      // 6. Prepare chunk data for event
      const chunkData: ChunkData[] = chunks.map((chunk, index) => ({
        id: chunk.id,
        content: chunk.content,
        index,
      }));
      const chunkIds = chunks.map((chunk) => chunk.id);

      // 7. Publish ContentChunked event for downstream processing
      await this.eventBus.publish(
        new ContentChunked(
          refinementId,
          contentItemId,
          chunks.length,
          chunkData,
          contentItem.metadata.publishedAt,
        ),
      );

      this.logger.log(
        `Content chunked successfully: ${refinementId} (${chunks.length} chunks)`,
      );

      return new ChunkContentResult(
        refinementId,
        contentItemId,
        chunks.length,
        chunkIds,
        'success',
      );
    } catch (error) {
      this.logger.error(
        `Chunking failed for ${refinementId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      return new ChunkContentResult(
        refinementId,
        contentItemId,
        0,
        [],
        'failed',
        undefined,
        {
          code: 'CHUNKING_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  private publishAggregateEvents(refinement: {
    getUncommittedEvents: () => unknown[];
    commit: () => void;
  }): void {
    const events = refinement.getUncommittedEvents();
    events.forEach((event) => {
      this.eventBus.publish(event as object);
    });
    refinement.commit();
  }
}
