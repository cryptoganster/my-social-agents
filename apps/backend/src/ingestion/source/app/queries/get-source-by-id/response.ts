/**
 * GetSourceByIdResponse
 *
 * Response type for GetSourceByIdQuery.
 * Query-specific response with source configuration and health metrics.
 *
 * Naming Convention: {QueryName}Response
 * Location: app/queries/<query-name>/response.ts
 *
 * Requirements: 10.1, 10.2
 */

/**
 * Health metrics for a source
 */
export interface SourceHealthMetricsResponse {
  successRate: number;
  consecutiveFailures: number;
  totalJobs: number;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
}

/**
 * Response for GetSourceByIdQuery
 */
export interface GetSourceByIdResponse {
  sourceId: string;
  name: string;
  sourceType: string;
  isActive: boolean;
  config: Record<string, unknown>;
  healthMetrics: SourceHealthMetricsResponse;
}
