import { Command } from '@nestjs/cqrs';

/**
 * UpdateSourceHealthCommand
 *
 * Command to update source health metrics based on job outcomes.
 * Tracks success/failure rates and consecutive failures to determine
 * source reliability.
 *
 * Extends Command<void> for automatic type inference (no return value).
 *
 * Requirements: 4.1-4.7
 */
export class UpdateSourceHealthCommand extends Command<void> {
  constructor(
    public readonly sourceId: string,
    public readonly jobOutcome: 'success' | 'failure',
    public readonly metrics?: {
      itemsCollected: number;
      duration: number;
    },
  ) {
    super();
  }
}
