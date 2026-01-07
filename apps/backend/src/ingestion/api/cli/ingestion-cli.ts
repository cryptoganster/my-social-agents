import { Command } from 'commander';
import { NestFactory } from '@nestjs/core';
import { INestApplicationContext } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import chalk from 'chalk';
import ora from 'ora';
import figlet from 'figlet';
import { AppModule } from '../../../app.module';
import { IngestContentCommand } from '@/ingestion/content/app/commands/ingest-content/command';
import { ScheduleIngestionJobCommand } from '@/ingestion/job/app/commands/schedule-job/command';
import { ConfigureSourceCommand } from '@/ingestion/source/app/commands/configure-source/command';
import { SourceTypeEnum } from '@/ingestion/source/domain/value-objects/source-type';

/**
 * CLI for Content Ingestion
 *
 * Modern CLI with ASCII art banners, spinners, and colored output.
 * Provides command-line interface for:
 * - Ingesting content from sources
 * - Scheduling ingestion jobs
 * - Configuring content sources
 *
 * Requirements: All
 */

/**
 * Display ASCII art banner
 */
function displayBanner(): void {
  const banner = figlet.textSync('ChainDecrypted', {
    font: 'Standard',
    horizontalLayout: 'default',
    verticalLayout: 'default',
  });

  console.log(chalk.cyan(banner));
  console.log(chalk.gray('━'.repeat(80)));
  console.log(
    chalk.white.bold('  Content Ingestion CLI') +
      chalk.gray(' • ') +
      chalk.green('v1.0.0'),
  );
  console.log(chalk.gray('  Multi-source cryptocurrency content collection'));
  console.log(chalk.gray('━'.repeat(80)));
  console.log();
}

/**
 * Initialize NestJS application context for CLI
 */
async function bootstrap(): Promise<INestApplicationContext> {
  const spinner = ora({
    text: 'Initializing application context...',
    color: 'cyan',
  }).start();

  try {
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false, // Disable default logger for cleaner output
    });

    spinner.succeed(chalk.green('Application context initialized'));
    return app;
  } catch (error) {
    spinner.fail(chalk.red('Failed to initialize application'));
    throw error;
  }
}

/**
 * Ingest command - Trigger content ingestion from a source
 */
async function ingestCommand(sourceId: string): Promise<void> {
  displayBanner();

  console.log(chalk.blue.bold('📥 Content Ingestion'));
  console.log(chalk.gray(`Source ID: ${sourceId}`));
  console.log();

  const app = await bootstrap();
  const commandBus = app.get(CommandBus);

  const spinner = ora({
    text: 'Collecting content from source...',
    color: 'yellow',
  }).start();

  try {
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

    spinner.succeed(chalk.green('Content ingestion completed'));
    console.log();

    // Display results with icons and colors
    console.log(chalk.white.bold('📊 Results:'));
    console.log(
      chalk.cyan('  ✓ Items collected:     ') +
        chalk.white.bold(result.itemsCollected.toString()),
    );
    console.log(
      chalk.green('  ✓ Items persisted:     ') +
        chalk.white.bold(result.itemsPersisted.toString()),
    );
    console.log(
      chalk.yellow('  ⚠ Duplicates detected: ') +
        chalk.white.bold(result.duplicatesDetected.toString()),
    );
    console.log(
      chalk.magenta('  ⚠ Validation errors:   ') +
        chalk.white.bold(result.validationErrors.toString()),
    );

    if (result.errors.length > 0) {
      console.log();
      console.log(
        chalk.red.bold(`❌ Errors encountered: ${result.errors.length}`),
      );
      result.errors.forEach((error, index: number) => {
        console.log(chalk.red(`  ${index + 1}. ${error.message}`));
      });
    }

    console.log();
    console.log(chalk.green.bold('✨ Done!'));

    await app.close();
    process.exit(0);
  } catch (error) {
    spinner.fail(chalk.red('Ingestion failed'));
    console.log();
    console.log(
      chalk.red.bold('Error: ') +
        chalk.red(error instanceof Error ? error.message : 'Unknown error'),
    );

    if (
      error instanceof Error &&
      error.stack !== null &&
      error.stack !== undefined &&
      error.stack !== ''
    ) {
      console.log();
      console.log(chalk.gray('Stack trace:'));
      console.log(chalk.gray(error.stack));
    }

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
  displayBanner();

  console.log(chalk.blue.bold('📅 Schedule Ingestion Job'));
  console.log(chalk.gray(`Source ID: ${sourceId}`));
  console.log();

  const app = await bootstrap();
  const commandBus = app.get(CommandBus);

  const spinner = ora({
    text: 'Scheduling ingestion job...',
    color: 'blue',
  }).start();

  try {
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

    spinner.succeed(chalk.green('Job scheduled successfully'));
    console.log();

    // Display job details with icons and colors
    console.log(chalk.white.bold('📋 Job Details:'));
    console.log(
      chalk.cyan('  Job ID:       ') + chalk.white.bold(result.jobId),
    );
    console.log(
      chalk.cyan('  Source ID:    ') + chalk.white.bold(result.sourceId),
    );
    console.log(
      chalk.cyan('  Scheduled at: ') +
        chalk.white.bold(result.scheduledAt.toISOString()),
    );

    console.log();
    console.log(chalk.green.bold('✨ Done!'));

    await app.close();
    process.exit(0);
  } catch (error) {
    spinner.fail(chalk.red('Scheduling failed'));
    console.log();
    console.log(
      chalk.red.bold('Error: ') +
        chalk.red(error instanceof Error ? error.message : 'Unknown error'),
    );

    if (
      error instanceof Error &&
      error.stack !== null &&
      error.stack !== undefined &&
      error.stack !== ''
    ) {
      console.log();
      console.log(chalk.gray('Stack trace:'));
      console.log(chalk.gray(error.stack));
    }

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
  displayBanner();

  console.log(chalk.blue.bold('⚙️  Configure Content Source'));
  console.log(chalk.gray(`Type: ${options.type}`));
  console.log(chalk.gray(`Name: ${options.name}`));
  console.log();

  const app = await bootstrap();
  const commandBus = app.get(CommandBus);

  const spinner = ora({
    text: 'Configuring content source...',
    color: 'magenta',
  }).start();

  try {
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
        spinner.fail(chalk.red('Invalid JSON in --config option'));
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

    spinner.succeed(chalk.green('Source configured successfully'));
    console.log();

    // Display configuration details with icons and colors
    console.log(chalk.white.bold('📋 Configuration:'));
    console.log(
      chalk.cyan('  Source ID: ') + chalk.white.bold(result.sourceId),
    );
    console.log(
      chalk.cyan('  Status:    ') +
        (result.isNew
          ? chalk.green.bold('✨ New source created')
          : chalk.yellow.bold('📝 Existing source updated')),
    );
    console.log(
      chalk.cyan('  Active:    ') +
        (result.isActive ? chalk.green.bold('✓ Yes') : chalk.red.bold('✗ No')),
    );

    console.log();
    console.log(chalk.green.bold('✨ Done!'));

    await app.close();
    process.exit(0);
  } catch (error) {
    spinner.fail(chalk.red('Configuration failed'));
    console.log();
    console.log(
      chalk.red.bold('Error: ') +
        chalk.red(error instanceof Error ? error.message : 'Unknown error'),
    );

    if (
      error instanceof Error &&
      error.stack !== null &&
      error.stack !== undefined &&
      error.stack !== ''
    ) {
      console.log();
      console.log(chalk.gray('Stack trace:'));
      console.log(chalk.gray(error.stack));
    }

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
    .description(
      chalk.cyan('CLI for content ingestion operations') +
        '\n' +
        chalk.gray('  Multi-source cryptocurrency content collection'),
    )
    .version('1.0.0', '-v, --version', 'Display version number')
    .helpOption('-h, --help', 'Display help information');

  // Ingest command
  program
    .command('ingest')
    .description(
      chalk.yellow('📥 Ingest content from a configured source') +
        '\n' +
        chalk.gray(
          '  Collects and processes content from the specified source',
        ),
    )
    .argument('<source-id>', 'ID of the source to ingest from')
    .action(ingestCommand);

  // Schedule command
  program
    .command('schedule')
    .description(
      chalk.blue('📅 Schedule an ingestion job') +
        '\n' +
        chalk.gray('  Creates a scheduled job for future content ingestion'),
    )
    .argument('<source-id>', 'ID of the source to schedule')
    .option(
      '--at <datetime>',
      'Schedule for specific datetime (ISO 8601 format)',
    )
    .action(scheduleCommand);

  // Configure command
  program
    .command('configure')
    .description(
      chalk.magenta('⚙️  Configure a content source') +
        '\n' +
        chalk.gray('  Create or update a content source configuration'),
    )
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
