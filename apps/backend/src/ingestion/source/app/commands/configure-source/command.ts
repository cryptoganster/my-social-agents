import { SourceTypeEnum } from '@/ingestion/source/domain/value-objects/source-type';

/**
 * ConfigureSourceCommand
 *
 * Command to create or update a source configuration.
 * Represents the intent to configure a content source with its settings and credentials.
 *
 * Requirements: 5.1, 5.2, 5.5
 */
export class ConfigureSourceCommand {
  constructor(
    public readonly sourceId: string | undefined, // undefined for new sources, provided for updates
    public readonly sourceType: SourceTypeEnum,
    public readonly name: string,
    public readonly config: Record<string, unknown>,
    public readonly credentials?: string, // Plaintext credentials (will be encrypted)
    public readonly isActive?: boolean, // Optional - defaults to true for new sources
  ) {}
}
