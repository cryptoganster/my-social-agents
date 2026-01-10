/**
 * CreateSourceResult
 *
 * Result of creating a new source configuration.
 * Contains the source ID and activation status.
 */
export interface CreateSourceResult {
  sourceId: string;
  isActive: boolean;
}
