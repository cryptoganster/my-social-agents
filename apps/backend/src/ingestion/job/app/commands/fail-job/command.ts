import { Command } from '@nestjs/cqrs';
import { FailJobResult } from './result';

/**
 * FailJobCommand
 *
 * Command to mark an ingestion job as failed.
 * Transitions the job from RUNNING to FAILED state.
 *
 * Requirements: 4.4, 4.6
 */
export class FailJobCommand extends Command<FailJobResult> {
  constructor(
    public readonly jobId: string,
    public readonly errorMessage: string,
    public readonly errorType?: string,
    public readonly stackTrace?: string,
  ) {
    super();
  }
}
