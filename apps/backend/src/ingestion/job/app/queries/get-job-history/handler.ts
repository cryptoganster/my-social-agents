import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { GetJobHistoryQuery, GetJobHistoryResult } from './query';
import { IIngestionJobReadRepository } from '@/ingestion/job/app/queries/repositories/ingestion-job-read';

/**
 * GetJobHistoryQueryHandler
 *
 * Handles GetJobHistoryQuery by retrieving job execution history for a source.
 * Returns jobs ordered by executedAt DESC (most recent first).
 *
 * Requirements: 6.4
 * Design: Queries - Job Queries
 */
@Injectable()
@QueryHandler(GetJobHistoryQuery)
export class GetJobHistoryQueryHandler implements IQueryHandler<
  GetJobHistoryQuery,
  GetJobHistoryResult
> {
  constructor(
    @Inject('IIngestionJobReadRepository')
    private readonly jobReadRepository: IIngestionJobReadRepository,
  ) {}

  async execute(query: GetJobHistoryQuery): Promise<GetJobHistoryResult> {
    const jobs = await this.jobReadRepository.findBySourceId(
      query.sourceId,
      query.limit,
    );

    return {
      jobs,
      total: jobs.length,
    };
  }
}
