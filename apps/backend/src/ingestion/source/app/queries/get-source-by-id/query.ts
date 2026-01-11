import { Query } from '@nestjs/cqrs';

/**
 * GetSourceByIdQuery
 *
 * Query to retrieve a single source configuration by its ID.
 * Returns a read model with health metrics for monitoring and validation.
 *
 * Extends Query<GetSourceByIdResult | null> for automatic type inference.
 *
 * Requirements: 10.1, 10.2
 * Design: Queries - Source Queries
 */
export class GetSourceByIdQuery extends Query<GetSourceByIdResult | null> {
  constructor(public readonly sourceId: string) {
    super();
  }
}

/**
 * GetSourceByIdResult
 *
 * Result interface for GetSourceByIdQuery.
 * Includes source configuration and health metrics.
 */
export interface GetSourceByIdResult {
  sourceId: string;
  name: string;
  sourceType: string;
  isActive: boolean;
  healthMetrics: {
    successRate: number;
    consecutiveFailures: number;
    totalJobs: number;
    lastSuccessAt: Date | null;
    lastFailureAt: Date | null;
  };
  config: Record<string, any>;
}
