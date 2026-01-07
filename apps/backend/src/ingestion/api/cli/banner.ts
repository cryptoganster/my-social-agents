import chalk from 'chalk';
import figlet from 'figlet';
import gradient from 'gradient-string';
import center from 'center-align';
import termSize from 'term-size';
import { fillLine, setupTheme } from './theme';

/**
 * Banner Module
 *
 * Displays ASCII art banner with gradient colors for the CLI.
 * Pure function with no dependencies on other CLI modules.
 *
 * Features:
 * - Centered text
 * - Black background with white text
 * - Chroma gradient banner
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

/**
 * Center a multi-line string based on terminal width
 */
function centerText(text: string): string {
  const { columns } = termSize();
  return center(text, columns);
}

/**
 * Display ASCII art banner with 3D effect and chroma gradient colors
 *
 * Displays "CHAIN DECRYPTED" banner with:
 * - Centered alignment
 * - Black background with white text
 * - Chroma gradient (pink to purple to blue)
 * - Application name and version
 * - Description and architecture info
 *
 * Pure function - only side effect is console output.
 * No dependencies on other modules.
 */
export function displayBanner(): void {
  // Setup black background theme
  setupTheme();

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

  // Create chroma gradient (pink to purple to blue)
  const chromaGradient = gradient([
    '#f72585', // Pink
    '#b5179e', // Magenta
    '#7209b7', // Purple
    '#560bad', // Deep purple
    '#480ca8', // Violet
    '#3a0ca3', // Dark blue-violet
    '#3f37c9', // Blue-violet
    '#4361ee', // Blue
    '#4895ef', // Light blue
    '#4cc9f0', // Cyan
  ]);

  // Fill empty line with black background
  console.log(fillLine());

  // Center and display banners with gradient
  const centeredBanner = centerText(banner);
  const centeredBanner2 = centerText(banner2);

  // Split into lines and fill each line
  centeredBanner.split('\n').forEach((line) => {
    console.log(fillLine(chromaGradient(line)));
  });

  centeredBanner2.split('\n').forEach((line) => {
    console.log(fillLine(chromaGradient(line)));
  });

  console.log(fillLine());

  // Info section centered with white text
  const { columns } = termSize();
  const infoLine1 = '▓▒░ Content Ingestion CLI ░▒▓  │ v1.0.0';
  const infoLine2 = '⚡ Multi-source cryptocurrency content collection';
  const infoLine3 = '🔗 Powered by Clean Architecture + DDD + CQRS';

  const padding1 = ' '.repeat(
    Math.max(0, Math.floor((columns - infoLine1.length) / 2)),
  );
  const padding2 = ' '.repeat(
    Math.max(0, Math.floor((columns - infoLine2.length) / 2)),
  );
  const padding3 = ' '.repeat(
    Math.max(0, Math.floor((columns - infoLine3.length) / 2)),
  );

  const line1 =
    padding1 +
    chalk.cyan('▓▒░ ') +
    chalk.white.bold('Content Ingestion CLI') +
    chalk.cyan(' ░▒▓  ') +
    chalk.gray('│ ') +
    chalk.green.bold('v1.0.0');

  const line2 =
    padding2 + chalk.white('⚡ Multi-source cryptocurrency content collection');
  const line3 =
    padding3 + chalk.white('🔗 Powered by Clean Architecture + DDD + CQRS');

  console.log(fillLine(line1));
  console.log(fillLine(line2));
  console.log(fillLine(line3));
  console.log(fillLine());
}
