import { INestApplicationContext } from '@nestjs/common';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { MenuAction } from './types';
import { ingestFlow, scheduleFlow, configureFlow } from './flows';

/**
 * Show main menu and handle user selection
 *
 * Displays the main menu with available operations and delegates
 * to the appropriate flow based on user selection.
 *
 * @param app - NestJS application context
 * @returns Promise<MenuAction> - 'continue' to show menu again, 'exit' to quit
 */
export async function showMainMenu(
  app: INestApplicationContext,
): Promise<MenuAction> {
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
