import { NestFactory } from '@nestjs/core';
import { INestApplicationContext } from '@nestjs/common';
import chalk from 'chalk';
import ora from 'ora';
import { AppModule } from '../../../app.module';

/**
 * Initialize NestJS application context for CLI
 *
 * Displays loading spinner during initialization and handles errors gracefully.
 *
 * @returns Promise<INestApplicationContext> - Initialized NestJS application context
 * @throws Error if initialization fails
 */
export async function bootstrap(): Promise<INestApplicationContext> {
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
