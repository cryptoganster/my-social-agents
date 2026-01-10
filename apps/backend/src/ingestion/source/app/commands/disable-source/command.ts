import { Command } from '@nestjs/cqrs';
import { DisableSourceResult } from './result';

/**
 * DisableSourceCommand
 *
 * Command to disable a source configuration with a reason.
 * Used when a source becomes unhealthy or needs to be manually disabled.
 *
 * Requirements: 4.5, 4.6
 */
export class DisableSourceCommand extends Command<DisableSourceResult> {
  constructor(
    public readonly sourceId: string,
    public readonly reason: string,
  ) {
    super();
  }
}
