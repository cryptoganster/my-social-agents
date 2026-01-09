import chalk from 'chalk';
import { bootstrap } from './bootstrap';
import { showMainMenu } from './main-menu';

/**
 * CLI for Content Ingestion
 *
 * Simple CLI interface for:
 * - Ingesting content from sources
 * - Scheduling ingestion jobs
 * - Configuring content sources
 *
 * Requirements: All
 */

/**
 * Run interactive CLI
 *
 * Orchestrates the CLI lifecycle:
 * 1. Bootstrap NestJS application
 * 2. Show main menu in a loop
 * 3. Handle application shutdown
 */
async function runInteractiveCLI(): Promise<void> {
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
