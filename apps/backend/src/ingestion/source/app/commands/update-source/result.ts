/**
 * UpdateSourceResult
 *
 * Result of updating an existing source configuration.
 * Contains the source ID and activation status.
 */
export interface UpdateSourceResult {
  sourceId: string;
  isActive: boolean;
}
