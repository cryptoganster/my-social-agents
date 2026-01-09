import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { ISourceConfigurationFactory } from '@/ingestion/source/domain/interfaces/factories/source-configuration-factory';
import { ISourceConfigurationWriteRepository } from '@/ingestion/source/domain/interfaces/repositories/source-configuration-write';
import { SourceUnhealthyEvent } from '@/ingestion/source/domain/events/source-unhealthy';
import { UpdateSourceHealthCommand } from './command';

/**
 * UpdateSourceHealthCommandHandler
 *
 * Handles updating source health metrics based on job outcomes.
 * Responsibilities:
 * 1. Load source via factory
 * 2. Update health metrics on aggregate (recordSuccess/recordFailure)
 * 3. Check if source should be marked unhealthy
 * 4. Persist via write repository
 * 5. If unhealthy, publish SourceUnhealthyEvent
 *
 * Requirements: 4.1-4.7
 * Design: Commands - Source Commands
 */
@CommandHandler(UpdateSourceHealthCommand)
export class UpdateSourceHealthCommandHandler implements ICommandHandler<
  UpdateSourceHealthCommand,
  void
> {
  private readonly logger = new Logger(UpdateSourceHealthCommandHandler.name);

  constructor(
    @Inject('ISourceConfigurationFactory')
    private readonly sourceFactory: ISourceConfigurationFactory,
    @Inject('ISourceConfigurationWriteRepository')
    private readonly sourceWriteRepository: ISourceConfigurationWriteRepository,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Executes the UpdateSourceHealthCommand
   *
   * Pipeline: load source → update health → check threshold → persist → publish event if unhealthy
   */
  async execute(command: UpdateSourceHealthCommand): Promise<void> {
    this.logger.log(
      `Updating health for source ${command.sourceId} with outcome: ${command.jobOutcome}`,
    );

    // 1. Load source via factory
    const source = await this.sourceFactory.load(command.sourceId);

    if (!source) {
      throw new Error(`Source not found: ${command.sourceId}`);
    }

    // 2. Update health metrics on aggregate
    if (command.jobOutcome === 'success') {
      source.recordSuccess(command.metrics);
      this.logger.log(
        `Recorded success for source ${command.sourceId}. ` +
          `Success rate: ${source.successRate.toFixed(1)}%, ` +
          `Consecutive failures: ${source.consecutiveFailures}`,
      );
    } else {
      source.recordFailure();
      this.logger.warn(
        `Recorded failure for source ${command.sourceId}. ` +
          `Success rate: ${source.successRate.toFixed(1)}%, ` +
          `Consecutive failures: ${source.consecutiveFailures}`,
      );
    }

    // 3. Check if source should be marked unhealthy
    const wasUnhealthy = source.isUnhealthy();

    // 4. Persist via write repository
    await this.sourceWriteRepository.save(source);

    this.logger.log(`Persisted health update for source ${command.sourceId}`);

    // 5. If unhealthy, publish SourceUnhealthyEvent
    if (wasUnhealthy) {
      const event = new SourceUnhealthyEvent(
        command.sourceId,
        source.successRate,
        source.consecutiveFailures,
        new Date(),
      );

      await this.eventBus.publish(event);

      this.logger.error(
        `Published SourceUnhealthyEvent for source ${command.sourceId}. ` +
          `Failure rate: ${(100 - source.successRate).toFixed(1)}%, ` +
          `Consecutive failures: ${source.consecutiveFailures}`,
      );
    }
  }
}
