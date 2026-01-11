import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { ContentNormalized } from '@/ingestion/content/domain/events';
import { ValidateContentQualityCommand } from '../commands/validate-content-quality/command';

/**
 * ValidateContentQualityOnContentNormalized
 *
 * Handles ContentNormalized by triggering the ValidateContentQualityCommand.
 * Second step in the content processing pipeline.
 *
 * Pipeline: ContentNormalized → ValidateContentQualityCommand → ContentQualityValidated | ContentValidationFailed
 *
 * Requirements: 2.3, 3.1
 */
@Injectable()
@EventsHandler(ContentNormalized)
export class ValidateContentQualityOnContentNormalized implements IEventHandler<ContentNormalized> {
  private readonly logger = new Logger(
    ValidateContentQualityOnContentNormalized.name,
  );

  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: ContentNormalized): Promise<void> {
    try {
      this.logger.debug(
        `Triggering content quality validation for source: ${event.sourceId}`,
      );

      await this.commandBus.execute(
        new ValidateContentQualityCommand(
          event.jobId,
          event.sourceId,
          event.rawContent,
          event.normalizedContent,
          event.metadata,
          event.assetTags,
          event.collectedAt,
        ),
      );
    } catch (error) {
      // Error isolation: log but don't rethrow
      this.logger.error(
        `Error triggering validation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
