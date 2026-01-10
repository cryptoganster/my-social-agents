import { Command } from '@nestjs/cqrs';
import { IngestContentResult } from './result';

/**
 * IngestContentCommand
 *
 * Command to ingest content from a specific source.
 * Represents the intent to collect, validate, normalize, and persist content.
 *
 * Extends Command<IngestContentResult> for automatic type inference when using CommandBus.
 *
 * Requirements: 1.1-1.6, 2.1-2.5, 3.1-3.4, 7.1-7.5, 10.1-10.5
 */
export class IngestContentCommand extends Command<IngestContentResult> {
  constructor(
    public readonly sourceId: string,
    public readonly requestId?: string, // Optional for idempotency
  ) {
    super();
  }
}
