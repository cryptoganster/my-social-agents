import termSize from 'term-size';

/**
 * CLI Theme Utilities
 *
 * Provides utilities for consistent theming across the CLI:
 * - Black background with white text
 * - Centered content
 * - Full-width background fill
 */

/**
 * Fill line with black background
 *
 * Ensures every line has black background across the entire terminal width
 */
export function fillLine(text: string = ''): string {
  const { columns } = termSize();
  const textLength = text.replace(/\x1b\[[0-9;]*m/g, '').length; // Remove ANSI codes for length calculation
  const padding = ' '.repeat(Math.max(0, columns - textLength));
  return text + padding;
}

/**
 * Center text in terminal
 *
 * Calculates padding to center text horizontally
 */
export function centerText(text: string): string {
  const { columns } = termSize();
  const textLength = text.replace(/\x1b\[[0-9;]*m/g, '').length;
  const padding = ' '.repeat(
    Math.max(0, Math.floor((columns - textLength) / 2)),
  );
  return padding + text;
}

/**
 * Setup terminal theme
 *
 * Sets black background and white text for the entire terminal
 */
export function setupTheme(): void {
  process.stdout.write('\x1b[40m'); // Black background
  process.stdout.write('\x1b[37m'); // White text
  process.stdout.write('\x1b[2J'); // Clear screen
  process.stdout.write('\x1b[H'); // Move cursor to home
}

/**
 * Reset terminal theme
 *
 * Resets to default terminal colors
 */
export function resetTheme(): void {
  process.stdout.write('\x1b[0m'); // Reset all attributes
}
