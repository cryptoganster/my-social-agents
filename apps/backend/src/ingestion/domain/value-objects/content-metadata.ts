/**
 * ContentMetadata Value Object
 *
 * Structured metadata about collected content.
 * Immutable and self-validating.
 *
 * Requirements: 2.2
 */
export interface ContentMetadataProps {
  title?: string | null;
  author?: string | null;
  publishedAt?: Date | null;
  language?: string | null;
  sourceUrl?: string | null;
}

export class ContentMetadata {
  private readonly _title: string | null;
  private readonly _author: string | null;
  private readonly _publishedAt: Date | null;
  private readonly _language: string | null;
  private readonly _sourceUrl: string | null;

  private constructor(props: ContentMetadataProps) {
    this._title = props.title ?? null;
    this._author = props.author ?? null;
    this._publishedAt = props.publishedAt ?? null;
    this._language = props.language ?? null;
    this._sourceUrl = props.sourceUrl ?? null;

    this.validate();
  }

  /**
   * Creates a ContentMetadata instance
   */
  static create(props: ContentMetadataProps): ContentMetadata {
    return new ContentMetadata(props);
  }

  /**
   * Creates an empty ContentMetadata
   */
  static empty(): ContentMetadata {
    return new ContentMetadata({});
  }

  /**
   * Validates the metadata
   */
  private validate(): void {
    // Validate URL format if provided
    if (this._sourceUrl !== null && this._sourceUrl.trim() !== '') {
      try {
        new URL(this._sourceUrl);
      } catch {
        throw new Error(`Invalid source URL: ${this._sourceUrl}`);
      }
    }

    // Validate language code format if provided (ISO 639-1)
    if (this._language !== null && this._language.trim() !== '') {
      const languageRegex = /^[a-z]{2}(-[A-Z]{2})?$/;
      if (!languageRegex.test(this._language)) {
        throw new Error(
          `Invalid language code: ${this._language}. Must be ISO 639-1 format (e.g., 'en', 'en-US')`,
        );
      }
    }

    // Validate publishedAt is not in the future
    if (this._publishedAt !== null && this._publishedAt > new Date()) {
      throw new Error('Published date cannot be in the future');
    }
  }

  /**
   * Checks if metadata has minimum required fields
   */
  hasRequiredFields(): boolean {
    return this._title !== null || this._sourceUrl !== null;
  }

  /**
   * Checks if metadata is complete (all fields populated)
   */
  isComplete(): boolean {
    return (
      this._title !== null &&
      this._author !== null &&
      this._publishedAt !== null &&
      this._language !== null &&
      this._sourceUrl !== null
    );
  }

  // Getters
  get title(): string | null {
    return this._title;
  }

  get author(): string | null {
    return this._author;
  }

  get publishedAt(): Date | null {
    return this._publishedAt;
  }

  get language(): string | null {
    return this._language;
  }

  get sourceUrl(): string | null {
    return this._sourceUrl;
  }

  /**
   * Returns a plain object representation
   */
  toObject(): ContentMetadataProps {
    return {
      title: this._title,
      author: this._author,
      publishedAt: this._publishedAt,
      language: this._language,
      sourceUrl: this._sourceUrl,
    };
  }

  /**
   * Checks equality with another ContentMetadata
   */
  equals(other: ContentMetadata): boolean {
    return (
      this._title === other._title &&
      this._author === other._author &&
      this._publishedAt?.getTime() === other._publishedAt?.getTime() &&
      this._language === other._language &&
      this._sourceUrl === other._sourceUrl
    );
  }
}
