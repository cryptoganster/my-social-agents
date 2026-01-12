import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { GetJobByIdQuery } from './query';
import { GetJobByIdResponse } from './response';
import { IIngestionJobReadRepository } from '@/ingestion/job/app/queries/repositories/ingestion-job-read';
import { IngestionJobReadModel } from '@/ingestion/job/app/queries/read-models/ingestion-job';

/**
 * GetJobByIdQueryHandler
 *
 * Handles GetJobByIdQuery by retrieving a job from the read repository
 * and mapping it to the query-specific response type.
 *
 * Requirements: 6.1, 6.2
 * Design: Queries - Job Queries
 */
@Injectable()
@QueryHandler(GetJobByIdQuery)
export class GetJobByIdQueryHandler implements IQueryHandler<
  GetJobByIdQuery,
  GetJobByIdResponse | null
> {
  constructor(
    @Inject('IIngestionJobReadRepository')
    private readonly jobReadRepository: IIngestionJobReadRepository,
  ) {}

  async execute(query: GetJobByIdQuery): Promise<GetJobByIdResponse | null> {
    const readModel = await this.jobReadRepository.findById(query.jobId);
    return readModel ? this.toResponse(readModel) : null;
  }

  /**
   * Maps IngestionJobReadModel to GetJobByIdResponse
   */
  private toResponse(readModel: IngestionJobReadModel): GetJobByIdResponse {
    return {
      jobId: readModel.jobId,
      sourceId: readModel.sourceId,
      status: readModel.status,
      scheduledAt: readModel.scheduledAt,
      executedAt: readModel.executedAt,
      completedAt: readModel.completedAt,
      itemsCollected: readModel.itemsCollected,
      duplicatesDetected: readModel.duplicatesDetected,
      errorsEncountered: readModel.errorsEncountered,
      bytesProcessed: readModel.bytesProcessed,
      durationMs: readModel.durationMs,
      errors: readModel.errors,
      sourceConfig: readModel.sourceConfig,
      version: readModel.version,
      createdAt: readModel.createdAt,
      updatedAt: readModel.updatedAt,
    };
  }
}
