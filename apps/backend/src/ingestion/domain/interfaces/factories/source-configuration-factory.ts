import { SourceConfiguration } from '../../aggregates/source-configuration';

/**
 * SourceConfigurationFactory Interface
 *
 * Factory for reconstituting SourceConfiguration aggregates from persistence.
 * Uses read repositories internally to load data and reconstructs
 * the aggregate with its full behavior.
 *
 * Requirements: 5.1
 */
export interface SourceConfigurationFactory {
  /**
   * Loads and reconstitutes a SourceConfiguration aggregate from persistence
   * Returns null if the source configuration does not exist
   * The reconstituted aggregate includes full business logic and behavior
   */
  load(sourceId: string): Promise<SourceConfiguration | null>;
}
