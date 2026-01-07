import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { ITemplateLoader } from '../../domain/interfaces/templates/template-loader';
import { TemplateMetadata } from '../../domain/value-objects/template-metadata';
import { TemplateConfiguration } from '../../domain/value-objects/template-configuration';

/**
 * FileSystemTemplateLoader
 *
 * Loads RSS source templates from the file system.
 * Scans both rss-sources/ and templates/ directories.
 *
 * Requirements: 3.1, 3.2, 3.5, 3.7, 3.8
 */
@Injectable()
export class FileSystemTemplateLoader implements ITemplateLoader {
  private readonly rssSourcesDir: string;
  private readonly templatesDir: string;

  constructor() {
    const configDir = join(__dirname, '../../../config');
    this.rssSourcesDir = join(configDir, 'rss-sources');
    this.templatesDir = join(configDir, 'templates');
  }

  /**
   * Lists all available templates from both directories
   * Requirement: 3.1, 3.7, 3.8
   */
  async listTemplates(): Promise<TemplateMetadata[]> {
    const templates: TemplateMetadata[] = [];

    // Scan rss-sources directory for specific templates
    try {
      const rssFiles = await fs.readdir(this.rssSourcesDir);
      const jsonFiles = rssFiles.filter(
        (file) => file.endsWith('.json') && file !== 'README.md',
      );

      for (const file of jsonFiles) {
        const filePath = join(this.rssSourcesDir, file);
        const metadata = await this.extractMetadata(filePath, 'specific');
        if (metadata) {
          templates.push(metadata);
        }
      }
    } catch (error) {
      // Directory might not exist or be readable, continue
    }

    // Scan templates directory for generic templates
    try {
      const templateFiles = await fs.readdir(this.templatesDir);
      const jsonFiles = templateFiles.filter((file) => file.endsWith('.json'));

      for (const file of jsonFiles) {
        const filePath = join(this.templatesDir, file);
        const metadata = await this.extractMetadata(filePath, 'generic');
        if (metadata) {
          templates.push(metadata);
        }
      }
    } catch (error) {
      // Directory might not exist or be readable, continue
    }

    return templates;
  }

  /**
   * Loads a specific template by name
   * Requirement: 3.2, 3.5
   */
  async loadTemplate(name: string): Promise<TemplateConfiguration | null> {
    // Try rss-sources directory first
    try {
      const rssPath = join(this.rssSourcesDir, `${name}.json`);
      const content = await fs.readFile(rssPath, 'utf-8');
      return this.parseTemplate(content);
    } catch (error) {
      // File not found in rss-sources, try templates directory
    }

    // Try templates directory
    try {
      const templatePath = join(this.templatesDir, `${name}.json`);
      const content = await fs.readFile(templatePath, 'utf-8');
      return this.parseTemplate(content);
    } catch (error) {
      // File not found in either directory
      return null;
    }
  }

  /**
   * Gets the file system path for a template
   * Requirement: 3.2
   */
  getTemplatePath(name: string): string {
    // Check rss-sources directory first
    const rssPath = join(this.rssSourcesDir, `${name}.json`);
    try {
      // Synchronous check if file exists
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fsSync = require('fs') as typeof import('fs');
      fsSync.accessSync(rssPath);
      return rssPath;
    } catch {
      // Not in rss-sources, return templates path
    }

    // Return templates directory path
    return join(this.templatesDir, `${name}.json`);
  }

  /**
   * Extracts metadata from a template file
   * Requirement: 3.8
   */
  private async extractMetadata(
    filePath: string,
    type: 'specific' | 'generic',
  ): Promise<TemplateMetadata | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const json = JSON.parse(content) as Record<string, unknown>;

      const metadata = json._metadata as
        | {
            name?: string;
            description?: string;
            version?: string;
            author?: string;
          }
        | undefined;

      if (
        metadata !== undefined &&
        metadata.name !== undefined &&
        metadata.name.length > 0 &&
        metadata.description !== undefined &&
        metadata.description.length > 0
      ) {
        return TemplateMetadata.create({
          name: metadata.name,
          description: metadata.description,
          type,
          version: metadata.version,
          author: metadata.author,
        });
      }

      // If no metadata, create basic metadata from filename
      const filename = filePath.split('/').pop();
      const nameWithoutExt = filename?.replace('.json', '') ?? '';
      return TemplateMetadata.create({
        name: nameWithoutExt,
        description: `Template: ${nameWithoutExt}`,
        type,
      });
    } catch {
      return null;
    }
  }

  /**
   * Parses template JSON content into TemplateConfiguration
   * Requirement: 3.2
   */
  private parseTemplate(content: string): TemplateConfiguration {
    const json = JSON.parse(content) as Record<string, unknown>;

    // Extract metadata if present
    let metadata: TemplateMetadata | undefined;
    const metadataObj = json._metadata as
      | {
          name?: string;
          description?: string;
          type?: string;
          version?: string;
          author?: string;
        }
      | undefined;

    if (
      metadataObj !== undefined &&
      metadataObj.name !== undefined &&
      metadataObj.name.length > 0 &&
      metadataObj.description !== undefined &&
      metadataObj.description.length > 0
    ) {
      const type =
        metadataObj.type === 'specific' || metadataObj.type === 'generic'
          ? metadataObj.type
          : 'generic';

      metadata = TemplateMetadata.create({
        name: metadataObj.name,
        description: metadataObj.description,
        type,
        version: metadataObj.version,
        author: metadataObj.author,
      });
    }

    // Extract custom fields (anything not in the standard schema)
    const standardFields = [
      '_metadata',
      'feedUrl',
      'updateInterval',
      'categories',
      'language',
      'maxItems',
      'timeout',
    ];
    const customFields: Record<string, unknown> = {};
    for (const key in json) {
      if (!standardFields.includes(key)) {
        customFields[key] = json[key];
      }
    }

    return TemplateConfiguration.create({
      feedUrl: json.feedUrl as string,
      updateInterval: json.updateInterval as number,
      categories: json.categories as string[] | undefined,
      language: json.language as string | undefined,
      maxItems: json.maxItems as number | undefined,
      timeout: json.timeout as number | undefined,
      metadata,
      customFields:
        Object.keys(customFields).length > 0 ? customFields : undefined,
    });
  }
}
