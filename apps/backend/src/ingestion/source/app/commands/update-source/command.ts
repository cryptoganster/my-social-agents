import { Command } from '@nestjs/cqrs';
import { SourceTypeEnum } from '@/ingestion/source/domain/value-objects/source-type';
import { UpdateSourceResult } from './result';

/**
 * UpdateSourceCommand
 *
 * Command to update an existing source configuration.
 * Represents the intent to modify a content source's settings and credentials.
 *
 * Single Responsibility: Update an existing source configuration
 *
 * Extends Command<UpdateSourceResult> for automatic type inference.
 */
export class UpdateSourceCommand extends Command<UpdateSourceResult> {
  constructor(
    public readonly sourceId: string,
    public readonly sourceType: SourceTypeEnum,
    public readonly name: string,
    public readonly config: Record<string, unknown>,
    public readonly credentials?: string,
    public readonly isActive?: boolean,
  ) {
    super();
  }
}
