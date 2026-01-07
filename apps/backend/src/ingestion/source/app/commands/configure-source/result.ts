/**
 * ConfigureSourceResult
 *
 * Result of configuring a source.
 * Contains the source ID and whether it was created or updated.
 *
 * Requirements: 5.1, 5.2
 */
export interface ConfigureSourceResult {
  sourceId: string;
  isNew: boolean; // true if created, false if updated
  isActive: boolean;
}
