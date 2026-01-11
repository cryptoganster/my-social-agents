import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// ===== Command Handlers =====
import { RefineContentCommandHandler } from './app/commands/refine-content/handler';
import { RerefineContentCommandHandler } from './app/commands/rerefine-content/handler';

// ===== Event Handlers =====
import { TriggerRefinementOnContentIngested } from './app/events/content-ingested/handler';

// ===== Domain Services (Implementations) =====
import { SemanticChunker } from './domain/services/semantic-chunker';
import { CryptoEntityExtractor } from './domain/services/crypto-entity-extractor';
import { TemporalAnalyzer } from './domain/services/temporal-analyzer';
import { ContentQualityAnalyzer } from './domain/services/content-quality-analyzer';

/**
 * RefinementModule
 *
 * NestJS module for the Content Refinement bounded context.
 * Handles semantic chunking and crypto-specific metadata enrichment.
 *
 * Responsibilities:
 * - Content refinement (RefineContentCommand)
 * - Content re-refinement (RerefineContentCommand)
 * - Semantic chunking with configurable strategies
 * - Crypto entity extraction (hybrid regex + LLM)
 * - Temporal context analysis
 * - Quality scoring and filtering
 *
 * Architecture:
 * - Follows Clean Architecture with strict layer separation
 * - Implements DDD bounded context principles
 * - Uses CQRS for command/query separation
 * - Domain services depend on interfaces (DIP)
 *
 * Dependencies (to be provided by parent module or future implementation):
 * - IContentItemFactory (from ingestion context)
 * - IContentRefinementFactory (future implementation)
 * - IContentRefinementWriteRepository (future implementation)
 * - IChunkingStrategy implementations (future: MarkdownChunker, SentenceChunker)
 * - IEntityExtractor implementations (RegexEntityExtractor, LlmEntityExtractor)
 * - ITemporalExtractor implementation (future)
 * - IQualityAnalyzer implementation (ContentQualityAnalyzer)
 *
 * Requirements: Refinement 1-11
 * Design: Application Layer - Module Configuration
 */
@Module({
  imports: [
    // CQRS module for command/query/event handling
    CqrsModule,
  ],
  providers: [
    // ===== Command Handlers =====
    RefineContentCommandHandler,
    RerefineContentCommandHandler,

    // ===== Event Handlers =====
    TriggerRefinementOnContentIngested,

    // ===== Domain Services with String Tokens =====
    // Note: SemanticChunker is registered with 'ISemanticChunker' token
    // even though it's not an interface yet. This allows for future
    // refactoring to extract an interface without changing handlers.
    {
      provide: 'ISemanticChunker',
      useClass: SemanticChunker,
    },
    {
      provide: 'IEntityExtractor',
      useClass: CryptoEntityExtractor,
    },
    {
      provide: 'ITemporalExtractor',
      useClass: TemporalAnalyzer,
    },
    {
      provide: 'IQualityAnalyzer',
      useClass: ContentQualityAnalyzer,
    },

    // ===== Factories =====
    // TODO: Register when implemented
    // {
    //   provide: 'IContentItemFactory',
    //   useClass: TypeOrmContentItemFactory,
    // },
    // {
    //   provide: 'IContentRefinementFactory',
    //   useClass: TypeOrmContentRefinementFactory,
    // },

    // ===== Repositories =====
    // TODO: Register when implemented
    // {
    //   provide: 'IContentRefinementWriteRepository',
    //   useClass: TypeOrmContentRefinementWriteRepository,
    // },
    // ContentRefinementReadRepository,
  ],
  exports: [
    // Export command handlers for use in other modules
    RefineContentCommandHandler,
    RerefineContentCommandHandler,

    // Export domain services for cross-context usage
    'ISemanticChunker',
    'IEntityExtractor',
    'ITemporalExtractor',
    'IQualityAnalyzer',

    // TODO: Export when implemented
    // 'IContentItemFactory',
    // 'IContentRefinementFactory',
    // 'IContentRefinementWriteRepository',
    // ContentRefinementReadRepository,
  ],
})
export class RefinementModule {}
