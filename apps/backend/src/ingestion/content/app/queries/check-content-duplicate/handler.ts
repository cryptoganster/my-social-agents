import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { CheckContentDuplicateQuery } from './query';
import { DuplicateCheckReadModel } from '../read-models/duplicate-check';
import { IDuplicateDetectionService } from '@/ingestion/content/domain/interfaces/services/duplicate-detection';
import { IContentItemReadRepository } from '@/ingestion/content/app/queries/repositories/content-item';

/**
 * CheckContentDuplicateHandler
 *
 * Handles CheckContentDuplicateQuery by:
 * 1. Computing content hash
 * 2. Checking if content with same hash exists
 *
 * Pure query - no side effects, no event publishing.
 *
 * Requirements: 3.2, 3.3
 */
@Injectable()
@QueryHandler(CheckContentDuplicateQuery)
export class CheckContentDuplicateHandler implements IQueryHandler<
  CheckContentDuplicateQuery,
  DuplicateCheckReadModel
> {
  private readonly logger = new Logger(CheckContentDuplicateHandler.name);

  constructor(
    @Inject('IDuplicateDetectionService')
    private readonly duplicateDetectionService: IDuplicateDetectionService,
    @Inject('IContentItemReadRepository')
    private readonly contentItemReadRepository: IContentItemReadRepository,
  ) {}

  async execute(
    query: CheckContentDuplicateQuery,
  ): Promise<DuplicateCheckReadModel> {
    this.logger.debug('Checking for duplicate content');

    // 1. Compute content hash
    const contentHash = this.duplicateDetectionService.computeHash(
      query.normalizedContent,
    );
    const contentHashString = contentHash.toString();

    // 2. Check for existing content with same hash
    const existingContent =
      await this.contentItemReadRepository.findByHash(contentHash);

    const isDuplicate = existingContent !== null;
    const existingContentId = existingContent?.contentId ?? null;

    if (isDuplicate) {
      this.logger.debug(`Duplicate content detected: ${contentHashString}`);
    }

    return {
      isDuplicate,
      contentHash: contentHashString,
      existingContentId,
    };
  }
}
