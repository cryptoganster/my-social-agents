/**
 * SaveContentItemResult
 *
 * Result of the SaveContentItemCommand.
 * Contains the persisted content item ID and timestamp.
 */
export class SaveContentItemResult {
  constructor(
    public readonly contentId: string,
    public readonly persistedAt: Date,
  ) {}
}
