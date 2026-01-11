import { Command } from '@nestjs/cqrs';
import { ScheduleJobResult } from './result';

/**
 * ScheduleJobCommand
 *
 * Command to schedule a new ingestion job for a source.
 * Represents the intent to create and schedule a job for execution.
 *
 * Extends Command<ScheduleJobResult> for automatic type inference.
 *
 * Requirements: 1.1, 1.2
 * Design: Commands - Job Commands
 */
export class ScheduleJobCommand extends Command<ScheduleJobResult> {
  constructor(
    public readonly sourceId: string,
    public readonly scheduledAt?: Date,
  ) {
    super();
  }
}
