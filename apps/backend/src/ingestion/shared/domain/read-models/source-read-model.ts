/**
 * Read model for Source Configuration
 * Used for cross-context queries without coupling to Source sub-context
 */
export interface SourceReadModel {
  sourceId: string;
  sourceType: string;
  name: string;
  isActive: boolean;
  healthMetrics: {
    consecutiveFailures: number;
    successRate: number;
    lastSuccessAt: Date | null;
    lastFailureAt: Date | null;
  };
  configSummary: Record<string, any>;
  updatedAt: Date;
}
