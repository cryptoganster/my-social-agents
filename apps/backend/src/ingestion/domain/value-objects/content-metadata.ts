import { ValueObject } from '@/shared/kernel';

/**
 * ContentMetadata Value Object
 *
 * Structured metadata about collected content.
 * Immutable and self-validating.
 *
 * Requirements: 2.2
 */
export interface ContentMetadataProps {
  title: string | null;
  author: string | null;
  publishedAt: Date | null;
  language: string | null;
  sourceUrl: string | null;
}

export class ContentMetadata extends ValueObject<ContentMetadataProps> {
  private constructor(props: Partial<ContentMetadataProps>) {
    super({
      title: props.title ?? null,
      author: props.author ?? null,
      publishedAt: props.publishedAt ?? null,
      language: props.language ?? null,
      sourceUrl: props.sourceUrl ?? null,
    });
    this.validate();
  }

  /**
   * Creates a ContentMetadata instance
   */
  static create(props: Partial<ContentMetadataProps>): ContentMetadata {
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
  protected validate(): void {
    // Validate URL format if provided
    if (this.props.sourceUrl !== null && this.props.sourceUrl.trim() !== '') {
      try {
        new URL(this.props.sourceUrl);
      } catch {
        throw new Error(`Invalid source URL: ${this.props.sourceUrl}`);
      }
    }

    // Validate language code format if provided (ISO 639-1)
    if (this.props.language !== null && this.props.language.trim() !== '') {
      const languageRegex = /^[a-z]{2}(-[A-Z]{2})?$/;
      if (!languageRegex.test(this.props.language)) {
        throw new Error(
          `Invalid language code: ${this.props.language}. Must be ISO 639-1 format (e.g., 'en', 'en-US')`,
        );
      }
    }

    // Validate publishedAt is not in the future
    if (
      this.props.publishedAt !== null &&
      this.props.publishedAt > new Date()
    ) {
      throw new Error('Published date cannot be in the future');
    }
  }

  /**
   * Checks if metadata has minimum required fields
   */
  hasRequiredFields(): boolean {
    return this.props.title !== null || this.props.sourceUrl !== null;
  }

  /**
   * Checks if metadata is complete (all fields populated)
   */
  isComplete(): boolean {
    return (
      this.props.title !== null &&
      this.props.author !== null &&
      this.props.publishedAt !== null &&
      this.props.language !== null &&
      this.props.sourceUrl !== null
    );
  }

  // Getters
  get title(): string | null {
    return this.props.title;
  }

  get author(): string | null {
    return this.props.author;
  }

  get publishedAt(): Date | null {
    return this.props.publishedAt;
  }

  get language(): string | null {
    return this.props.language;
  }

  get sourceUrl(): string | null {
    return this.props.sourceUrl;
  }
}
