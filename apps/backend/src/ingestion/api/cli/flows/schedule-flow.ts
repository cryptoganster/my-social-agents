import { INestApplicationContext } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { ScheduleIngestionJobCommand } from '@/ingestion/job/app/commands/schedule-job/command';
import { FlowResult } from '../types';

/**
 * Interactive flow for scheduling ingestion jobs
 *
 * Handles the complete user interaction for scheduling an ingestion job:
 * 1. Prompts for source ID
 * 2. Prompts for schedule time (now or custom)
 * 3. Confirms action
 * 4. Executes ScheduleIngestionJobCommand
 * 5. Displays job details
 * 6. Handles errors gracefully
 *
 * @param app - NestJS application context
 * @returns Promise<FlowResult> - 'main' to return to menu, 'exit' to quit
 */
export async function scheduleFlow(
  app: INestApplicationContext,
): Promise<FlowResult> {
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

    return next as FlowResult;
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

    return next as FlowResult;
  }
}
