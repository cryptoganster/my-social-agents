import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { GetSourceByIdQuery, GetSourceByIdResult } from './query';
import { ISourceConfigurationReadRepository } from '@/ingestion/source/app/queries/repositories/source-configuration-read';

/**
 * GetSourceByIdQueryHandler
 *
 * Handles GetSourceByIdQuery by retrieving a source configuration from the read repository.
 * Returns a read model with health metrics for monitoring and validation.
 *
 * Requirements: 10.1, 10.2
 * Design: Queries - Source Queries
 */
@Injectable()
@QueryHandler(GetSourceByIdQuery)
export class GetSourceByIdQueryHandler implements IQueryHandler<
  GetSourceByIdQuery,
  GetSourceByIdResult | null
> {
  constructor(
    @Inject('ISourceConfigurationReadRepository')
    private readonly sourceReadRepository: ISourceConfigurationReadRepository,
  ) {}

  async execute(
    query: GetSourceByIdQuery,
  ): Promise<GetSourceByIdResult | null> {
    return await this.sourceReadRepository.findByIdWithHealth(query.sourceId);
  }
}
