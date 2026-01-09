import { Injectable, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { RefineContentCommand } from '@refinement/app/commands/refine-content/command';
import { RefineContentResult } from '@refinement/app/commands/refine-content/result';
import { ContentRefinement } from '@refinement/domain/aggregates/content-refinement';
import { Chunk } from '@refinement/domain/entities/chunk';
import { IContentRefinementWriteRepository } from '@refinement/domain/interfaces/repositories/content-refinement-write';
import {
  IContentItemFactory,
  ContentItemData,
} from '@refinement/domain/interfaces/factories/content-item-factory';
import { IEntityExtractor } from '@refinement/domain/interfaces/services/entity-extractor';
import { ITemporalExtractor } from '@refinement/domain/interfaces/services/temporal-extractor';
import { IQualityAnalyzer } from '@refinement/domain/interfaces/services/quality-analyzer';
import { ChunkingConfig } from '@refinement/domain/interfaces/services/chunking-strategy';
import { SemanticChunker } from '@refinement/domain/services/semantic-chunker';

/**
 * RefineContentCommandHandler
 *
 * Handles the RefineContentCommand to refine ingested content into
 * semantically coherent chunks with crypto-specific metadata enrichment.
 *
 * Process:
 * 1. Load content item from ingestion context
 * 2. Create ContentRefinement aggregate
 * 3. Chunk content using semantic chunker
 * 4. For each chunk:
 *    - Extract crypto entities
 *    - Analyze temporal context
 *    - Calculate quality score
 *    - Add to aggregate
 * 5. Mark refinement as completed
 * 6. Save to repository
 * 7. Publish domain events
 *
 * Requirements: Refinement 1, 2, 3, 4, 5, 7, 9, 10
 * Design: Application Layer - Command Handlers
 */
@Injectable()
@CommandHandler(RefineContentCommand)
export class RefineContentCommandHandler implements ICommandHandler<
  RefineContentCommand,
  RefineContentResult
> {
  private readonly logger = new Logger(RefineContentCommandHandler.name);

  constructor(
    @Inject('IContentItemFactory')
    private readonly contentItemFactory: IContentItemFactory,
    @Inject('IContentRefinementWriteRepository')
    private readonly writeRepository: IContentRefinementWriteRepository,
    private readonly semanticChunker: SemanticChunker,
    @Inject('IEntityExtractor')
    private readonly entityExtractor: IEntityExtractor,
    @Inject('ITemporalExtractor')
    private readonly temporalExtractor: ITemporalExtractor,
    @Inject('IQualityAnalyzer')
    private readonly qualityAnalyzer: IQualityAnalyzer,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Executes the refine content command
   *
   * @param command - The command to execute
   * @returns Result with refinement status and metrics
   */
  async execute(command: RefineContentCommand): Promise<RefineContentResult> {
    const { contentItemId, config } = command;

    this.logger.log(`Starting refinement for content item: ${contentItemId}`);

    try {
      // 1. Load content item from ingestion context
      const contentItem = await this.contentItemFactory.load(contentItemId);
      if (!contentItem) {
        this.logger.warn(`Content item not found: ${contentItemId}`);
        return this.createRejectedResult(
          contentItemId,
          contentItemId,
          'Content item not found',
        );
      }

      // 2. Validate minimum content length
      if (contentItem.normalizedContent.length < 100) {
        this.logger.warn(
          `Content too short: ${contentItem.normalizedContent.length} characters`,
        );
        return this.createRejectedResult(
          contentItemId,
          contentItemId,
          'Content too short (minimum 100 characters)',
        );
      }

      // 3. Create ContentRefinement aggregate
      const refinementId = this.generateId();
      const refinement = ContentRefinement.create(refinementId, contentItemId);

      // 4. Start refinement process
      refinement.start();
      const startTime = Date.now();

      // 5. Chunk content
      const chunkingConfig = this.buildChunkingConfig(config);
      const chunks = await this.chunkContent(
        refinement,
        contentItem,
        chunkingConfig,
      );

      // 6. Check if chunking produced too many chunks
      if (chunks.length > 100) {
        this.logger.warn(`Too many chunks: ${chunks.length} (maximum 100)`);
        refinement.reject('Too many chunks (maximum 100)');
        await this.writeRepository.save(refinement);
        this.publishEvents(refinement);

        return this.createRejectedResult(
          refinementId,
          contentItemId,
          'Too many chunks (maximum 100)',
        );
      }

      // 7. Process each chunk
      const processedChunks = await this.processChunks(
        chunks,
        contentItem,
        config,
      );

      // 8. Add chunks to aggregate
      for (const chunk of processedChunks) {
        try {
          refinement.addChunk(chunk);
        } catch {
          // Skip duplicate chunks
          this.logger.debug(`Skipping duplicate chunk: ${chunk.hash.value}`);
        }
      }

      // 9. Check if we have at least one chunk
      if (refinement.chunkCount === 0) {
        this.logger.warn('No valid chunks after processing');
        refinement.reject('No valid chunks after quality filtering');
        await this.writeRepository.save(refinement);
        this.publishEvents(refinement);

        return this.createRejectedResult(
          refinementId,
          contentItemId,
          'No valid chunks after quality filtering',
        );
      }

      // 10. Mark as completed
      refinement.complete();
      const duration = Date.now() - startTime;

      // 11. Save to repository
      await this.writeRepository.save(refinement);

      // 12. Publish domain events
      this.publishEvents(refinement);

      // 13. Calculate average quality score
      const averageQuality = this.calculateAverageQuality(processedChunks);

      this.logger.log(
        `Refinement completed: ${refinementId} (${refinement.chunkCount} chunks, ${duration}ms)`,
      );

      return {
        refinementId,
        contentItemId,
        status: 'completed',
        chunkCount: refinement.chunkCount,
        durationMs: duration,
        averageQualityScore: averageQuality,
      };
    } catch (error) {
      this.logger.error(
        `Refinement failed for ${contentItemId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      return this.createFailedResult(
        contentItemId,
        contentItemId,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Chunks content using semantic chunker
   */
  private async chunkContent(
    refinement: ContentRefinement,
    contentItem: ContentItemData,
    config: ChunkingConfig,
  ): Promise<Chunk[]> {
    try {
      return await this.semanticChunker.chunk(
        refinement.id,
        contentItem.normalizedContent,
        config,
      );
    } catch (error) {
      this.logger.error(
        `Chunking failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Processes chunks by extracting entities, analyzing temporal context,
   * and calculating quality scores
   */
  private async processChunks(
    chunks: Chunk[],
    contentItem: ContentItemData,
    config: RefineContentCommand['config'],
  ): Promise<Chunk[]> {
    const qualityThreshold = config?.qualityThreshold ?? 0.3;
    const processedChunks: Chunk[] = [];

    for (const chunk of chunks) {
      try {
        // Extract crypto entities
        const entities = await this.entityExtractor.extract(chunk.content);
        if (entities.length > 0) {
          chunk.enrichWithEntities(entities);
        }

        // Analyze temporal context
        const temporalContext = await this.temporalExtractor.extract(
          chunk.content,
          contentItem.metadata.publishedAt,
        );
        if (temporalContext) {
          chunk.setTemporalContext(temporalContext);
        }

        // Calculate quality score
        const qualityScore = await this.qualityAnalyzer.analyze(chunk.content, {
          tokenCount: this.estimateTokenCount(chunk.content),
          entities,
          publishedAt: contentItem.metadata.publishedAt,
        });
        chunk.calculateQualityScore(qualityScore);

        // Filter by quality threshold
        if (qualityScore.overall >= qualityThreshold) {
          processedChunks.push(chunk);
        } else {
          this.logger.debug(
            `Chunk rejected due to low quality: ${qualityScore.overall.toFixed(2)} < ${qualityThreshold}`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Failed to process chunk: ${error instanceof Error ? error.message : String(error)}`,
        );
        // Continue with next chunk
      }
    }

    return processedChunks;
  }

  /**
   * Builds chunking configuration from command config
   */
  private buildChunkingConfig(
    config: RefineContentCommand['config'],
  ): ChunkingConfig {
    return {
      chunkSize: config?.chunkSize ?? 800,
      chunkOverlap: config?.chunkOverlap ?? 150,
    };
  }

  /**
   * Estimates token count (rough approximation: 1 token ≈ 4 characters)
   */
  private estimateTokenCount(content: string): number {
    return Math.ceil(content.length / 4);
  }

  /**
   * Calculates average quality score across chunks
   */
  private calculateAverageQuality(chunks: Chunk[]): number {
    if (chunks.length === 0) return 0;

    const sum = chunks.reduce(
      (acc, chunk) => acc + chunk.qualityScore.overall,
      0,
    );
    return sum / chunks.length;
  }

  /**
   * Publishes domain events from aggregate
   */
  private publishEvents(refinement: ContentRefinement): void {
    const events = refinement.getUncommittedEvents();
    events.forEach((event) => {
      this.eventBus.publish(event);
    });
    refinement.commit();
  }

  /**
   * Generates a unique ID for refinement
   */
  private generateId(): string {
    return `refinement-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Creates a rejected result
   */
  private createRejectedResult(
    refinementId: string,
    contentItemId: string,
    reason: string,
  ): RefineContentResult {
    return {
      refinementId,
      contentItemId,
      status: 'rejected',
      rejectionReason: reason,
    };
  }

  /**
   * Creates a failed result
   */
  private createFailedResult(
    refinementId: string,
    contentItemId: string,
    error: Error,
  ): RefineContentResult {
    return {
      refinementId,
      contentItemId,
      status: 'failed',
      error: {
        code: 'REFINEMENT_ERROR',
        message: error.message,
      },
    };
  }
}
