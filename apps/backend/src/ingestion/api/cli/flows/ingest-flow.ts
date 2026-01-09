import { INestApplicationContext } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { IngestContentCommand } from '@/ingestion/content/app/commands/ingest-content/command';
import { TypeOrmSourceConfigurationReadRepository } from '@/ingestion/source/infra/persistence/repositories/source-configuration-read';
import { FlowResult } from '../types';

/**
 * Interactive flow for content ingestion
 *
 * Handles the complete user interaction for ingesting content from a source:
 * 1. Loads and displays available sources
 * 2. Prompts for source selection
 * 3. Confirms action
 * 4. Executes IngestContentCommand
 * 5. Displays results with icons and colors
 * 6. Handles errors gracefully
 *
 * @param app - NestJS application context
 * @returns Promise<FlowResult> - 'main' to return to menu, 'exit' to quit
 */
export async function ingestFlow(
  app: INestApplicationContext,
): Promise<FlowResult> {
  console.log();
  console.log(chalk.blue.bold('📥 Content Ingestion'));
  console.log();

  // Step 1: Load available sources
  const readRepo = app.get(TypeOrmSourceConfigurationReadRepository);
  const spinner = ora('Loading available sources...').start();

  let sources;
  try {
    sources = await readRepo.findActive();
    spinner.succeed(chalk.green(`Found ${sources.length} active source(s)`));
  } catch (error) {
    spinner.fail(chalk.red('Failed to load sources'));
    console.log();
    console.log(
      chalk.red.bold('Error: ') +
        chalk.red(error instanceof Error ? error.message : 'Unknown error'),
    );
    console.log();
    return 'main';
  }

  if (sources.length === 0) {
    console.log();
    console.log(chalk.yellow('⚠ No active sources found'));
    console.log(
      chalk.gray(
        'Please configure a source first using the configuration menu',
      ),
    );
    console.log();
    return 'main';
  }

  console.log();

  // Step 2: Ask user to select a source
  const sourceChoices = sources.map((source) => ({
    name: `${getSourceIcon(source.sourceType)} ${source.name} (${source.sourceType})`,
    value: source.sourceId,
    short: source.name,
  }));

  const { sourceId } = await inquirer.prompt<{ sourceId: string }>([
    {
      type: 'list',
      name: 'sourceId',
      message: 'Select a source to ingest from:',
      choices: sourceChoices,
    },
  ]);

  const selectedSource = sources.find((s) => s.sourceId === sourceId);
  console.log();
  console.log(chalk.gray(`Source: ${selectedSource?.name}`));
  console.log(chalk.gray(`Type: ${selectedSource?.sourceType}`));
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

  const ingestionSpinner = ora({
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

    ingestionSpinner.succeed(chalk.green('Content ingestion completed'));
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

    return next as FlowResult;
  } catch (error) {
    ingestionSpinner.fail(chalk.red('Ingestion failed'));
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

    return next as FlowResult;
  }
}

/**
 * Get icon for source type
 */
function getSourceIcon(sourceType: string): string {
  const icons: Record<string, string> = {
    RSS: '📡',
    WEB_SCRAPER: '🌐',
    SOCIAL_MEDIA: '📱',
    PDF: '📄',
    OCR: '📷',
    WIKIPEDIA: '📚',
  };
  return icons[sourceType] || '📦';
}
