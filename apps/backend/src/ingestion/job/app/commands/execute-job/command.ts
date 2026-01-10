import { Command } from '@nestjs/cqrs';
import { ExecuteIngestionJobResult } from './result';

/**
 * ExecuteIngestionJobCommand
 *
 * Command to execute a scheduled or manual ingestion job.
 * Represents the intent to run a job, collect content, and update job state.
 *
 * Extends Command<ExecuteIngestionJobResult> for automatic type inference.
 *
 * Requirements: 4.3, 4.4, 4.5, 4.6
 */
export class ExecuteIngestionJobCommand extends Command<ExecuteIngestionJobResult> {
  constructor(public readonly jobId: string) {
    super();
  }
}
