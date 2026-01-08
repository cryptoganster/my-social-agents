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
import { ConfigureSourceCommand } from '@/ingestion/source/app/commands/configure-source/command';
import {
  GetJobHistoryQuery,
  GetJobHistoryResult,
} from '@/ingestion/job/app/queries/get-job-history/query';
import { SourceTypeEnum } from '@/ingestion/source/domain/value-objects/source-type';
import { ISourceConfigurationReadRepository } from '@/ingestion/source/domain/interfaces/repositories/source-configuration-read';
import { SourceConfigurationReadModel } from '@/ingestion/source/domain/read-models/source-configuration';
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
   * Configure a new or existing source
   */
  @Post()
  async configureSource(
    @Body() dto: ConfigureSourceDto,
  ): Promise<{ sourceId: string; isNew: boolean; isActive: boolean }> {
    try {
      this.logger.log(`Configuring source: ${dto.name}`);

      const command = new ConfigureSourceCommand(
        dto.sourceId, // undefined for new sources
        dto.type as SourceTypeEnum,
        dto.name,
        dto.config,
        dto.credentials,
        dto.active !== undefined ? dto.active : true,
      );

      const result = await this.commandBus.execute<
        ConfigureSourceCommand,
        { sourceId: string; isNew: boolean; isActive: boolean }
      >(command);

      this.logger.log(`Source configured successfully: ${result.sourceId}`);

      return {
        sourceId: result.sourceId,
        isNew: result.isNew,
        isActive: result.isActive,
      };
    } catch (error) {
      this.logger.error(
        `Failed to configure source: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
      }

      throw new HttpException(
        'Failed to configure source',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /sources
   * List all active sources
   */
  @Get()
  async listSources(): Promise<SourceConfigurationReadModel[]> {
    try {
      this.logger.debug('Listing active sources');

      const sources = await this.sourceReadRepo.findActive();

      return sources;
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
  ): Promise<GetJobHistoryResult> {
    try {
      this.logger.debug(`Retrieving job history for source: ${sourceId}`);

      const query = new GetJobHistoryQuery(
        sourceId,
        limit ? parseInt(limit, 10) : undefined,
      );

      const result = await this.queryBus.execute<
        GetJobHistoryQuery,
        GetJobHistoryResult
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
