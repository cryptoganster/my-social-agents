import { SourceConfiguration } from '../../aggregates/source-configuration';

/**
 * SourceConfigurationWriteRepository Interface
 *
 * Write-side persistence interface for SourceConfiguration aggregate.
 * Following CQRS principles, this repository only handles write operations.
 * Read operations are handled by read repositories in the infrastructure layer.
 *
 * Requirements: 5.1, 5.3
 */
export interface SourceConfigurationWriteRepository {
  /**
   * Persists or updates a SourceConfiguration aggregate
   * Uses optimistic locking to prevent concurrent modifications
   * Throws ConcurrencyException if version mismatch occurs
   */
  save(config: SourceConfiguration): Promise<void>;

  /**
   * Soft deletes a source configuration
   * Marks the source as inactive rather than physically deleting it
   * Preserves historical data while preventing future use
   */
  delete(sourceId: string): Promise<void>;
}
