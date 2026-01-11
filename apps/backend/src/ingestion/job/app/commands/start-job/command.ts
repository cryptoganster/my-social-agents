import { Command } from '@nestjs/cqrs';
import { StartJobResult } from './result';

/**
 * StartJobCommand
 *
 * Command to start an ingestion job execution.
 * Transitions the job from PENDING to RUNNING state.
 *
 * This is the entry point for job execution pipeline:
 * StartJobCommand → JobStarted → TriggerContentCollectionOnJobStarted → IngestContentCommand
 *
 * Requirements: 4.3, 4.4
 */
export class StartJobCommand extends Command<StartJobResult> {
  constructor(public readonly jobId: string) {
    super();
  }
}
