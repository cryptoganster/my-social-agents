import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateSourceCommand } from '@/ingestion/source/app/commands/create-source/command';
import { CreateSourceResult } from '@/ingestion/source/app/commands/create-source/result';
import { UpdateSourceCommand } from '@/ingestion/source/app/commands/update-source/command';
import { UpdateSourceResult } from '@/ingestion/source/app/commands/update-source/result';
import {
  GetJobHistoryQuery,
  GetJobHistoryResponse,
} from '@/ingestion/job/app/queries/get-job-history/query';
import { GetSourceByIdResponse } from '@/ingestion/source/app/queries/get-source-by-id/response';
import { ISourceConfigurationReadRepository } from '@/ingestion/source/app/queries/repositories/source-configuration-read';
import { SourceTypeEnum } from '@/ingestion/source/domain/value-objects/source-type';
import { ConfigureSourceDto } from '../dto/configure-source.dto';

/**
 * REST Controller for Source Configuration
 *
 * Handles HTTP requests for:
 * - Configuring sources (POST /sources)
 * - Listing active sources (GET /sources)
 * - Retrieving job history for a source (GET /sources/:id/jobs)
 *
 * Follows Clean Architecture:
 * - Depends only on Application layer (CommandBus, QueryBus)
 * - Uses domain interface for read operations (not concrete implementation)
 * - Maps domain errors to HTTP status codes
 *
 * Requirements: 6.4
 */
@Controller('sources')
export class SourcesController {
  private readonly logger = new Logger(SourcesController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @Inject('ISourceConfigurationReadRepository')
    private readonly sourceReadRepo: ISourceConfigurationReadRepository,
  ) {}

  /**
   * POST /sources
   * Create a new source configuration
   */
  @Post()
  async createSource(
    @Body() dto: ConfigureSourceDto,
  ): Promise<{ sourceId: string; isActive: boolean }> {
    try {
      this.logger.log(`Creating source: ${dto.name}`);

      const command = new CreateSourceCommand(
        dto.type as SourceTypeEnum,
        dto.name,
        dto.config,
        dto.credentials,
        dto.active !== undefined ? dto.active : true,
      );

      const result = await this.commandBus.execute<
        CreateSourceCommand,
        CreateSourceResult
      >(command);

      this.logger.log(`Source created successfully: ${result.sourceId}`);

      return {
        sourceId: result.sourceId,
        isActive: result.isActive,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create source: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (error instanceof Error) {
        if (
          error.message.includes('invalid') ||
          error.message.includes('Invalid')
        ) {
          throw new HttpException(
            `Invalid input: ${error.message}`,
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      throw new HttpException(
        'Failed to create source',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * PUT /sources/:id
   * Update an existing source configuration
   */
  @Put(':id')
  async updateSource(
    @Param('id') sourceId: string,
    @Body() dto: ConfigureSourceDto,
  ): Promise<{ sourceId: string; isActive: boolean }> {
    try {
      this.logger.log(`Updating source: ${sourceId}`);

      const command = new UpdateSourceCommand(
        sourceId,
        dto.type as SourceTypeEnum,
        dto.name,
        dto.config,
        dto.credentials,
        dto.active,
      );

      const result = await this.commandBus.execute<
        UpdateSourceCommand,
        UpdateSourceResult
      >(command);

      this.logger.log(`Source updated successfully: ${result.sourceId}`);

      return {
        sourceId: result.sourceId,
        isActive: result.isActive,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update source: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

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
      }

      throw new HttpException(
        'Failed to update source',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /sources
   * List all active sources
   */
  @Get()
  async listSources(): Promise<GetSourceByIdResponse[]> {
    try {
      this.logger.debug('Listing active sources');

      // TODO: This should use a dedicated query (e.g., GetActiveSourcesQuery)
      // For now, we're using the repository directly
      const sources = await this.sourceReadRepo.findActive();

      // Map ReadModel to Response (temporary until repository is updated)
      return sources.map((source) => ({
        sourceId: source.sourceId,
        name: source.name,
        sourceType: source.sourceType,
        isActive: source.isActive,
        config: source.config,
        healthMetrics: {
          successRate: source.successRate,
          consecutiveFailures: source.consecutiveFailures,
          totalJobs: source.totalJobs,
          lastSuccessAt: source.lastSuccessAt,
          lastFailureAt: source.lastFailureAt,
        },
      }));
    } catch (error) {
      this.logger.error(
        `Failed to list sources: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new HttpException(
        'Failed to list sources',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /sources/:id/jobs
   * Retrieve job execution history for a specific source
   * Query params: limit (optional)
   */
  @Get(':id/jobs')
  async getJobHistory(
    @Param('id') sourceId: string,
    @Query('limit') limit?: string,
  ): Promise<GetJobHistoryResponse> {
    try {
      this.logger.debug(`Retrieving job history for source: ${sourceId}`);

      const query = new GetJobHistoryQuery(
        sourceId,
        limit ? parseInt(limit, 10) : undefined,
      );

      const result = await this.queryBus.execute<
        GetJobHistoryQuery,
        GetJobHistoryResponse
      >(query);

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get job history: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new HttpException(
        'Failed to retrieve job history',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
