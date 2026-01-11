import { Command } from '@nestjs/cqrs';
import { CompleteJobResult } from './result';

/**
 * CompleteJobCommand
 *
 * Command to complete an ingestion job with final metrics.
 * Transitions the job from RUNNING to COMPLETED state.
 *
 * Requirements: 4.4, 4.5
 */
export class CompleteJobCommand extends Command<CompleteJobResult> {
  constructor(
    public readonly jobId: string,
    public readonly finalMetrics: {
      itemsCollected: number;
      duplicatesDetected: number;
      errorsEncountered: number;
      bytesProcessed: number;
      durationMs: number;
    },
  ) {
    super();
  }
}
