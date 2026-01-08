/**
 * ScheduleJobCommand
 *
 * Command to schedule a new ingestion job for a source.
 * Represents the intent to create and schedule a job for execution.
 *
 * Requirements: 1.1, 1.2
 * Design: Commands - Job Commands
 */
export class ScheduleJobCommand {
  constructor(
    public readonly sourceId: string,
    public readonly scheduledAt?: Date,
  ) {}
}
