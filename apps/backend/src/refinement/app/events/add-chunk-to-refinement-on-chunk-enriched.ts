import { Injectable, Inject, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler, EventBus } from '@nestjs/cqrs';
import { ChunkEnriched } from '@refinement/domain/events/chunk-enriched';
import { AllChunksProcessed } from '@refinement/domain/events/all-chunks-processed';
import { IContentRefinementFactory } from '@refinement/app/interfaces/factories/content-refinement-factory';
import { IContentRefinementWriteRepository } from '@refinement/domain/interfaces/repositories/content-refinement-write';
import { Chunk } from '@refinement/domain/entities/chunk';
import { ChunkHash } from '@refinement/domain/value-objects/chunk-hash';
import { ChunkPosition } from '@refinement/domain/value-objects/chunk-position';
import { CryptoEntity } from '@refinement/domain/value-objects/crypto-entity';
import { isCryptoEntityType } from '@refinement/domain/value-objects/crypto-entity-type';
import { TemporalContext } from '@refinement/domain/value-objects/temporal-context';
import { QualityScore } from '@refinement/domain/value-objects/quality-score';

/**
 * AddChunkToRefinementOnChunkEnriched
 *
 * Event handler that adds enriched chunks to the refinement aggregate.
 * Tracks chunk processing progress and publishes AllChunksProcessed when complete.
 *
 * Pipeline position: ChunkEnriched → (add to aggregate) → AllChunksProcessed (when all done)
 *
 * Requirements: Refinement 2, 8, 9
 * Design: Application Layer - Event Handlers (Event-Driven Pipeline)
 */
@Injectable()
@EventsHandler(ChunkEnriched)
export class AddChunkToRefinementOnChunkEnriched implements IEventHandler<ChunkEnriched> {
  private readonly logger = new Logger(
    AddChunkToRefinementOnChunkEnriched.name,
  );

  // Track processed chunks per refinement (in-memory for simplicity)
  // In production, this should be persisted or use a distributed counter
  private readonly processedChunks = new Map<string, Set<string>>();

  constructor(
    @Inject('IContentRefinementFactory')
    private readonly refinementFactory: IContentRefinementFactory,
    @Inject('IContentRefinementWriteRepository')
    private readonly writeRepository: IContentRefinementWriteRepository,
    private readonly eventBus: EventBus,
  ) {}

  async handle(event: ChunkEnriched): Promise<void> {
    try {
      this.logger.debug(
        `Processing ChunkEnriched: refinementId=${event.refinementId}, chunkId=${event.chunkId}, index=${event.chunkIndex}/${event.totalChunks}`,
      );

      // Only add chunks that passed quality threshold
      if (event.passedQualityThreshold) {
        // 1. Load refinement aggregate
        const refinement = await this.refinementFactory.load(
          event.refinementId,
        );
        if (!refinement) {
          this.logger.warn(`Refinement not found: ${event.refinementId}`);
        } else {
          // 2. Reconstitute chunk from event data
          const chunk = this.reconstituteChunk(event);

          // 3. Add chunk to aggregate
          try {
            refinement.addChunk(chunk);
            await this.writeRepository.save(refinement);
            this.logger.debug(`Chunk added to refinement: ${event.chunkId}`);
          } catch (error) {
            // Skip duplicate chunks
            this.logger.debug(
              `Skipping chunk (possibly duplicate): ${event.chunkId} - ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      } else {
        this.logger.debug(
          `Chunk rejected due to low quality: ${event.chunkId} (score: ${event.qualityScore.overall})`,
        );
      }

      // 4. Track progress and check if all chunks processed
      this.trackProgress(event.refinementId, event.chunkId);
      const processedCount = this.getProcessedCount(event.refinementId);

      if (processedCount >= event.totalChunks) {
        this.logger.debug(
          `All chunks processed for refinement: ${event.refinementId}`,
        );

        // Reload to get updated chunk count
        const updatedRefinement = await this.refinementFactory.load(
          event.refinementId,
        );
        const validChunks = updatedRefinement?.chunkCount ?? 0;
        const rejectedChunks = event.totalChunks - validChunks;

        // Publish AllChunksProcessed event
        await this.eventBus.publish(
          new AllChunksProcessed(
            event.refinementId,
            event.contentItemId,
            event.totalChunks,
            validChunks,
            rejectedChunks,
          ),
        );

        // Cleanup tracking
        this.cleanupTracking(event.refinementId);
      }
    } catch (error) {
      // Error isolation: log but don't rethrow
      this.logger.error(
        `Error processing ChunkEnriched: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private reconstituteChunk(event: ChunkEnriched): Chunk {
    const hash = ChunkHash.create(event.chunkContent);
    const position = ChunkPosition.create(
      event.chunkIndex,
      0, // Start offset not available in event, using placeholder
      event.chunkContent.length,
    );

    const entities = event.entities.map((e) => {
      if (!isCryptoEntityType(e.type)) {
        throw new Error(`Invalid entity type: ${e.type}`);
      }
      return CryptoEntity.create(
        e.type,
        e.value,
        e.confidence,
        e.startPos,
        e.endPos,
      );
    });

    const temporalContext = event.temporalContext
      ? TemporalContext.create(
          event.temporalContext.publishedAt,
          event.temporalContext.eventTimestamp,
        )
      : null;

    const qualityScore = QualityScore.create(
      event.qualityScore.overall,
      event.qualityScore.lengthScore,
      event.qualityScore.coherenceScore,
      event.qualityScore.relevanceScore,
      event.qualityScore.freshnessScore,
    );

    const chunk = Chunk.reconstitute({
      id: event.chunkId,
      contentId: event.contentItemId,
      content: event.chunkContent,
      position,
      hash,
      entities,
      temporalContext,
      qualityScore,
      previousChunkId: null,
      nextChunkId: null,
    });

    return chunk;
  }

  private trackProgress(refinementId: string, chunkId: string): void {
    if (!this.processedChunks.has(refinementId)) {
      this.processedChunks.set(refinementId, new Set());
    }
    this.processedChunks.get(refinementId)?.add(chunkId);
  }

  private getProcessedCount(refinementId: string): number {
    return this.processedChunks.get(refinementId)?.size ?? 0;
  }

  private cleanupTracking(refinementId: string): void {
    this.processedChunks.delete(refinementId);
  }
}
