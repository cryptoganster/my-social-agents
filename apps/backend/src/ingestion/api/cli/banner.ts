import chalk from 'chalk';
import figlet from 'figlet';

/**
 * Banner Module
 *
 * Displays ASCII art banner with gradient colors for the CLI.
 * Pure function with no dependencies on other CLI modules.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

/**
 * Display ASCII art banner with 3D effect and gradient colors
 *
 * Displays "CHAIN DECRYPTED" banner with:
 * - CHAIN: Blue to cyan gradient
 * - DECRYPTED: Magenta to red to yellow gradient
 * - Application name and version
 * - Description and architecture info
 *
 * Pure function - only side effect is console output.
 * No dependencies on other modules.
 */
export function displayBanner(): void {
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
