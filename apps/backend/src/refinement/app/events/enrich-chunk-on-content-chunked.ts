import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { ContentChunked } from '@refinement/domain/events/content-chunked';
import { EnrichChunkCommand } from '@refinement/app/commands/enrich-chunk/command';

/**
 * EnrichChunkOnContentChunked
 *
 * Event handler that triggers chunk enrichment for each chunk after content is chunked.
 * Dispatches one EnrichChunkCommand per chunk for parallel processing.
 *
 * Pipeline position: ContentChunked → EnrichChunkCommand (for each chunk)
 *
 * Requirements: Refinement 3, 4, 5
 * Design: Application Layer - Event Handlers (Event-Driven Pipeline)
 */
@Injectable()
@EventsHandler(ContentChunked)
export class EnrichChunkOnContentChunked implements IEventHandler<ContentChunked> {
  private readonly logger = new Logger(EnrichChunkOnContentChunked.name);

  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: ContentChunked): Promise<void> {
    try {
      this.logger.debug(
        `Processing ContentChunked: refinementId=${event.refinementId}, chunks=${event.chunkCount}`,
      );

      // Dispatch EnrichChunkCommand for each chunk
      const enrichmentPromises = event.chunks.map((chunk) =>
        this.enrichChunk(
          event.refinementId,
          event.contentItemId,
          chunk.id,
          chunk.content,
          chunk.index,
          event.chunkCount,
          event.publishedAt,
        ),
      );

      // Wait for all enrichment commands to be dispatched
      await Promise.all(enrichmentPromises);

      this.logger.debug(
        `All EnrichChunkCommands dispatched for refinement: ${event.refinementId}`,
      );
    } catch (error) {
      // Error isolation: log but don't rethrow
      this.logger.error(
        `Error processing ContentChunked: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async enrichChunk(
    refinementId: string,
    contentItemId: string,
    chunkId: string,
    chunkContent: string,
    chunkIndex: number,
    totalChunks: number,
    publishedAt: Date,
  ): Promise<void> {
    try {
      await this.commandBus.execute(
        new EnrichChunkCommand(
          refinementId,
          contentItemId,
          chunkId,
          chunkContent,
          chunkIndex,
          totalChunks,
          publishedAt,
        ),
      );
    } catch (error) {
      // Log individual chunk enrichment errors but continue with others
      this.logger.warn(
        `Failed to enrich chunk ${chunkId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
