/**
 * DuplicateCheckReadModel
 *
 * Read model for duplicate content check queries.
 * Contains the result of checking if content already exists.
 *
 * Requirements: 3.2, 3.3
 */
export interface DuplicateCheckReadModel {
  isDuplicate: boolean;
  contentHash: string;
  existingContentId: string | null;
}
