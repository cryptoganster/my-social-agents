import { Injectable, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { FinalizeRefinementCommand } from './command';
import { FinalizeRefinementResult } from './result';
import { IContentRefinementFactory } from '@refinement/app/interfaces/factories/content-refinement-factory';
import { IContentRefinementWriteRepository } from '@refinement/domain/interfaces/repositories/content-refinement-write';

/**
 * FinalizeRefinementHandler
 *
 * Handles the FinalizeRefinementCommand to complete the refinement process.
 * This is the final step in the event-driven refinement pipeline.
 *
 * Process:
 * 1. Load ContentRefinement aggregate
 * 2. Validate chunk count
 * 3. Complete or reject refinement based on valid chunks
 * 4. Save to repository
 * 5. Publish domain events
 *
 * Requirements: Refinement 9
 * Design: Application Layer - Command Handlers (Event-Driven Pipeline)
 */
@Injectable()
@CommandHandler(FinalizeRefinementCommand)
export class FinalizeRefinementHandler implements ICommandHandler<
  FinalizeRefinementCommand,
  FinalizeRefinementResult
> {
  private readonly logger = new Logger(FinalizeRefinementHandler.name);

  constructor(
    @Inject('IContentRefinementFactory')
    private readonly refinementFactory: IContentRefinementFactory,
    @Inject('IContentRefinementWriteRepository')
    private readonly writeRepository: IContentRefinementWriteRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(
    command: FinalizeRefinementCommand,
  ): Promise<FinalizeRefinementResult> {
    const { refinementId, contentItemId, totalChunks, validChunks } = command;
    const startTime = Date.now();

    this.logger.log(
      `Finalizing refinement ${refinementId}: ${validChunks}/${totalChunks} valid chunks`,
    );

    try {
      // 1. Load refinement aggregate
      const refinement = await this.refinementFactory.load(refinementId);
      if (!refinement) {
        this.logger.warn(`Refinement not found: ${refinementId}`);
        return new FinalizeRefinementResult(
          refinementId,
          contentItemId,
          'failed',
          totalChunks,
          validChunks,
          Date.now() - startTime,
          undefined,
          undefined,
          { code: 'REFINEMENT_NOT_FOUND', message: 'Refinement not found' },
        );
      }

      // 2. Check if we have valid chunks
      if (validChunks === 0) {
        this.logger.warn(`No valid chunks for refinement ${refinementId}`);
        refinement.reject('No valid chunks after quality filtering');
        await this.writeRepository.save(refinement);
        this.publishEvents(refinement);

        return new FinalizeRefinementResult(
          refinementId,
          contentItemId,
          'rejected',
          totalChunks,
          validChunks,
          Date.now() - startTime,
          undefined,
          'No valid chunks after quality filtering',
        );
      }

      // 3. Complete refinement
      refinement.complete();
      const duration = Date.now() - startTime;

      // 4. Save to repository
      await this.writeRepository.save(refinement);

      // 5. Publish domain events
      this.publishEvents(refinement);

      // 6. Calculate average quality score
      const averageQuality = this.calculateAverageQuality(refinement);

      this.logger.log(
        `Refinement completed: ${refinementId} (${refinement.chunkCount} chunks, ${duration}ms)`,
      );

      return new FinalizeRefinementResult(
        refinementId,
        contentItemId,
        'completed',
        totalChunks,
        validChunks,
        duration,
        averageQuality,
      );
    } catch (error) {
      this.logger.error(
        `Finalization failed for ${refinementId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      return new FinalizeRefinementResult(
        refinementId,
        contentItemId,
        'failed',
        totalChunks,
        validChunks,
        Date.now() - startTime,
        undefined,
        undefined,
        {
          code: 'FINALIZATION_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  private publishEvents(refinement: {
    getUncommittedEvents: () => unknown[];
    commit: () => void;
  }): void {
    const events = refinement.getUncommittedEvents();
    events.forEach((event) => {
      this.eventBus.publish(event as object);
    });
    refinement.commit();
  }

  private calculateAverageQuality(refinement: {
    chunks: ReadonlyArray<{ qualityScore: { overall: number } }>;
  }): number {
    const chunks = refinement.chunks;
    if (chunks.length === 0) return 0;

    const sum = chunks.reduce(
      (acc, chunk) => acc + chunk.qualityScore.overall,
      0,
    );
    return sum / chunks.length;
  }
}
