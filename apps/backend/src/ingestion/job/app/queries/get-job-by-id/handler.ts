import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { GetJobByIdQuery, GetJobByIdResult } from './query';
import { IIngestionJobReadRepository } from '@/ingestion/job/domain/interfaces/repositories/ingestion-job-read';

/**
 * GetJobByIdQueryHandler
 *
 * Handles GetJobByIdQuery by retrieving a job from the read repository.
 * Returns a read model optimized for API responses.
 *
 * Requirements: 6.1, 6.2
 * Design: Queries - Job Queries
 */
@Injectable()
@QueryHandler(GetJobByIdQuery)
export class GetJobByIdQueryHandler implements IQueryHandler<
  GetJobByIdQuery,
  GetJobByIdResult
> {
  constructor(
    @Inject('IIngestionJobReadRepository')
    private readonly jobReadRepository: IIngestionJobReadRepository,
  ) {}

  async execute(query: GetJobByIdQuery): Promise<GetJobByIdResult> {
    return await this.jobReadRepository.findById(query.jobId);
  }
}
