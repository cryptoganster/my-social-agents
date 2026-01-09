import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { ISourceConfigurationFactory } from '@/ingestion/source/domain/interfaces/factories/source-configuration-factory';
import { AdapterRegistry } from '@/ingestion/source/domain/services/adapter-registry';
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
 * Requirements: 1.1-1.6, 10.1, 10.2, 10.3
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
    @Inject('AdapterRegistry')
    private readonly adapterRegistry: AdapterRegistry,
    private readonly eventBus: EventBus,
  ) {
    this.logger.log('IngestContentCommandHandler initialized');
    this.logger.log(
      `Initialized with AdapterRegistry containing ${this.adapterRegistry.getRegisteredTypes().length} adapter(s)`,
    );

    // Log registered adapters
    const registeredTypes = this.adapterRegistry.getRegisteredTypes();
    registeredTypes.forEach((type, index) => {
      this.logger.log(`Adapter ${index + 1}: ${type}`);
    });
  }

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

      // 2. Get adapter from registry
      this.logger.log(
        `Getting adapter for source type: ${sourceConfig.sourceType.getValue()}`,
      );
      const adapter = this.adapterRegistry.getAdapter(sourceConfig.sourceType);

      // 3. Collect content from source
      this.logger.log(
        `Collecting content from source: ${command.sourceId} using ${sourceConfig.sourceType.getValue()} adapter`,
      );
      const rawContentItems = await adapter.collect(sourceConfig);

      if (!rawContentItems) {
        throw new Error(
          `Adapter returned undefined for source: ${command.sourceId}`,
        );
      }

      result.itemsCollected = rawContentItems.length;

      this.logger.log(`Collected ${rawContentItems.length} items`);

      // 4. Publish ContentCollectedEvent for each item
      // Event handlers will process each item asynchronously
      for (const rawContent of rawContentItems) {
        try {
          const event = new ContentCollectedEvent(
            command.sourceId,
            '', // jobId - will be set by ExecuteJobCommand in future refactoring
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
}
