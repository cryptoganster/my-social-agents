import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetContentByHashQuery, GetContentByHashResult } from './query';
import { IContentItemReadRepository } from '@/ingestion/content/domain/interfaces/repositories/content-item-read';
import { ContentHash } from '@/ingestion/content/domain/value-objects/content-hash';

/**
 * GetContentByHashQueryHandler
 *
 * Handles GetContentByHashQuery by querying the read repository.
 * Used for duplicate detection during content ingestion flow.
 *
 * Requirements: 2.1, 2.2, 3.1, 3.2
 * Design: Queries - Content Queries
 */
@QueryHandler(GetContentByHashQuery)
export class GetContentByHashQueryHandler implements IQueryHandler<
  GetContentByHashQuery,
  GetContentByHashResult
> {
  constructor(
    @Inject('IContentItemReadRepository')
    private readonly readRepository: IContentItemReadRepository,
  ) {}

  async execute(query: GetContentByHashQuery): Promise<GetContentByHashResult> {
    // Create ContentHash value object from string
    const contentHash = ContentHash.create(query.contentHash);

    // Query read repository
    const readModel = await this.readRepository.findByHash(contentHash);

    return readModel;
  }
}
