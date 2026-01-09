import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ScheduleJobCommand } from '@/ingestion/job/app/commands/schedule-job/command';
import {
  GetJobsByStatusQuery,
  GetJobsByStatusResult,
} from '@/ingestion/job/app/queries/get-jobs-by-status/query';
import { IIngestionJobReadRepository } from '@/ingestion/job/domain/interfaces/repositories/ingestion-job-read';
import { IngestionJobReadModel } from '@/ingestion/job/domain/read-models/ingestion-job';
import { ScheduleJobDto } from '../dto/schedule-job.dto';

/**
 * REST Controller for Ingestion Jobs
 *
 * Handles HTTP requests for:
 * - Scheduling ingestion jobs (POST /ingestion/jobs)
 * - Retrieving job details (GET /ingestion/jobs/:id)
 * - Listing jobs by status (GET /ingestion/jobs?status=completed)
 *
 * Follows Clean Architecture:
 * - Depends only on Application layer (CommandBus, QueryBus)
 * - Uses domain interface for read operations (not concrete implementation)
 * - Maps domain errors to HTTP status codes
 *
 * Requirements: 1.1, 1.2, 6.1-6.4
 */
@Controller('ingestion/jobs')
export class IngestionJobsController {
  private readonly logger = new Logger(IngestionJobsController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @Inject('IIngestionJobReadRepository')
    private readonly jobReadRepo: IIngestionJobReadRepository,
  ) {}

  /**
   * POST /ingestion/jobs
   * Schedule a new ingestion job
   */
  @Post()
  async scheduleJob(
    @Body() dto: ScheduleJobDto,
  ): Promise<{ jobId: string; sourceId: string; scheduledAt: string }> {
    try {
      this.logger.log(`Scheduling job for source: ${dto.sourceId}`);

      const scheduledAt =
        dto.scheduledAt !== undefined && dto.scheduledAt.length > 0
          ? new Date(dto.scheduledAt)
          : new Date();

      const command = new ScheduleJobCommand(dto.sourceId, scheduledAt);

      const result = await this.commandBus.execute<
        ScheduleJobCommand,
        { jobId: string; sourceId: string; scheduledAt: Date }
      >(command);

      this.logger.log(`Job scheduled successfully: ${result.jobId}`);

      return {
        jobId: result.jobId,
        sourceId: result.sourceId,
        scheduledAt: result.scheduledAt.toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to schedule job: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Map domain errors to HTTP status codes
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          throw new HttpException('Source not found', HttpStatus.NOT_FOUND);
        }

        if (
          error.message.includes('invalid') ||
          error.message.includes('Invalid')
        ) {
          throw new HttpException(
            `Invalid input: ${error.message}`,
            HttpStatus.BAD_REQUEST,
          );
        }

        if (error.message.includes('inactive')) {
          throw new HttpException('Source is inactive', HttpStatus.BAD_REQUEST);
        }
      }

      throw new HttpException(
        'Failed to schedule job',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /ingestion/jobs
   * List jobs filtered by status with pagination
   * Query params: status (required), limit (optional), offset (optional)
   */
  @Get()
  async getJobsByStatus(
    @Query('status') status: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<GetJobsByStatusResult> {
    try {
      if (!status) {
        throw new HttpException(
          'Status query parameter is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.debug(`Retrieving jobs with status: ${status}`);

      const query = new GetJobsByStatusQuery(
        status,
        limit ? parseInt(limit, 10) : undefined,
        offset ? parseInt(offset, 10) : undefined,
      );

      const result = await this.queryBus.execute<
        GetJobsByStatusQuery,
        GetJobsByStatusResult
      >(query);

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get jobs by status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to retrieve jobs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /ingestion/jobs/:id
   * Retrieve job details by ID
   */
  @Get(':id')
  async getJob(@Param('id') jobId: string): Promise<IngestionJobReadModel> {
    try {
      this.logger.debug(`Retrieving job: ${jobId}`);

      const job = await this.jobReadRepo.findById(jobId);

      if (!job) {
        throw new HttpException('Job not found', HttpStatus.NOT_FOUND);
      }

      return job;
    } catch (error) {
      this.logger.error(
        `Failed to get job: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to retrieve job',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
