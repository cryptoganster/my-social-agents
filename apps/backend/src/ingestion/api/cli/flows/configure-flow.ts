import { INestApplicationContext } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { CreateSourceCommand } from '@/ingestion/source/app/commands/create-source/command';
import { CreateSourceResult } from '@/ingestion/source/app/commands/create-source/result';
import { UpdateSourceCommand } from '@/ingestion/source/app/commands/update-source/command';
import { UpdateSourceResult } from '@/ingestion/source/app/commands/update-source/result';
import { SourceTypeEnum } from '@/ingestion/source/domain/value-objects/source-type';
import { TemplateSelectionFlow } from './template-selection-flow';
import { JsonEditorFlow } from './json-editor-flow';
import { FileSystemTemplateLoader } from '@/ingestion/source/infra/templates/file-system-template-loader';
import { JsonTemplateValidator } from '@/ingestion/source/infra/templates/json-template-validator';
import { FlowResult } from '../types';

/**
 * Interactive flow for configuring content sources
 *
 * Handles the complete user interaction for configuring a content source:
 * 1. Prompts for action (create/update)
 * 2. Collects source details (name, type)
 * 3. Handles RSS template selection (for RSS sources)
 * 4. Handles JSON editor integration
 * 5. Collects credentials (optional)
 * 6. Confirms action
 * 7. Executes CreateSourceCommand or UpdateSourceCommand
 * 8. Displays configuration details
 * 9. Handles errors gracefully
 *
 * @param app - NestJS application context
 * @returns Promise<FlowResult> - 'main' to return to menu, 'exit' to quit
 */
export async function configureFlow(
  app: INestApplicationContext,
): Promise<FlowResult> {
  console.log();
  console.log(chalk.blue.bold('⚙️  Configure Content Source'));
  console.log();

  // Step 1: Ask if creating new or updating existing
  const { action } = await inquirer.prompt<{ action: string }>([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: 'Create new source', value: 'create' },
        { name: 'Update existing source', value: 'update' },
        { name: '← Back to main menu', value: 'back' },
      ],
    },
  ]);

  if (action === 'back') {
    return 'main';
  }

  let sourceId: string | undefined;

  // Step 2: If updating, ask for source ID
  if (action === 'update') {
    const response = await inquirer.prompt<{ sourceId: string }>([
      {
        type: 'input',
        name: 'sourceId',
        message: 'Enter the source ID to update:',
        validate: (input: string): string | boolean => {
          if (input.trim().length === 0) {
            return 'Source ID is required';
          }
          return true;
        },
      },
    ]);
    sourceId = response.sourceId;
  }

  // Step 3: Ask for source details
  const { name, type } = await inquirer.prompt<{
    name: string;
    type: SourceTypeEnum;
  }>([
    {
      type: 'input',
      name: 'name',
      message: 'Enter source name:',
      validate: (input: string): string | boolean => {
        if (input.trim().length === 0) {
          return 'Source name is required';
        }
        return true;
      },
    },
    {
      type: 'list',
      name: 'type',
      message: 'Select source type:',
      choices: [
        { name: '🌐 Web Scraper', value: SourceTypeEnum.WEB },
        { name: '📡 RSS Feed', value: SourceTypeEnum.RSS },
        { name: '📱 Social Media', value: SourceTypeEnum.SOCIAL_MEDIA },
        { name: '📄 PDF', value: SourceTypeEnum.PDF },
        { name: '🔍 OCR', value: SourceTypeEnum.OCR },
        { name: '📚 Wikipedia', value: SourceTypeEnum.WIKIPEDIA },
      ],
    },
  ]);

  // Step 4: Handle configuration based on source type
  let config: Record<string, unknown> = {};

  // If RSS Feed, offer template selection
  if (type === SourceTypeEnum.RSS) {
    const templateLoader = new FileSystemTemplateLoader();
    const templateValidator = new JsonTemplateValidator();
    const templateFlow = new TemplateSelectionFlow(templateLoader);
    const editorFlow = new JsonEditorFlow(templateValidator);

    // Execute template selection flow
    const templateConfig = await templateFlow.execute();

    if (templateConfig !== null) {
      // Convert TemplateConfiguration to plain object
      const templateObj: Record<string, unknown> = {
        feedUrl: templateConfig.feedUrl,
        updateInterval: templateConfig.updateInterval,
      };

      if (templateConfig.categories !== undefined) {
        templateObj.categories = templateConfig.categories;
      }

      if (templateConfig.language !== undefined) {
        templateObj.language = templateConfig.language;
      }

      if (templateConfig.maxItems !== undefined) {
        templateObj.maxItems = templateConfig.maxItems;
      }

      if (templateConfig.timeout !== undefined) {
        templateObj.timeout = templateConfig.timeout;
      }

      if (templateConfig.customFields !== undefined) {
        Object.assign(templateObj, templateConfig.customFields);
      }

      // Execute JSON editor flow
      config = await editorFlow.execute(templateObj);

      // Strip metadata before saving to database (Requirement 9.7)
      if ('_metadata' in config) {
        delete config._metadata;
      }
    } else {
      // User declined template, prompt for manual JSON entry
      const { hasConfig } = await inquirer.prompt<{ hasConfig: boolean }>([
        {
          type: 'confirm',
          name: 'hasConfig',
          message: 'Do you want to add configuration (JSON)?',
          default: false,
        },
      ]);

      if (hasConfig) {
        const { configJson } = await inquirer.prompt<{ configJson: string }>([
          {
            type: 'input',
            name: 'configJson',
            message: 'Enter configuration as JSON:',
            validate: (input: string): string | boolean => {
              if (input.trim().length === 0) {
                return true; // Allow empty
              }
              try {
                JSON.parse(input);
                return true;
              } catch {
                return 'Invalid JSON format';
              }
            },
          },
        ]);

        if (configJson.trim().length > 0) {
          config = JSON.parse(configJson) as Record<string, unknown>;
        }
      }
    }
  } else {
    // For non-RSS sources, use the original flow
    const { hasConfig } = await inquirer.prompt<{ hasConfig: boolean }>([
      {
        type: 'confirm',
        name: 'hasConfig',
        message: 'Do you want to add configuration (JSON)?',
        default: false,
      },
    ]);

    if (hasConfig) {
      const { configJson } = await inquirer.prompt<{ configJson: string }>([
        {
          type: 'input',
          name: 'configJson',
          message: 'Enter configuration as JSON:',
          validate: (input: string): string | boolean => {
            if (input.trim().length === 0) {
              return true; // Allow empty
            }
            try {
              JSON.parse(input);
              return true;
            } catch {
              return 'Invalid JSON format';
            }
          },
        },
      ]);

      if (configJson.trim().length > 0) {
        config = JSON.parse(configJson) as Record<string, unknown>;
      }
    }
  }

  // Step 5: Ask for credentials
  const { hasCredentials } = await inquirer.prompt<{ hasCredentials: boolean }>(
    [
      {
        type: 'confirm',
        name: 'hasCredentials',
        message: 'Do you want to add API credentials?',
        default: false,
      },
    ],
  );

  let credentials: string | undefined;
  if (hasCredentials) {
    const response = await inquirer.prompt<{ credentials: string }>([
      {
        type: 'password',
        name: 'credentials',
        message: 'Enter API credentials (will be encrypted):',
        mask: '*',
      },
    ]);
    credentials = response.credentials;
  }

  // Step 6: Ask if source should be active
  const { isActive } = await inquirer.prompt<{ isActive: boolean }>([
    {
      type: 'confirm',
      name: 'isActive',
      message: 'Should this source be active?',
      default: true,
    },
  ]);

  console.log();
  console.log(chalk.gray(`Name: ${name}`));
  console.log(chalk.gray(`Type: ${type}`));
  console.log(chalk.gray(`Active: ${isActive ? 'Yes' : 'No'}`));
  if (sourceId !== undefined) {
    console.log(chalk.gray(`Source ID: ${sourceId}`));
  }
  console.log();

  // Step 7: Confirm action
  const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
    {
      type: 'confirm',
      name: 'confirm',
      message:
        action === 'create' ? 'Create this source?' : 'Update this source?',
      default: true,
    },
  ]);

  if (!confirm) {
    console.log(chalk.yellow('Configuration cancelled'));
    return 'main';
  }

  const commandBus = app.get(CommandBus);

  const spinner = ora({
    text: 'Configuring content source...',
    color: 'magenta',
  }).start();

  try {
    let result: { sourceId: string; isActive: boolean; isNew: boolean };

    if (action === 'create') {
      const command = new CreateSourceCommand(
        type,
        name,
        config,
        credentials,
        isActive,
      );

      const createResult = await commandBus.execute<
        CreateSourceCommand,
        CreateSourceResult
      >(command);

      result = {
        sourceId: createResult.sourceId,
        isActive: createResult.isActive,
        isNew: true,
      };
    } else {
      const command = new UpdateSourceCommand(
        sourceId!,
        type,
        name,
        config,
        credentials,
        isActive,
      );

      const updateResult = await commandBus.execute<
        UpdateSourceCommand,
        UpdateSourceResult
      >(command);

      result = {
        sourceId: updateResult.sourceId,
        isActive: updateResult.isActive,
        isNew: false,
      };
    }

    spinner.succeed(chalk.green('Source configured successfully'));
    console.log();

    // Display configuration details with icons and colors
    console.log(chalk.white.bold('📋 Configuration:'));
    console.log(
      chalk.cyan('  Source ID: ') + chalk.white.bold(result.sourceId),
    );
    console.log(
      chalk.cyan('  Status:    ') +
        (result.isNew
          ? chalk.green.bold('✨ New source created')
          : chalk.yellow.bold('📝 Existing source updated')),
    );
    console.log(
      chalk.cyan('  Active:    ') +
        (result.isActive ? chalk.green.bold('✓ Yes') : chalk.red.bold('✗ No')),
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
    spinner.fail(chalk.red('Configuration failed'));
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
