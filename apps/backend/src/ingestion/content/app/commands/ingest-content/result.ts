/**
 * IngestContentResult
 *
 * Result of content ingestion operation
 */
export interface IngestContentResult {
  itemsCollected: number;
  itemsPersisted: number;
  duplicatesDetected: number;
  validationErrors: number;
  errors: Array<{ message: string; content?: string }>;
}
