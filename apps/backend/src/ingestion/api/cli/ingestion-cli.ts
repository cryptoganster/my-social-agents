import chalk from 'chalk';
import { displayBanner } from './banner';
import { bootstrap } from './bootstrap';
import { showMainMenu } from './main-menu';

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
 * Run interactive CLI
 *
 * Orchestrates the CLI lifecycle:
 * 1. Display banner
 * 2. Bootstrap NestJS application
 * 3. Show main menu in a loop
 * 4. Handle application shutdown
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
