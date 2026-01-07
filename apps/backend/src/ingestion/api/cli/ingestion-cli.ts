import chalk from 'chalk';
import clear from 'clear';
import cliCursor from 'cli-cursor';
import { displayBanner } from './banner';
import { bootstrap } from './bootstrap';
import { showMainMenu } from './main-menu';
import { resetTheme } from './theme';

/**
 * CLI for Content Ingestion
 *
 * Modern CLI with ASCII art banners, spinners, and colored output.
 * Provides command-line interface for:
 * - Ingesting content from sources
 * - Scheduling ingestion jobs
 * - Configuring content sources
 *
 * Features:
 * - White background with black text
 * - Chroma gradient banner
 * - Alternate screen mode (no command history visible)
 * - Clean application-like interface
 * - Centered content
 *
 * Requirements: All
 */

/**
 * Setup terminal for application mode
 *
 * - Clears screen
 * - Hides cursor
 * - Enters alternate screen buffer (if supported)
 * - Sets up cleanup handlers
 */
function setupTerminal(): void {
  // Clear screen and hide cursor
  clear();
  cliCursor.hide();

  // Enter alternate screen buffer (like vim/less)
  // This makes the CLI not show previous terminal history
  process.stdout.write('\x1b[?1049h');

  // Setup cleanup on exit
  const cleanup = (): void => {
    // Show cursor
    cliCursor.show();

    // Reset theme
    resetTheme();

    // Exit alternate screen buffer
    process.stdout.write('\x1b[?1049l');
  };

  // Register cleanup handlers
  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });
}

/**
 * Run interactive CLI
 *
 * Orchestrates the CLI lifecycle:
 * 1. Setup terminal (alternate screen, hide cursor)
 * 2. Display banner
 * 3. Bootstrap NestJS application
 * 4. Show main menu in a loop
 * 5. Handle application shutdown
 * 6. Cleanup terminal
 */
async function runInteractiveCLI(): Promise<void> {
  // Setup terminal for application mode
  setupTerminal();

  // Display banner
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

  // Show cursor before exit
  cliCursor.show();

  await app.close();

  // Reset theme and exit alternate screen buffer
  resetTheme();
  process.stdout.write('\x1b[?1049l');

  process.exit(0);
}

/**
 * Run CLI if executed directly
 */
if (require.main === module) {
  runInteractiveCLI().catch((error) => {
    // Show cursor on error
    cliCursor.show();

    // Reset theme
    resetTheme();

    // Exit alternate screen buffer
    process.stdout.write('\x1b[?1049l');

    console.error(chalk.red.bold('Fatal error:'), error);
    process.exit(1);
  });
}
