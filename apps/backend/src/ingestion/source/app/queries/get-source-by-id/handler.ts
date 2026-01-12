import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { GetSourceByIdQuery } from './query';
import { GetSourceByIdResponse } from './response';
import { ISourceConfigurationReadRepository } from '@/ingestion/source/app/queries/repositories/source-configuration-read';
import { SourceConfigurationReadModel } from '@/ingestion/source/app/queries/read-models/source-configuration';

/**
 * GetSourceByIdQueryHandler
 *
 * Handles GetSourceByIdQuery by retrieving a source configuration from the read repository.
 * Maps ReadModel to query-specific Response type with health metrics.
 *
 * Requirements: 10.1, 10.2
 * Design: Queries - Source Queries
 */
@Injectable()
@QueryHandler(GetSourceByIdQuery)
export class GetSourceByIdQueryHandler implements IQueryHandler<
  GetSourceByIdQuery,
  GetSourceByIdResponse | null
> {
  constructor(
    @Inject('ISourceConfigurationReadRepository')
    private readonly sourceReadRepository: ISourceConfigurationReadRepository,
  ) {}

  async execute(
    query: GetSourceByIdQuery,
  ): Promise<GetSourceByIdResponse | null> {
    const readModel = await this.sourceReadRepository.findById(query.sourceId);
    return readModel ? this.toResponse(readModel) : null;
  }

  /**
   * Maps SourceConfigurationReadModel to GetSourceByIdResponse
   */
  private toResponse(
    readModel: SourceConfigurationReadModel,
  ): GetSourceByIdResponse {
    return {
      sourceId: readModel.sourceId,
      name: readModel.name,
      sourceType: readModel.sourceType,
      isActive: readModel.isActive,
      config: readModel.config,
      healthMetrics: {
        successRate: readModel.successRate,
        consecutiveFailures: readModel.consecutiveFailures,
        totalJobs: readModel.totalJobs,
        lastSuccessAt: readModel.lastSuccessAt,
        lastFailureAt: readModel.lastFailureAt,
      },
    };
  }
}
