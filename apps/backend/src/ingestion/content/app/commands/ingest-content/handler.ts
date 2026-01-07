import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { ISourceConfigurationFactory } from '@/ingestion/source/domain/interfaces/factories/source-configuration-factory';
import { SourceAdapter } from '@/ingestion/source/domain/interfaces/source-adapter';
import { SourceType } from '@/ingestion/source/domain/value-objects/source-type';
import { ContentCollectedEvent } from '@/ingestion/content/domain/events';
import { IngestContentCommand } from './command';
import { IngestContentResult } from './result';

/**
 * IngestContentCommandHandler
 *
 * Simplified command handler following CQRS + Event-Driven architecture.
 * Responsibilities:
 * 1. Load source configuration
 * 2. Invoke appropriate source adapter to collect content
 * 3. Publish ContentCollectedEvent for each collected item
 *
 * The actual processing (validation, normalization, deduplication, persistence)
 * is handled by ContentCollectedEventHandler, ensuring proper separation of concerns.
 *
 * Requirements: 1.1-1.6
 */
@CommandHandler(IngestContentCommand)
export class IngestContentCommandHandler implements ICommandHandler<
  IngestContentCommand,
  IngestContentResult
> {
  private readonly logger = new Logger(IngestContentCommandHandler.name);

  constructor(
    @Inject('ISourceConfigurationFactory')
    private readonly sourceConfigFactory: ISourceConfigurationFactory,
    @Inject('SourceAdapter')
    private readonly adapters: SourceAdapter[],
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Executes the IngestContentCommand
   *
   * Pipeline: load config → collect content → publish events
   * Processing is delegated to event handlers
   */
  async execute(command: IngestContentCommand): Promise<IngestContentResult> {
    const result: IngestContentResult = {
      itemsCollected: 0,
      itemsPersisted: 0,
      duplicatesDetected: 0,
      validationErrors: 0,
      errors: [],
    };

    try {
      // 1. Load source configuration
      this.logger.log(`Loading source configuration: ${command.sourceId}`);
      const sourceConfig = await this.sourceConfigFactory.load(
        command.sourceId,
      );

      if (!sourceConfig) {
        throw new Error(`Source configuration not found: ${command.sourceId}`);
      }

      if (!sourceConfig.isActive) {
        throw new Error(
          `Source configuration is inactive: ${command.sourceId}`,
        );
      }

      // 2. Find appropriate adapter
      const adapter = this.findAdapter(sourceConfig.sourceType);
      if (!adapter) {
        throw new Error(
          `No adapter found for source type: ${sourceConfig.sourceType.getValue()}`,
        );
      }

      // 3. Collect content from source
      this.logger.log(
        `Collecting content from source: ${command.sourceId} using ${sourceConfig.sourceType.getValue()} adapter`,
      );
      const rawContentItems = await adapter.collect(sourceConfig);
      result.itemsCollected = rawContentItems.length;

      this.logger.log(`Collected ${rawContentItems.length} items`);

      // 4. Publish ContentCollectedEvent for each item
      // Event handlers will process each item asynchronously
      for (const rawContent of rawContentItems) {
        try {
          const event = new ContentCollectedEvent(
            command.sourceId,
            rawContent.content,
            rawContent.metadata || {},
            sourceConfig.sourceType.getValue(),
            new Date(),
          );

          this.eventBus.publish(event);
        } catch (error) {
          this.logger.error(
            `Error publishing ContentCollectedEvent: ${error instanceof Error ? error.message : 'Unknown error'}`,
            error instanceof Error ? error.stack : undefined,
          );
          result.errors.push({
            message: error instanceof Error ? error.message : 'Unknown error',
            content: rawContent.content.substring(0, 100),
          });
        }
      }

      this.logger.log(
        `Published ${result.itemsCollected} ContentCollectedEvents`,
      );

      return result;
    } catch (error) {
      // Fatal error: log and rethrow
      this.logger.error(
        `Fatal error during content ingestion: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Finds the appropriate adapter for a source type
   */
  private findAdapter(sourceType: SourceType): SourceAdapter | undefined {
    return this.adapters.find((adapter) => adapter.supports(sourceType));
  }
}
