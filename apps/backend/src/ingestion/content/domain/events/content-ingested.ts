/**
 * ContentIngestedEvent
 *
 * Domain event published when content has been successfully ingested
 * (validated, normalized, deduplicated, and persisted).
 *
 * Requirements: 10.5
 */
export class ContentIngestedEvent {
  constructor(
    public readonly contentId: string,
    public readonly sourceId: string,
    public readonly contentHash: string,
    public readonly assetTags: string[],
    public readonly collectedAt: Date,
  ) {}
}
