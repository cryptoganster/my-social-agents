import inquirer from 'inquirer';
import chalk from 'chalk';
import { ITemplateLoader } from '@/ingestion/source/domain/interfaces/templates/template-loader';
import { TemplateConfiguration } from '@/ingestion/source/domain/value-objects/template-configuration';

/**
 * TemplateSelectionFlow
 *
 * Interactive CLI flow for selecting RSS source templates.
 * Prompts user to load from template, displays available templates,
 * and loads the selected template configuration.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export class TemplateSelectionFlow {
  constructor(private readonly templateLoader: ITemplateLoader) {}

  /**
   * Executes the template selection flow
   * Returns the selected template configuration or null if user declines
   * Requirement: 4.1, 4.2, 4.3, 4.4, 4.5
   */
  async execute(): Promise<TemplateConfiguration | null> {
    // Step 1: Ask if user wants to load from template
    const { useTemplate } = await inquirer.prompt<{ useTemplate: boolean }>([
      {
        type: 'confirm',
        name: 'useTemplate',
        message: 'Load configuration from template?',
        default: true,
      },
    ]);

    if (!useTemplate) {
      return null;
    }

    // Step 2: List available templates
    const templates = await this.templateLoader.listTemplates();

    if (templates.length === 0) {
      console.log(chalk.yellow('No templates available'));
      return null;
    }

    // Step 3: Display templates with descriptions
    const templateChoices = templates.map((template) => ({
      name: `${template.name} - ${template.description}`,
      value: template.name,
    }));

    const { selectedTemplate } = await inquirer.prompt<{
      selectedTemplate: string;
    }>([
      {
        type: 'list',
        name: 'selectedTemplate',
        message: 'Select a template:',
        choices: templateChoices,
      },
    ]);

    // Step 4: Load the selected template
    const templateConfig =
      await this.templateLoader.loadTemplate(selectedTemplate);

    if (templateConfig === null) {
      console.log(chalk.red(`Failed to load template: ${selectedTemplate}`));
      return null;
    }

    // Step 5: Display loaded JSON for review
    console.log();
    console.log(chalk.cyan.bold('📄 Loaded Template Configuration:'));
    console.log();
    console.log(
      chalk.gray(JSON.stringify(this.toPlainObject(templateConfig), null, 2)),
    );
    console.log();

    return templateConfig;
  }

  /**
   * Converts TemplateConfiguration to plain object for display
   */
  private toPlainObject(
    config: TemplateConfiguration,
  ): Record<string, unknown> {
    const obj: Record<string, unknown> = {
      feedUrl: config.feedUrl,
      updateInterval: config.updateInterval,
    };

    if (config.categories !== undefined) {
      obj.categories = config.categories;
    }

    if (config.language !== undefined) {
      obj.language = config.language;
    }

    if (config.maxItems !== undefined) {
      obj.maxItems = config.maxItems;
    }

    if (config.timeout !== undefined) {
      obj.timeout = config.timeout;
    }

    if (config.customFields !== undefined) {
      Object.assign(obj, config.customFields);
    }

    return obj;
  }
}
