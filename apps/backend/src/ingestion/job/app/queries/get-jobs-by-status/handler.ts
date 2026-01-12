import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { GetJobsByStatusQuery } from './query';
import { GetJobsByStatusResponse, JobByStatusItemResponse } from './response';
import { IIngestionJobReadRepository } from '@/ingestion/job/app/queries/repositories/ingestion-job-read';
import { IngestionJobReadModel } from '@/ingestion/job/app/queries/read-models/ingestion-job';

/**
 * GetJobsByStatusQueryHandler
 *
 * Handles GetJobsByStatusQuery by retrieving jobs filtered by status with pagination.
 * Maps ReadModels to query-specific Response types.
 *
 * Requirements: 6.3
 * Design: Queries - Job Queries
 */
@Injectable()
@QueryHandler(GetJobsByStatusQuery)
export class GetJobsByStatusQueryHandler implements IQueryHandler<
  GetJobsByStatusQuery,
  GetJobsByStatusResponse
> {
  constructor(
    @Inject('IIngestionJobReadRepository')
    private readonly jobReadRepository: IIngestionJobReadRepository,
  ) {}

  async execute(query: GetJobsByStatusQuery): Promise<GetJobsByStatusResponse> {
    const [readModels, total] = await Promise.all([
      this.jobReadRepository.findByStatus(
        query.status,
        query.limit,
        query.offset,
      ),
      this.jobReadRepository.countByStatus(query.status),
    ]);

    return {
      jobs: readModels.map((rm) => this.toJobResponse(rm)),
      total,
    };
  }

  /**
   * Maps IngestionJobReadModel to JobByStatusItemResponse
   */
  private toJobResponse(
    readModel: IngestionJobReadModel,
  ): JobByStatusItemResponse {
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
      createdAt: readModel.createdAt,
      updatedAt: readModel.updatedAt,
    };
  }
}
