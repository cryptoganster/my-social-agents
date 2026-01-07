import { NestFactory } from '@nestjs/core';
import { INestApplicationContext } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import chalk from 'chalk';
import ora from 'ora';
import figlet from 'figlet';
import inquirer from 'inquirer';
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
 * Display ASCII art banner with 3D effect and gradient colors
 */
function displayBanner(): void {
  const banner = figlet.textSync('CHAIN', {
    font: 'ANSI Shadow',
    horizontalLayout: 'default',
    verticalLayout: 'default',
  });

  const banner2 = figlet.textSync('DECRYPTED', {
    font: 'ANSI Shadow',
    horizontalLayout: 'default',
    verticalLayout: 'default',
  });

  // Apply gradient effect: blue -> purple -> magenta -> red -> orange
  const lines = banner.split('\n');
  const lines2 = banner2.split('\n');

  console.log();

  // CHAIN with blue to cyan gradient
  lines.forEach((line, index) => {
    const ratio = index / Math.max(lines.length - 1, 1);
    if (ratio < 0.5) {
      console.log(chalk.blue.bold(line));
    } else {
      console.log(chalk.cyan.bold(line));
    }
  });

  // DECRYPTED with magenta to red to yellow gradient
  lines2.forEach((line, index) => {
    const ratio = index / Math.max(lines2.length - 1, 1);
    if (ratio < 0.33) {
      console.log(chalk.magenta.bold(line));
    } else if (ratio < 0.66) {
      console.log(chalk.red.bold(line));
    } else {
      console.log(chalk.yellow.bold(line));
    }
  });

  console.log();
  console.log(
    chalk.cyan('  ▓▒░ ') +
      chalk.white.bold('Content Ingestion CLI') +
      chalk.cyan(' ░▒▓  ') +
      chalk.gray('│ ') +
      chalk.green.bold('v1.0.0'),
  );
  console.log(
    chalk.gray('  ⚡ Multi-source cryptocurrency content collection'),
  );
  console.log(chalk.gray('  🔗 Powered by Clean Architecture + DDD + CQRS'));
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
 * Interactive flow for content ingestion
 */
async function ingestFlow(
  app: INestApplicationContext,
): Promise<'main' | 'exit'> {
  console.log();
  console.log(chalk.blue.bold('📥 Content Ingestion'));
  console.log();

  // Step 1: Ask for source ID
  const { sourceId } = await inquirer.prompt<{ sourceId: string }>([
    {
      type: 'input',
      name: 'sourceId',
      message: 'Enter the source ID to ingest from:',
      validate: (input: string): string | boolean => {
        if (input.trim().length === 0) {
          return 'Source ID is required';
        }
        return true;
      },
    },
  ]);

  console.log();
  console.log(chalk.gray(`Source ID: ${sourceId}`));
  console.log();

  // Step 2: Confirm action
  const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Start content ingestion?',
      default: true,
    },
  ]);

  if (!confirm) {
    console.log(chalk.yellow('Ingestion cancelled'));
    return 'main';
  }

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
    console.log();

    // Ask what to do next
    const { next } = await inquirer.prompt<{ next: string }>([
      {
        type: 'list',
        name: 'next',
        message: 'What would you like to do next?',
        choices: [
          { name: '← Back to main menu', value: 'main' },
          { name: '✕ Exit', value: 'exit' },
        ],
      },
    ]);

    return next as 'main' | 'exit';
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

    console.log();

    // Ask what to do next
    const { next } = await inquirer.prompt<{ next: string }>([
      {
        type: 'list',
        name: 'next',
        message: 'What would you like to do next?',
        choices: [
          { name: '← Back to main menu', value: 'main' },
          { name: '✕ Exit', value: 'exit' },
        ],
      },
    ]);

    return next as 'main' | 'exit';
  }
}

/**
 * Interactive flow for scheduling ingestion jobs
 */
async function scheduleFlow(
  app: INestApplicationContext,
): Promise<'main' | 'exit'> {
  console.log();
  console.log(chalk.blue.bold('📅 Schedule Ingestion Job'));
  console.log();

  // Step 1: Ask for source ID
  const { sourceId } = await inquirer.prompt<{ sourceId: string }>([
    {
      type: 'input',
      name: 'sourceId',
      message: 'Enter the source ID to schedule:',
      validate: (input: string): string | boolean => {
        if (input.trim().length === 0) {
          return 'Source ID is required';
        }
        return true;
      },
    },
  ]);

  // Step 2: Ask for schedule time
  const { scheduleOption } = await inquirer.prompt<{ scheduleOption: string }>([
    {
      type: 'list',
      name: 'scheduleOption',
      message: 'When should the job run?',
      choices: [
        { name: 'Now (immediately)', value: 'now' },
        { name: 'Custom date/time', value: 'custom' },
      ],
    },
  ]);

  let scheduledAt = new Date();

  if (scheduleOption === 'custom') {
    const { datetime } = await inquirer.prompt<{ datetime: string }>([
      {
        type: 'input',
        name: 'datetime',
        message:
          'Enter date/time (ISO 8601 format, e.g., 2026-01-07T10:00:00):',
        validate: (input: string): string | boolean => {
          const date = new Date(input);
          if (isNaN(date.getTime())) {
            return 'Invalid date format. Use ISO 8601 format (e.g., 2026-01-07T10:00:00)';
          }
          return true;
        },
      },
    ]);
    scheduledAt = new Date(datetime);
  }

  console.log();
  console.log(chalk.gray(`Source ID: ${sourceId}`));
  console.log(chalk.gray(`Scheduled at: ${scheduledAt.toISOString()}`));
  console.log();

  // Step 3: Confirm action
  const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Schedule this job?',
      default: true,
    },
  ]);

  if (!confirm) {
    console.log(chalk.yellow('Scheduling cancelled'));
    return 'main';
  }

  const commandBus = app.get(CommandBus);

  const spinner = ora({
    text: 'Scheduling ingestion job...',
    color: 'blue',
  }).start();

  try {
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
    console.log();

    // Ask what to do next
    const { next } = await inquirer.prompt<{ next: string }>([
      {
        type: 'list',
        name: 'next',
        message: 'What would you like to do next?',
        choices: [
          { name: '← Back to main menu', value: 'main' },
          { name: '✕ Exit', value: 'exit' },
        ],
      },
    ]);

    return next as 'main' | 'exit';
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

    console.log();

    // Ask what to do next
    const { next } = await inquirer.prompt<{ next: string }>([
      {
        type: 'list',
        name: 'next',
        message: 'What would you like to do next?',
        choices: [
          { name: '← Back to main menu', value: 'main' },
          { name: '✕ Exit', value: 'exit' },
        ],
      },
    ]);

    return next as 'main' | 'exit';
  }
}

/**
 * Interactive flow for configuring content sources
 */
async function configureFlow(
  app: INestApplicationContext,
): Promise<'main' | 'exit'> {
  console.log();
  console.log(chalk.blue.bold('⚙️  Configure Content Source'));
  console.log();

  // Step 1: Ask if creating new or updating existing
  const { action } = await inquirer.prompt<{ action: string }>([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: 'Create new source', value: 'create' },
        { name: 'Update existing source', value: 'update' },
        { name: '← Back to main menu', value: 'back' },
      ],
    },
  ]);

  if (action === 'back') {
    return 'main';
  }

  let sourceId: string | undefined;

  // Step 2: If updating, ask for source ID
  if (action === 'update') {
    const response = await inquirer.prompt<{ sourceId: string }>([
      {
        type: 'input',
        name: 'sourceId',
        message: 'Enter the source ID to update:',
        validate: (input: string): string | boolean => {
          if (input.trim().length === 0) {
            return 'Source ID is required';
          }
          return true;
        },
      },
    ]);
    sourceId = response.sourceId;
  }

  // Step 3: Ask for source details
  const { name, type } = await inquirer.prompt<{
    name: string;
    type: SourceTypeEnum;
  }>([
    {
      type: 'input',
      name: 'name',
      message: 'Enter source name:',
      validate: (input: string): string | boolean => {
        if (input.trim().length === 0) {
          return 'Source name is required';
        }
        return true;
      },
    },
    {
      type: 'list',
      name: 'type',
      message: 'Select source type:',
      choices: [
        { name: '🌐 Web Scraper', value: 'WEB_SCRAPER' },
        { name: '📡 RSS Feed', value: 'RSS_FEED' },
        { name: '📱 Social Media', value: 'SOCIAL_MEDIA' },
        { name: '📄 PDF', value: 'PDF' },
        { name: '🔍 OCR', value: 'OCR' },
        { name: '📚 Wikipedia', value: 'WIKIPEDIA' },
      ],
    },
  ]);

  // Step 4: Ask for optional configuration
  const { hasConfig } = await inquirer.prompt<{ hasConfig: boolean }>([
    {
      type: 'confirm',
      name: 'hasConfig',
      message: 'Do you want to add configuration (JSON)?',
      default: false,
    },
  ]);

  let config: Record<string, unknown> = {};
  if (hasConfig) {
    const { configJson } = await inquirer.prompt<{ configJson: string }>([
      {
        type: 'input',
        name: 'configJson',
        message: 'Enter configuration as JSON:',
        validate: (input: string): string | boolean => {
          if (input.trim().length === 0) {
            return true; // Allow empty
          }
          try {
            JSON.parse(input);
            return true;
          } catch {
            return 'Invalid JSON format';
          }
        },
      },
    ]);

    if (configJson.trim().length > 0) {
      config = JSON.parse(configJson) as Record<string, unknown>;
    }
  }

  // Step 5: Ask for credentials
  const { hasCredentials } = await inquirer.prompt<{ hasCredentials: boolean }>(
    [
      {
        type: 'confirm',
        name: 'hasCredentials',
        message: 'Do you want to add API credentials?',
        default: false,
      },
    ],
  );

  let credentials: string | undefined;
  if (hasCredentials) {
    const response = await inquirer.prompt<{ credentials: string }>([
      {
        type: 'password',
        name: 'credentials',
        message: 'Enter API credentials (will be encrypted):',
        mask: '*',
      },
    ]);
    credentials = response.credentials;
  }

  // Step 6: Ask if source should be active
  const { isActive } = await inquirer.prompt<{ isActive: boolean }>([
    {
      type: 'confirm',
      name: 'isActive',
      message: 'Should this source be active?',
      default: true,
    },
  ]);

  console.log();
  console.log(chalk.gray(`Name: ${name}`));
  console.log(chalk.gray(`Type: ${type}`));
  console.log(chalk.gray(`Active: ${isActive ? 'Yes' : 'No'}`));
  if (sourceId !== undefined) {
    console.log(chalk.gray(`Source ID: ${sourceId}`));
  }
  console.log();

  // Step 7: Confirm action
  const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
    {
      type: 'confirm',
      name: 'confirm',
      message:
        action === 'create' ? 'Create this source?' : 'Update this source?',
      default: true,
    },
  ]);

  if (!confirm) {
    console.log(chalk.yellow('Configuration cancelled'));
    return 'main';
  }

  const commandBus = app.get(CommandBus);

  const spinner = ora({
    text: 'Configuring content source...',
    color: 'magenta',
  }).start();

  try {
    const command = new ConfigureSourceCommand(
      sourceId,
      type,
      name,
      config,
      credentials,
      isActive,
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
    console.log();

    // Ask what to do next
    const { next } = await inquirer.prompt<{ next: string }>([
      {
        type: 'list',
        name: 'next',
        message: 'What would you like to do next?',
        choices: [
          { name: '← Back to main menu', value: 'main' },
          { name: '✕ Exit', value: 'exit' },
        ],
      },
    ]);

    return next as 'main' | 'exit';
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

    console.log();

    // Ask what to do next
    const { next } = await inquirer.prompt<{ next: string }>([
      {
        type: 'list',
        name: 'next',
        message: 'What would you like to do next?',
        choices: [
          { name: '← Back to main menu', value: 'main' },
          { name: '✕ Exit', value: 'exit' },
        ],
      },
    ]);

    return next as 'main' | 'exit';
  }
}

/**
 * Show main menu and handle user selection
 */
async function showMainMenu(
  app: INestApplicationContext,
): Promise<'continue' | 'exit'> {
  console.log();
  console.log(
    chalk.cyan.bold('═══════════════════════════════════════════════'),
  );
  console.log(chalk.white.bold('              MAIN MENU'));
  console.log(
    chalk.cyan.bold('═══════════════════════════════════════════════'),
  );
  console.log();

  const { action } = await inquirer.prompt<{ action: string }>([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: '📥 Ingest content from a source', value: 'ingest' },
        { name: '📅 Schedule an ingestion job', value: 'schedule' },
        { name: '⚙️  Configure a content source', value: 'configure' },
        new inquirer.Separator(),
        { name: '✕ Exit', value: 'exit' },
      ],
    },
  ]);

  if (action === 'exit') {
    return 'exit';
  }

  let result: 'main' | 'exit';

  switch (action) {
    case 'ingest':
      result = await ingestFlow(app);
      break;
    case 'schedule':
      result = await scheduleFlow(app);
      break;
    case 'configure':
      result = await configureFlow(app);
      break;
    default:
      result = 'main';
  }

  if (result === 'exit') {
    return 'exit';
  }

  // Return to main menu
  return 'continue';
}

/**
 * Run interactive CLI
 */
async function runInteractiveCLI(): Promise<void> {
  displayBanner();

  const app = await bootstrap();

  let shouldContinue = true;

  while (shouldContinue) {
    const result = await showMainMenu(app);
    if (result === 'exit') {
      shouldContinue = false;
    }
  }

  console.log();
  console.log(chalk.cyan('👋 Goodbye!'));
  console.log();

  await app.close();
  process.exit(0);
}

/**
 * Run CLI if executed directly
 */
if (require.main === module) {
  runInteractiveCLI().catch((error) => {
    console.error(chalk.red.bold('Fatal error:'), error);
    process.exit(1);
  });
}
