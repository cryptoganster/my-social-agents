import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { SourceUnhealthyEvent } from '@/ingestion/source/domain/events';
import { ISourceConfigurationFactory } from '@/ingestion/source/domain/interfaces/factories';
import { ISourceConfigurationWriteRepository } from '@/ingestion/source/domain/interfaces/repositories';

/**
 * SourceUnhealthyEventHandler
 *
 * Handles SourceUnhealthyEvent by automatically disabling unhealthy sources.
 * This handler centralizes source health management and automates the response
 * to sources that have become unreliable based on failure thresholds.
 *
 * Flow:
 * 1. Receive SourceUnhealthyEvent
 * 2. Log unhealthy source details for monitoring
 * 3. Load source via factory
 * 4. Call source.disable() with reason
 * 5. Persist via write repository
 * 6. TODO: Send alert to administrators
 *
 * Requirements: 4.5, 4.6, 4.7
 * Design: Event Handlers - Source Event Handlers
 */
@EventsHandler(SourceUnhealthyEvent)
export class SourceUnhealthyEventHandler implements IEventHandler<SourceUnhealthyEvent> {
  private readonly logger = new Logger(SourceUnhealthyEventHandler.name);

  constructor(
    @Inject('ISourceConfigurationFactory')
    private readonly sourceFactory: ISourceConfigurationFactory,
    @Inject('ISourceConfigurationWriteRepository')
    private readonly sourceWriteRepo: ISourceConfigurationWriteRepository,
  ) {}

  /**
   * Handles SourceUnhealthyEvent
   *
   * Logs health issue and automatically disables the source.
   * Uses retry logic to handle concurrency conflicts.
   */
  async handle(event: SourceUnhealthyEvent): Promise<void> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        // Log unhealthy source details
        if (attempt === 0) {
          this.logger.error(
            `Source ${event.sourceId} marked unhealthy: ${event.failureRate.toFixed(2)}% failure rate, ${event.consecutiveFailures} consecutive failures`,
          );
        }

        // Load source via factory (gets latest version)
        const source = await this.sourceFactory.load(event.sourceId);

        if (!source) {
          this.logger.warn(
            `Source ${event.sourceId} not found when attempting to disable`,
          );
          return;
        }

        // Check if already disabled (avoid redundant updates)
        if (!source.isActive) {
          this.logger.debug(
            `Source ${event.sourceId} is already disabled, skipping`,
          );
          return;
        }

        // Disable source with reason
        source.disable('Automatic disable due to health issues');

        // Persist via write repository
        await this.sourceWriteRepo.save(source);

        this.logger.warn(
          `Source ${event.sourceId} has been automatically disabled due to health issues`,
        );

        // TODO: Send alert to administrators
        // Implement alerting mechanism (email, Slack, PagerDuty, etc.)
        // Include source details, failure metrics, and recommended actions

        return; // Success, exit retry loop
      } catch (error) {
        attempt++;

        // Check if it's a concurrency exception
        const isConcurrencyError =
          error instanceof Error &&
          error.message.includes('was modified by another transaction');

        if (isConcurrencyError && attempt < maxRetries) {
          // Retry on concurrency conflicts
          this.logger.warn(
            `Concurrency conflict disabling source ${event.sourceId}, retrying (attempt ${attempt}/${maxRetries})`,
          );
          // Wait a bit before retrying
          await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
          continue;
        }

        // Error isolation: log error but don't rethrow
        // This allows other events to continue processing
        this.logger.error(
          `Error handling SourceUnhealthyEvent for source ${event.sourceId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error.stack : undefined,
        );
        return;
      }
    }
  }
}
