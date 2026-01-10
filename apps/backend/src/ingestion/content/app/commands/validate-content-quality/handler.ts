import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { ValidateContentQualityCommand } from './command';
import { ValidateContentQualityResult } from './result';
import { IContentValidationService } from '@/ingestion/content/domain/interfaces/services/content-validation';
import { ContentMetadata } from '@/ingestion/content/domain/value-objects/content-metadata';
import {
  ContentQualityValidated,
  ContentValidationFailed,
} from '@/ingestion/content/domain/events';

/**
 * ValidateContentQualityHandler
 *
 * Handles ValidateContentQualityCommand by:
 * 1. Validating content quality using the validation service
 * 2. Publishing ContentQualityValidated if valid
 * 3. Publishing ContentValidationFailed if invalid
 *
 * Requirements: 2.3, 3.1
 */
@Injectable()
@CommandHandler(ValidateContentQualityCommand)
export class ValidateContentQualityHandler implements ICommandHandler<
  ValidateContentQualityCommand,
  ValidateContentQualityResult
> {
  private readonly logger = new Logger(ValidateContentQualityHandler.name);

  constructor(
    @Inject('IContentValidationService')
    private readonly validationService: IContentValidationService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(
    command: ValidateContentQualityCommand,
  ): Promise<ValidateContentQualityResult> {
    this.logger.debug(
      `Validating content quality for source: ${command.sourceId}`,
    );

    // 1. Create ContentMetadata value object
    const metadata = ContentMetadata.create({
      title: command.metadata.title,
      author: command.metadata.author,
      publishedAt: command.metadata.publishedAt,
      language: command.metadata.language,
      sourceUrl: command.metadata.sourceUrl,
    });

    // 2. Validate content quality
    const validationResult = this.validationService.validateQuality(
      command.normalizedContent,
      metadata,
    );

    const validatedAt = new Date();

    // 3. Publish appropriate event
    if (validationResult.isValid) {
      const event = new ContentQualityValidated(
        command.jobId,
        command.sourceId,
        command.rawContent,
        command.normalizedContent,
        command.metadata,
        command.assetTags,
        validationResult.qualityScore ?? 0,
        command.collectedAt,
        validatedAt,
      );

      await this.eventBus.publish(event);
      this.logger.debug(
        `Content quality validated for source: ${command.sourceId}`,
      );
    } else {
      const event = new ContentValidationFailed(
        command.jobId,
        command.sourceId,
        command.rawContent.substring(0, 200), // Truncate
        validationResult.errors,
        validatedAt,
      );

      await this.eventBus.publish(event);
      this.logger.warn(
        `Content validation failed for source ${command.sourceId}: ${validationResult.errors.join(', ')}`,
      );
    }

    return new ValidateContentQualityResult(
      validationResult.isValid,
      validationResult.errors,
      validationResult.qualityScore ?? 0,
      validatedAt,
    );
  }
}
