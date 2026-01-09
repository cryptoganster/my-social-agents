import inquirer from 'inquirer';
import chalk from 'chalk';
import { ITemplateValidator } from '@/ingestion/source/domain/interfaces/templates/template-validator';

/**
 * JsonEditorFlow
 *
 * Interactive CLI flow for editing JSON configurations.
 * Allows users to edit template JSON, validates syntax and schema,
 * displays errors, and allows retry on validation failure.
 *
 * Requirements: 4.7, 4.8, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8
 */
export class JsonEditorFlow {
  constructor(private readonly validator: ITemplateValidator) {}

  /**
   * Executes the JSON editor flow
   * Returns the edited and validated configuration or the original if user declines editing
   * Requirement: 4.7, 4.8, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8
   */
  async execute(
    initialConfig: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    let currentConfig = initialConfig;
    let shouldContinue = true;

    while (shouldContinue) {
      // Step 1: Ask if user wants to edit
      const { wantsToEdit } = await inquirer.prompt<{ wantsToEdit: boolean }>([
        {
          type: 'confirm',
          name: 'wantsToEdit',
          message: 'Do you want to edit this configuration?',
          default: false,
        },
      ]);

      if (!wantsToEdit) {
        // User is satisfied with current configuration
        break;
      }

      // Step 2: Display current JSON
      console.log();
      console.log(chalk.cyan.bold('Current configuration:'));
      console.log();
      console.log(chalk.gray(JSON.stringify(currentConfig, null, 2)));
      console.log();

      // Step 3: Prompt for edited JSON
      const { editedJson } = await inquirer.prompt<{ editedJson: string }>([
        {
          type: 'editor',
          name: 'editedJson',
          message: 'Edit the JSON configuration:',
          default: JSON.stringify(currentConfig, null, 2),
        },
      ]);

      // Step 4: Validate JSON syntax
      let parsedJson: Record<string, unknown>;
      try {
        parsedJson = JSON.parse(editedJson) as Record<string, unknown>;
      } catch (error) {
        console.log();
        console.log(chalk.red.bold('❌ Invalid JSON syntax'));
        console.log(
          chalk.red(
            error instanceof Error ? error.message : 'Failed to parse JSON',
          ),
        );
        console.log();

        // Ask if user wants to retry
        const { retry } = await inquirer.prompt<{ retry: boolean }>([
          {
            type: 'confirm',
            name: 'retry',
            message: 'Would you like to try again?',
            default: true,
          },
        ]);

        if (!retry) {
          // Keep current configuration
          break;
        }

        // Continue loop to retry
        continue;
      }

      // Step 5: Validate against schema
      const validationResult = this.validator.validate(parsedJson);

      if (!validationResult.isValid) {
        console.log();
        console.log(chalk.red.bold('❌ Validation failed'));
        console.log();
        console.log(chalk.red('The following errors were found:'));
        validationResult.errors.forEach((error, index) => {
          console.log(chalk.red(`  ${index + 1}. ${error}`));
        });
        console.log();

        // Ask if user wants to retry
        const { retry } = await inquirer.prompt<{ retry: boolean }>([
          {
            type: 'confirm',
            name: 'retry',
            message: 'Would you like to fix these errors?',
            default: true,
          },
        ]);

        if (!retry) {
          // Keep current configuration
          break;
        }

        // Update current config with the edited (but invalid) version
        // so user can see their changes and fix them
        currentConfig = parsedJson;

        // Continue loop to retry
        continue;
      }

      // Step 6: Validation passed, update current config
      currentConfig = parsedJson;

      // Step 7: Show final confirmation
      console.log();
      console.log(chalk.green.bold('✓ Configuration validated successfully'));
      console.log();
      console.log(chalk.cyan.bold('Final configuration:'));
      console.log();
      console.log(chalk.gray(JSON.stringify(currentConfig, null, 2)));
      console.log();

      const { confirmFinal } = await inquirer.prompt<{ confirmFinal: boolean }>(
        [
          {
            type: 'confirm',
            name: 'confirmFinal',
            message: 'Is this configuration correct?',
            default: true,
          },
        ],
      );

      if (confirmFinal) {
        // User is satisfied
        shouldContinue = false;
      }

      // If not confirmed, loop continues and user can edit again
    }

    return currentConfig;
  }
}
