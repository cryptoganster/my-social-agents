import { Command } from '@nestjs/cqrs';
import { SourceTypeEnum } from '@/ingestion/source/domain/value-objects/source-type';
import { CreateSourceResult } from './result';

/**
 * CreateSourceCommand
 *
 * Command to create a new source configuration.
 * Represents the intent to configure a new content source with its settings and credentials.
 *
 * Single Responsibility: Create a new source configuration
 *
 * Extends Command<CreateSourceResult> for automatic type inference.
 */
export class CreateSourceCommand extends Command<CreateSourceResult> {
  constructor(
    public readonly sourceType: SourceTypeEnum,
    public readonly name: string,
    public readonly config: Record<string, unknown>,
    public readonly credentials?: string,
    public readonly isActive: boolean = true,
  ) {
    super();
  }
}
