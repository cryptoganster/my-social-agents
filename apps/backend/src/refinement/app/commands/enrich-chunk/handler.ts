import { Injectable, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { EnrichChunkCommand } from './command';
import { EnrichChunkResult } from './result';
import { IEntityExtractor } from '@refinement/domain/interfaces/services/entity-extractor';
import { ITemporalExtractor } from '@refinement/domain/interfaces/services/temporal-extractor';
import { IQualityAnalyzer } from '@refinement/domain/interfaces/services/quality-analyzer';
import {
  ChunkEnriched,
  CryptoEntityData,
  TemporalContextData,
  QualityScoreData,
} from '@refinement/domain/events/chunk-enriched';

/**
 * EnrichChunkCommandHandler
 *
 * Handles the EnrichChunkCommand to enrich a single chunk with:
 * - Crypto entities (tokens, exchanges, blockchains, protocols, events)
 * - Temporal context (dates, time windows)
 * - Quality score (length, coherence, relevance, freshness)
 *
 * This is a focused handler with single responsibility: enrichment.
 *
 * Process:
 * 1. Extract crypto entities
 * 2. Analyze temporal context
 * 3. Calculate quality score
 * 4. Publish ChunkEnriched event
 *
 * Requirements: Refinement 3, 4, 5
 * Design: Application Layer - Command Handlers (Event-Driven Pipeline)
 */
@Injectable()
@CommandHandler(EnrichChunkCommand)
export class EnrichChunkCommandHandler implements ICommandHandler<
  EnrichChunkCommand,
  EnrichChunkResult
> {
  private readonly logger = new Logger(EnrichChunkCommandHandler.name);

  constructor(
    @Inject('IEntityExtractor')
    private readonly entityExtractor: IEntityExtractor,
    @Inject('ITemporalExtractor')
    private readonly temporalExtractor: ITemporalExtractor,
    @Inject('IQualityAnalyzer')
    private readonly qualityAnalyzer: IQualityAnalyzer,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: EnrichChunkCommand): Promise<EnrichChunkResult> {
    const {
      refinementId,
      contentItemId,
      chunkId,
      chunkContent,
      chunkIndex,
      totalChunks,
      publishedAt,
      qualityThreshold,
    } = command;

    this.logger.debug(
      `Enriching chunk ${chunkIndex + 1}/${totalChunks} for refinement: ${refinementId}`,
    );

    try {
      // 1. Extract crypto entities
      const entities = await this.entityExtractor.extract(chunkContent);
      const entitiesData: CryptoEntityData[] = entities.map((e) => ({
        type: e.type,
        value: e.value,
        confidence: e.confidence,
        startPos: e.startPos,
        endPos: e.endPos,
      }));

      // 2. Analyze temporal context
      const temporalContext = await this.temporalExtractor.extract(
        chunkContent,
        publishedAt,
      );
      const temporalContextData: TemporalContextData | null = temporalContext
        ? {
            publishedAt: temporalContext.publishedAt,
            eventTimestamp: temporalContext.eventTimestamp ?? undefined,
          }
        : null;

      // 3. Calculate quality score
      const qualityScore = await this.qualityAnalyzer.analyze(chunkContent, {
        tokenCount: this.estimateTokenCount(chunkContent),
        entities,
        publishedAt,
      });
      const qualityScoreData: QualityScoreData = {
        overall: qualityScore.overall,
        lengthScore: qualityScore.lengthScore,
        coherenceScore: qualityScore.coherenceScore,
        relevanceScore: qualityScore.relevanceScore,
        freshnessScore: qualityScore.freshnessScore,
      };

      // 4. Check quality threshold
      const passedQualityThreshold = qualityScore.overall >= qualityThreshold;

      if (!passedQualityThreshold) {
        this.logger.debug(
          `Chunk ${chunkId} rejected due to low quality: ${qualityScore.overall.toFixed(2)} < ${qualityThreshold}`,
        );
      }

      // 5. Publish ChunkEnriched event
      await this.eventBus.publish(
        new ChunkEnriched(
          refinementId,
          contentItemId,
          chunkId,
          chunkContent,
          chunkIndex,
          totalChunks,
          entitiesData,
          temporalContextData,
          qualityScoreData,
          passedQualityThreshold,
        ),
      );

      this.logger.debug(
        `Chunk enriched: ${chunkId} (quality: ${qualityScore.overall.toFixed(2)}, passed: ${passedQualityThreshold})`,
      );

      return new EnrichChunkResult(
        refinementId,
        contentItemId,
        chunkId,
        chunkIndex,
        entitiesData,
        temporalContextData,
        qualityScoreData,
        passedQualityThreshold,
        passedQualityThreshold ? 'enriched' : 'rejected',
        passedQualityThreshold ? undefined : 'Quality score below threshold',
      );
    } catch (error) {
      this.logger.error(
        `Enrichment failed for chunk ${chunkId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      return new EnrichChunkResult(
        refinementId,
        contentItemId,
        chunkId,
        chunkIndex,
        [],
        null,
        {
          overall: 0,
          lengthScore: 0,
          coherenceScore: 0,
          relevanceScore: 0,
          freshnessScore: 0,
        },
        false,
        'failed',
        undefined,
        {
          code: 'ENRICHMENT_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Estimates token count (rough approximation: 1 token ≈ 4 characters)
   */
  private estimateTokenCount(content: string): number {
    return Math.ceil(content.length / 4);
  }
}
