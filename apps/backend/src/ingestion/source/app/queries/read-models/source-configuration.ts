/**
 * SourceConfigurationReadModel
 *
 * Optimized read model for querying source configurations.
 * This is a plain object (not an aggregate) used for read operations.
 * Contains all configuration properties in a flat structure for efficient querying.
 *
 * Lives in Application layer because:
 * - Used by Query handlers (application concern)
 * - Part of CQRS read side (not domain logic)
 * - Returned by Read Repositories
 *
 * Requirements: 5.1
 */
export interface SourceConfigurationReadModel {
  sourceId: string;
  sourceType: string;
  name: string;

  // Configuration (as JSON object)
  config: Record<string, unknown>;

  // Encrypted credentials (optional)
  credentials?: string;

  // Status
  isActive: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Health tracking fields
  consecutiveFailures: number;
  successRate: number;
  totalJobs: number;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;

  // Version for optimistic locking
  version: number;
}
