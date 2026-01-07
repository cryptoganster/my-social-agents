/**
 * ScheduleIngestionJobCommand
 *
 * Command to schedule an ingestion job for a specific source.
 * Represents the intent to create and schedule a content collection task.
 *
 * Requirements: 4.1, 4.2
 */
export class ScheduleIngestionJobCommand {
  constructor(
    public readonly sourceId: string,
    public readonly scheduledAt?: Date, // Optional - defaults to immediate execution
    public readonly jobId?: string, // Optional - auto-generated if not provided
  ) {}
}
