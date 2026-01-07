import { TemplateMetadata } from '../../value-objects/template-metadata';
import { TemplateConfiguration } from '../../value-objects/template-configuration';

/**
 * Interface for loading RSS source templates from storage
 *
 * Defines the contract for template loading operations including
 * listing available templates, loading specific templates, and
 * resolving template paths.
 *
 * Requirements: 3.1, 3.2
 */
export interface ITemplateLoader {
  /**
   * Lists all available templates
   *
   * Scans both rss-sources/ and templates/ directories
   * and returns metadata for all discovered templates.
   *
   * Requirement: 3.1
   *
   * @returns Array of template metadata
   */
  listTemplates(): Promise<TemplateMetadata[]>;

  /**
   * Loads a specific template by name
   *
   * Searches for the template in both rss-sources/ and templates/
   * directories, parses the JSON, and returns the configuration.
   *
   * Requirement: 3.2
   *
   * @param name - The template name (without .json extension)
   * @returns The template configuration, or null if not found
   */
  loadTemplate(name: string): Promise<TemplateConfiguration | null>;

  /**
   * Gets the file system path for a template
   *
   * Resolves the full path to a template file based on its name.
   * Searches in both rss-sources/ and templates/ directories.
   *
   * Requirement: 3.2
   *
   * @param name - The template name (without .json extension)
   * @returns The full file system path to the template
   */
  getTemplatePath(name: string): string;
}
