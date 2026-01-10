/**
 * SourceConfigurationDto
 *
 * Application DTO for source configuration data transfer.
 * This is a plain object used for transferring configuration data between layers.
 * Contains all configuration properties in a flat structure for efficient querying.
 *
 * NOT a CQRS Read Model - queries write table directly
 *
 * Requirements: 4.1, 8.1
 */
export interface SourceConfigurationDto {
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
