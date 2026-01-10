import { SourceType } from '@/ingestion/source/domain/value-objects/source-type';
import { ContentMetadata } from '@/ingestion/content/domain/value-objects/content-metadata';
import { ExtractedMetadata } from './parsing-strategy';

/**
 * ParsingInfo
 *
 * Diagnostic information about the parsing operation.
 */
export interface ParsingInfo {
  readonly parser: string;
  readonly originalFormat: string;
  readonly conversionTimeMs: number;
  readonly warnings?: string[];
}

/**
 * ParsedContent
 *
 * Result of content parsing operation.
 * Contains markdown content, extracted metadata, and parsing diagnostics.
 */
export interface ParsedContent {
  readonly markdown: string;
  readonly extractedMetadata: ExtractedMetadata;
  readonly parsingInfo: ParsingInfo;
}

/**
 * IContentParser Interface
 *
 * High-level abstraction for content parsing operations.
 * Orchestrates parsing by selecting appropriate strategy based on source type.
 *
 * This is the main entry point for content parsing in the Ingestion context.
 * Source adapters inject this interface to convert raw content to markdown.
 *
 * Requirements: 1.1, 1.2
 */
export interface IContentParser {
  /**
   * Parses raw content into normalized markdown
   *
   * @param rawContent - Raw content (HTML, XML, plain text, etc.)
   * @param sourceType - Type of source for strategy selection
   * @param metadata - Additional metadata for parsing context
   * @returns Parsed content with markdown and metadata
   */
  parse(
    rawContent: string,
    sourceType: SourceType,
    metadata?: ContentMetadata,
  ): Promise<ParsedContent>;
}
