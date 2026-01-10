import { Command } from '@nestjs/cqrs';

/**
 * UpdateJobMetricsCommand
 *
 * Command to update job metrics in real-time as content is processed.
 * Represents the intent to increment specific metric counters on a job.
 *
 * Extends Command<void> for automatic type inference (no return value).
 *
 * Requirements: 3.1, 3.2, 3.3
 * Design: Commands - Job Commands
 */
export class UpdateJobMetricsCommand extends Command<void> {
  constructor(
    public readonly jobId: string,
    public readonly metricUpdate: {
      itemsCollected?: number;
      itemsPersisted?: number;
      duplicatesDetected?: number;
      validationErrors?: number;
    },
  ) {
    super();
  }
}
