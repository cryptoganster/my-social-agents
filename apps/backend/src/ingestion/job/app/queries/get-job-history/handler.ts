import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { GetJobHistoryQuery } from './query';
import { GetJobHistoryResponse, JobHistoryItemResponse } from './response';
import { IIngestionJobReadRepository } from '@/ingestion/job/app/queries/repositories/ingestion-job-read';
import { IngestionJobReadModel } from '@/ingestion/job/app/queries/read-models/ingestion-job';

/**
 * GetJobHistoryQueryHandler
 *
 * Handles GetJobHistoryQuery by retrieving job execution history for a source.
 * Returns jobs ordered by executedAt DESC (most recent first).
 * Maps ReadModels to query-specific Response types.
 *
 * Requirements: 6.4
 * Design: Queries - Job Queries
 */
@Injectable()
@QueryHandler(GetJobHistoryQuery)
export class GetJobHistoryQueryHandler implements IQueryHandler<
  GetJobHistoryQuery,
  GetJobHistoryResponse
> {
  constructor(
    @Inject('IIngestionJobReadRepository')
    private readonly jobReadRepository: IIngestionJobReadRepository,
  ) {}

  async execute(query: GetJobHistoryQuery): Promise<GetJobHistoryResponse> {
    const readModels = await this.jobReadRepository.findBySourceId(
      query.sourceId,
      query.limit,
    );

    return {
      jobs: readModels.map((rm) => this.toJobResponse(rm)),
      total: readModels.length,
    };
  }

  /**
   * Maps IngestionJobReadModel to JobHistoryItemResponse
   */
  private toJobResponse(
    readModel: IngestionJobReadModel,
  ): JobHistoryItemResponse {
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
