import { ValueObject } from '@/shared/kernel';
import {
  ExtractedMetadata,
  ParsingInfo,
} from '@/ingestion/content/domain/interfaces/services';

/**
 * Properties for ParsedContent Value Object
 */
export interface ParsedContentProps {
  markdown: string;
  extractedMetadata: ExtractedMetadata;
  parsingInfo: ParsingInfo;
}

/**
 * ParsedContent Value Object
 *
 * Immutable result of content parsing operation.
 * Contains markdown content, extracted metadata, and parsing diagnostics.
 *
 * This value object represents the output of the ContentParser service,
 * encapsulating all information produced during the parsing process.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
export class ParsedContent extends ValueObject<ParsedContentProps> {
  private constructor(props: ParsedContentProps) {
    super(props);
    this.validate();
  }

  /**
   * Validates the parsed content properties
   */
  protected validate(): void {
    // Markdown can be empty (parsing may fail gracefully), but must be defined
    if (this.props.markdown === undefined || this.props.markdown === null) {
      throw new Error('Markdown content must be defined');
    }

    if (!this.props.extractedMetadata) {
      throw new Error('Extracted metadata must be defined');
    }

    if (!this.props.parsingInfo) {
      throw new Error('Parsing info must be defined');
    }

    if (!this.props.parsingInfo.parser) {
      throw new Error('Parser name must be defined in parsing info');
    }

    if (!this.props.parsingInfo.originalFormat) {
      throw new Error('Original format must be defined in parsing info');
    }

    if (
      this.props.parsingInfo.conversionTimeMs === undefined ||
      this.props.parsingInfo.conversionTimeMs < 0
    ) {
      throw new Error('Conversion time must be a non-negative number');
    }
  }

  /**
   * Creates a ParsedContent from validated properties
   */
  static create(props: ParsedContentProps): ParsedContent {
    return new ParsedContent(props);
  }

  /**
   * Returns the markdown content
   */
  get markdown(): string {
    return this.props.markdown;
  }

  /**
   * Returns the extracted metadata
   */
  get extractedMetadata(): ExtractedMetadata {
    return this.props.extractedMetadata;
  }

  /**
   * Returns the parsing info
   */
  get parsingInfo(): ParsingInfo {
    return this.props.parsingInfo;
  }

  /**
   * Checks if the parsed content has meaningful content
   */
  get hasContent(): boolean {
    return this.props.markdown.trim().length > 0;
  }

  /**
   * Checks if there were any warnings during parsing
   */
  get hasWarnings(): boolean {
    return (this.props.parsingInfo.warnings?.length ?? 0) > 0;
  }

  /**
   * Returns the warnings array or empty array if none
   */
  get warnings(): string[] {
    return this.props.parsingInfo.warnings ?? [];
  }
}
