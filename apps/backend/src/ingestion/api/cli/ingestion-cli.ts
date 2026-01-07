import { Command } from 'commander';
import { NestFactory } from '@nestjs/core';
import { INestApplicationContext } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { AppModule } from '../../../app.module';
import { IngestContentCommand } from '@/ingestion/content/app/commands/ingest-content/command';
import { ScheduleIngestionJobCommand } from '@/ingestion/job/app/commands/schedule-job/command';
import { ConfigureSourceCommand } from '@/ingestion/source/app/commands/configure-source/command';
import { SourceTypeEnum } from '@/ingestion/source/domain/value-objects/source-type';

/**
 * CLI for Content Ingestion
 *
 * Provides command-line interface for:
 * - Ingesting content from sources
 * - Scheduling ingestion jobs
 * - Configuring content sources
 *
 * Requirements: All
 */

const logger = new Logger('IngestionCLI');

/**
 * Initialize NestJS application context for CLI
 */
async function bootstrap(): Promise<INestApplicationContext> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  return app;
}

/**
 * Ingest command - Trigger content ingestion from a source
 */
async function ingestCommand(sourceId: string): Promise<void> {
  const app = await bootstrap();
  const commandBus = app.get(CommandBus);

  try {
    logger.log(`Starting content ingestion for source: ${sourceId}`);

    const command = new IngestContentCommand(sourceId);
    const result = await commandBus.execute<
      IngestContentCommand,
      {
        itemsCollected: number;
        itemsPersisted: number;
        duplicatesDetected: number;
        validationErrors: number;
        errors: Array<{ message: string }>;
      }
    >(command);

    logger.log('Ingestion completed successfully');
    logger.log(`Items collected: ${result.itemsCollected}`);
    logger.log(`Items persisted: ${result.itemsPersisted}`);
    logger.log(`Duplicates detected: ${result.duplicatesDetected}`);
    logger.log(`Validation errors: ${result.validationErrors}`);

    if (result.errors.length > 0) {
      logger.warn(`Errors encountered: ${result.errors.length}`);
      result.errors.forEach((error, index: number) => {
        logger.warn(`Error ${index + 1}: ${error.message}`);
      });
    }

    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error(
      `Ingestion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? error.stack : undefined,
    );
    await app.close();
    process.exit(1);
  }
}

/**
 * Schedule command - Schedule an ingestion job
 */
async function scheduleCommand(
  sourceId: string,
  options: { at?: string },
): Promise<void> {
  const app = await bootstrap();
  const commandBus = app.get(CommandBus);

  try {
    logger.log(`Scheduling ingestion job for source: ${sourceId}`);

    const scheduledAt =
      options.at !== undefined && options.at.length > 0
        ? new Date(options.at)
        : new Date();

    const command = new ScheduleIngestionJobCommand(
      sourceId,
      scheduledAt,
      undefined, // jobId will be auto-generated
    );

    const result = await commandBus.execute<
      ScheduleIngestionJobCommand,
      { jobId: string; sourceId: string; scheduledAt: Date }
    >(command);

    logger.log('Job scheduled successfully');
    logger.log(`Job ID: ${result.jobId}`);
    logger.log(`Source ID: ${result.sourceId}`);
    logger.log(`Scheduled at: ${result.scheduledAt.toISOString()}`);

    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error(
      `Scheduling failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? error.stack : undefined,
    );
    await app.close();
    process.exit(1);
  }
}

/**
 * Configure command - Configure a content source
 */
async function configureCommand(options: {
  sourceId?: string;
  type: string;
  name: string;
  config?: string;
  credentials?: string;
  active?: string;
}): Promise<void> {
  const app = await bootstrap();
  const commandBus = app.get(CommandBus);

  try {
    logger.log('Configuring content source');

    // Parse config JSON if provided
    let config: Record<string, unknown> = {};
    if (
      options.config !== undefined &&
      options.config !== null &&
      options.config.length > 0
    ) {
      try {
        config = JSON.parse(options.config) as Record<string, unknown>;
      } catch {
        throw new Error('Invalid JSON in --config option');
      }
    }

    const command = new ConfigureSourceCommand(
      options.sourceId, // undefined for new sources
      options.type as SourceTypeEnum,
      options.name,
      config,
      options.credentials,
      options.active !== undefined && options.active.length > 0
        ? options.active === 'true'
        : true,
    );

    const result = await commandBus.execute<
      ConfigureSourceCommand,
      { sourceId: string; isNew: boolean; isActive: boolean }
    >(command);

    logger.log('Source configured successfully');
    logger.log(`Source ID: ${result.sourceId}`);
    logger.log(`Is new: ${result.isNew}`);
    logger.log(`Is active: ${result.isActive}`);

    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error(
      `Configuration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? error.stack : undefined,
    );
    await app.close();
    process.exit(1);
  }
}

/**
 * Main CLI program
 */
export function createIngestionCLI(): Command {
  const program = new Command();

  program
    .name('ingestion')
    .description('CLI for content ingestion operations')
    .version('1.0.0');

  // Ingest command
  program
    .command('ingest')
    .description('Ingest content from a configured source')
    .argument('<source-id>', 'ID of the source to ingest from')
    .action(ingestCommand);

  // Schedule command
  program
    .command('schedule')
    .description('Schedule an ingestion job')
    .argument('<source-id>', 'ID of the source to schedule')
    .option(
      '--at <datetime>',
      'Schedule for specific datetime (ISO 8601 format)',
    )
    .action(scheduleCommand);

  // Configure command
  program
    .command('configure')
    .description('Configure a content source')
    .requiredOption('--name <name>', 'Name of the source')
    .requiredOption(
      '--type <type>',
      'Source type (WEB_SCRAPER, RSS_FEED, SOCIAL_MEDIA, PDF, OCR, WIKIPEDIA)',
    )
    .option('--config <json>', 'Source configuration as JSON string')
    .option(
      '--credentials <credentials>',
      'API credentials (will be encrypted)',
    )
    .option(
      '--active <boolean>',
      'Whether source is active (true/false)',
      'true',
    )
    .option('--source-id <id>', 'Source ID (for updates)')
    .action(configureCommand);

  return program;
}

/**
 * Run CLI if executed directly
 */
if (require.main === module) {
  const program = createIngestionCLI();
  program.parse(process.argv);
}
