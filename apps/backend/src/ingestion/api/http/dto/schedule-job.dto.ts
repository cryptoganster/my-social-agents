/**
 * DTO for scheduling an ingestion job
 */
export interface ScheduleJobDto {
  sourceId: string;
  scheduledAt?: string; // ISO 8601 datetime string
}
