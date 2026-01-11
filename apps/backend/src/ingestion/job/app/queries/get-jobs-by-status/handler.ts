import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { GetJobsByStatusQuery, GetJobsByStatusResult } from './query';
import { IIngestionJobReadRepository } from '@/ingestion/job/app/queries/repositories/ingestion-job-read';

/**
 * GetJobsByStatusQueryHandler
 *
 * Handles GetJobsByStatusQuery by retrieving jobs filtered by status with pagination.
 * Returns paginated read models optimized for API responses.
 *
 * Requirements: 6.3
 * Design: Queries - Job Queries
 */
@Injectable()
@QueryHandler(GetJobsByStatusQuery)
export class GetJobsByStatusQueryHandler implements IQueryHandler<
  GetJobsByStatusQuery,
  GetJobsByStatusResult
> {
  constructor(
    @Inject('IIngestionJobReadRepository')
    private readonly jobReadRepository: IIngestionJobReadRepository,
  ) {}

  async execute(query: GetJobsByStatusQuery): Promise<GetJobsByStatusResult> {
    const [jobs, total] = await Promise.all([
      this.jobReadRepository.findByStatus(
        query.status,
        query.limit,
        query.offset,
      ),
      this.jobReadRepository.countByStatus(query.status),
    ]);

    return {
      jobs,
      total,
    };
  }
}
