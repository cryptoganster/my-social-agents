import { ContentHash } from '@/ingestion/shared/value-objects/content-hash';
import { ContentMetadata, AssetTag } from '../value-objects';
import { AggregateRoot, AggregateVersion } from '@/shared/kernel';

/**
 * ContentItem Aggregate Root
 *
 * Represents normalized content with metadata.
 * Enforces content quality invariants and manages duplicate detection.
 * Uses optimistic locking to prevent concurrent modifications.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 3.2
 */

export interface ContentItemProps {
  contentId: string;
  sourceId: string;
  contentHash: ContentHash;
  rawContent: string;
  normalizedContent: string;
  metadata: ContentMetadata;
  assetTags: AssetTag[];
  collectedAt: Date;
}

export interface ContentItemValidationResult {
  isValid: boolean;
  errors: string[];
}

export class ContentItem extends AggregateRoot<string> {
  private readonly _sourceId: string;
  private readonly _contentHash: ContentHash;
  private readonly _rawContent: string;
  private readonly _normalizedContent: string;
  private readonly _metadata: ContentMetadata;
  private _assetTags: AssetTag[];
  private readonly _collectedAt: Date;

  private constructor(
    id: string,
    version: AggregateVersion,
    props: Omit<ContentItemProps, 'contentId'>,
  ) {
    super(id, version);
    this._sourceId = props.sourceId;
    this._contentHash = props.contentHash;
    this._rawContent = props.rawContent;
    this._normalizedContent = props.normalizedContent;
    this._metadata = props.metadata;
    this._assetTags = [...props.assetTags]; // Copy array
    this._collectedAt = props.collectedAt;
  }

  /**
   * Creates a new ContentItem
   * New aggregates start at version 0
   * Requirements: 2.1, 2.2
   */
  static create(props: ContentItemProps): ContentItem {
    const item = new ContentItem(props.contentId, AggregateVersion.initial(), {
      sourceId: props.sourceId,
      contentHash: props.contentHash,
      rawContent: props.rawContent,
      normalizedContent: props.normalizedContent,
      metadata: props.metadata,
      assetTags: props.assetTags,
      collectedAt: props.collectedAt,
    });

    // Validate on creation
    const validation = item.validate();
    if (!validation.isValid) {
      throw new Error(`Invalid ContentItem: ${validation.errors.join(', ')}`);
    }

    return item;
  }

  /**
   * Reconstitutes a ContentItem from persistence
   * Loads existing version from database
   */
  static reconstitute(
    props: ContentItemProps & { version: number },
  ): ContentItem {
    return new ContentItem(
      props.contentId,
      AggregateVersion.fromNumber(props.version),
      {
        sourceId: props.sourceId,
        contentHash: props.contentHash,
        rawContent: props.rawContent,
        normalizedContent: props.normalizedContent,
        metadata: props.metadata,
        assetTags: props.assetTags,
        collectedAt: props.collectedAt,
      },
    );
  }

  /**
   * Validates content quality
   * Requirements: 7.1, 7.2, 7.4, 7.5
   */
  validate(): ContentItemValidationResult {
    const errors: string[] = [];

    // Validate contentId
    if (!this.id || this.id.trim().length === 0) {
      errors.push('Content ID is required');
    }

    // Validate sourceId
    if (!this._sourceId || this._sourceId.trim().length === 0) {
      errors.push('Source ID is required');
    }

    // Validate raw content
    if (!this._rawContent || this._rawContent.trim().length === 0) {
      errors.push('Raw content is required');
    }

    // Validate normalized content
    if (
      !this._normalizedContent ||
      this._normalizedContent.trim().length === 0
    ) {
      errors.push('Normalized content is required');
    }

    // Validate minimum content length (at least 10 characters)
    if (this._normalizedContent.trim().length < 10) {
      errors.push('Content is too short (minimum 10 characters)');
    }

    // Validate content hash
    if (this._contentHash === null || this._contentHash === undefined) {
      errors.push('Content hash is required');
    }

    // Validate metadata has required fields
    if (!this._metadata.hasRequiredFields()) {
      errors.push('Metadata must have at least title or sourceUrl');
    }

    // Validate collectedAt is not in the future
    if (this._collectedAt > new Date()) {
      errors.push('Collection date cannot be in the future');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Checks if this content is a duplicate of another based on hash
   * Requirements: 3.2
   */
  isDuplicate(hash: ContentHash): boolean {
    return this._contentHash.equals(hash);
  }

  /**
   * Adds an asset tag to the content
   * Requirements: 2.3
   */
  addAssetTag(tag: AssetTag): void {
    // Check if tag already exists (by symbol)
    const exists = this._assetTags.some(
      (existingTag) => existingTag.symbol === tag.symbol,
    );

    if (!exists) {
      this._assetTags.push(tag);
      this.incrementVersion(); // CRITICAL: Increment version on state change
    }
  }

  /**
   * Removes an asset tag by symbol
   */
  removeAssetTag(symbol: string): void {
    const initialLength = this._assetTags.length;
    this._assetTags = this._assetTags.filter(
      (tag) => tag.symbol !== symbol.toUpperCase(),
    );

    // Only increment version if something was actually removed
    if (this._assetTags.length !== initialLength) {
      this.incrementVersion(); // CRITICAL: Increment version on state change
    }
  }

  /**
   * Gets all high-confidence asset tags
   */
  getHighConfidenceTags(): AssetTag[] {
    return this._assetTags.filter((tag) => tag.isHighConfidence());
  }

  /**
   * Checks if content has a specific asset tag
   */
  hasAssetTag(symbol: string): boolean {
    return this._assetTags.some((tag) => tag.symbol === symbol.toUpperCase());
  }

  // Getters
  get contentId(): string {
    return this.id; // Use inherited id property
  }

  get sourceId(): string {
    return this._sourceId;
  }

  get contentHash(): ContentHash {
    return this._contentHash;
  }

  get rawContent(): string {
    return this._rawContent;
  }

  get normalizedContent(): string {
    return this._normalizedContent;
  }

  get metadata(): ContentMetadata {
    return this._metadata;
  }

  get assetTags(): AssetTag[] {
    return [...this._assetTags]; // Return copy to prevent external mutation
  }

  get collectedAt(): Date {
    return this._collectedAt;
  }

  /**
   * Returns a plain object representation
   */
  toObject(): ContentItemProps & { version: number } {
    return {
      contentId: this.id,
      sourceId: this._sourceId,
      contentHash: this._contentHash,
      rawContent: this._rawContent,
      normalizedContent: this._normalizedContent,
      metadata: this._metadata,
      assetTags: [...this._assetTags],
      collectedAt: this._collectedAt,
      version: this.version.value,
    };
  }
}
