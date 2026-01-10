import { Logger } from '@nestjs/common';
import { ReadModel, IReadModelRepository } from './read-model';
import { VersionedEvent } from './event-versioning';

/**
 * ReadModelUpdater Base Class
 *
 * Abstract base class for event handlers that update read models.
 * Provides common functionality for:
 * - Error isolation (log errors but don't rethrow)
 * - Idempotency checking
 * - Logging and observability
 * - Version tracking
 *
 * @template TEvent - The domain event type
 * @template TReadModel - The read model type
 *
 * ## Usage Example
 *
 * ```typescript
 * @EventsHandler(SourceConfiguredEvent)
 * export class SourceConfiguredEventHandler
 *   extends ReadModelUpdater<SourceConfiguredEvent, SourceReadModel>
 *   implements IEventHandler<SourceConfiguredEvent>
 * {
 *   constructor(
 *     @Inject('ISourceReadRepository')
 *     repository: IReadModelRepository<SourceReadModel>,
 *   ) {
 *     super(repository, 'SourceConfiguredEventHandler');
 *   }
 *
 *   protected async updateReadModel(
 *     event: SourceConfiguredEvent,
 *   ): Promise<void> {
 *     const existing = await this.repository.findById(event.sourceId);
 *
 *     const readModel: SourceReadModel = {
 *       id: event.sourceId,
 *       sourceType: event.sourceType,
 *       name: event.name,
 *       isActive: event.isActive,
 *       configSummary: event.configSummary,
 *       updatedAt: event.occurredAt,
 *       version: existing ? existing.version + 1 : 1,
 *     };
 *
 *     await this.repository.save(readModel);
 *   }
 * }
 * ```
 */
export abstract class ReadModelUpdater<
  TEvent extends VersionedEvent,
  TReadModel extends ReadModel,
> {
  protected readonly logger: Logger;

  constructor(
    protected readonly repository: IReadModelRepository<TReadModel>,
    loggerContext: string,
  ) {
    this.logger = new Logger(loggerContext);
  }

  /**
   * Handle the domain event
   * Implements error isolation pattern
   */
  async handle(event: TEvent): Promise<void> {
    try {
      this.logger.debug(
        `Processing ${event.eventType} (v${event.eventVersion}): ${event.eventId}`,
      );

      // Check idempotency
      if (await this.isAlreadyProcessed(event)) {
        this.logger.debug(
          `Event already processed: ${event.eventId}, skipping`,
        );
        return;
      }

      // Update the read model
      await this.updateReadModel(event);

      this.logger.debug(`Event processed successfully: ${event.eventId}`);
    } catch (error) {
      // Error isolation: log but don't rethrow
      // Allows other event handlers to continue
      this.logger.error(
        `Error processing ${event.eventType}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Update the read model based on the event
   * Subclasses must implement this method
   */
  protected abstract updateReadModel(event: TEvent): Promise<void>;

  /**
   * Check if the event has already been processed
   * Default implementation always returns false (no idempotency check)
   * Subclasses can override to implement idempotency
   */
  protected isAlreadyProcessed(_event: TEvent): Promise<boolean> {
    // Default: no idempotency check
    // Subclasses can override to check event IDs or correlation IDs
    return Promise.resolve(false);
  }

  /**
   * Get the read model ID from the event
   * Default implementation uses aggregateId
   * Subclasses can override for custom ID extraction
   */
  protected getReadModelId(event: TEvent): string {
    return event.aggregateId;
  }
}

/**
 * IdempotentReadModelUpdater
 *
 * Extended base class that provides idempotency checking
 * by tracking processed event IDs.
 *
 * Requires a repository that supports checking for processed events.
 */
export abstract class IdempotentReadModelUpdater<
  TEvent extends VersionedEvent,
  TReadModel extends ReadModel,
> extends ReadModelUpdater<TEvent, TReadModel> {
  private processedEventIds: Set<string> = new Set();

  /**
   * Check if event has already been processed
   * Uses in-memory cache for performance
   */
  protected async isAlreadyProcessed(event: TEvent): Promise<boolean> {
    // Check in-memory cache first
    if (this.processedEventIds.has(event.eventId)) {
      return true;
    }

    // Check if read model was updated after event occurred
    const readModel = await this.repository.findById(
      this.getReadModelId(event),
    );

    if (readModel && readModel.updatedAt >= event.occurredAt) {
      // Mark as processed in cache
      this.processedEventIds.add(event.eventId);
      return true;
    }

    return false;
  }

  /**
   * Mark event as processed after successful update
   */
  protected async updateReadModel(event: TEvent): Promise<void> {
    await this.doUpdateReadModel(event);

    // Mark as processed
    this.processedEventIds.add(event.eventId);

    // Limit cache size to prevent memory leaks
    if (this.processedEventIds.size > 10000) {
      // Remove oldest entries (simple FIFO)
      const iterator = this.processedEventIds.values();
      for (let i = 0; i < 1000; i++) {
        const value = iterator.next().value;
        if (value) {
          this.processedEventIds.delete(value);
        }
      }
    }
  }

  /**
   * Actual read model update logic
   * Subclasses implement this instead of updateReadModel
   */
  protected abstract doUpdateReadModel(event: TEvent): Promise<void>;
}
