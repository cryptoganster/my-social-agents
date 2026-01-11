import { Injectable, Inject } from '@nestjs/common';
import {
  IContentParser,
  ParsedContent,
  ParsingInfo,
} from '../interfaces/services/content-parser';
import {
  IParsingStrategy,
  ParsingOptions,
  ExtractedMetadata,
} from '../interfaces/services/parsing-strategy';
import {
  SourceType,
  SourceTypeEnum,
} from '@/ingestion/source/domain/value-objects/source-type';
import { ContentMetadata } from '../value-objects/content-metadata';

/**
 * UnsupportedSourceTypeError
 *
 * Thrown when no parsing strategy is registered for a source type.
 */
export class UnsupportedSourceTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedSourceTypeError';
  }
}

/**
 * ContentParser Domain Service
 *
 * Orchestrates content parsing by selecting appropriate strategy based on source type.
 * Measures parsing time and aggregates metadata.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
 */
@Injectable()
export class ContentParser implements IContentParser {
  private readonly strategyMap: Map<SourceTypeEnum, IParsingStrategy>;

  constructor(
    @Inject('IHtmlParsingStrategy')
    private readonly htmlStrategy: IParsingStrategy,
    @Inject('IRssParsingStrategy')
    private readonly rssStrategy: IParsingStrategy,
  ) {
    this.strategyMap = new Map([
      [SourceTypeEnum.WEB, this.htmlStrategy],
      [SourceTypeEnum.RSS, this.rssStrategy],
      [SourceTypeEnum.SOCIAL_MEDIA, this.htmlStrategy],
      [SourceTypeEnum.WIKIPEDIA, this.htmlStrategy],
    ]);
  }

  async parse(
    rawContent: string,
    sourceType: SourceType,
    metadata?: ContentMetadata,
  ): Promise<ParsedContent> {
    const startTime = Date.now();
    const strategy = this.getStrategy(sourceType);

    const options: ParsingOptions = {
      preserveLinks: true,
      preserveImages: true,
      codeBlockStyle: 'fenced',
      headingStyle: 'atx',
    };

    const [markdown, extractedMetadata] = await Promise.all([
      strategy.parse(rawContent, options),
      strategy.extractMetadata(rawContent),
    ]);

    const conversionTimeMs = Date.now() - startTime;

    const parsingInfo: ParsingInfo = {
      parser: strategy.constructor.name,
      originalFormat: this.getOriginalFormat(sourceType),
      conversionTimeMs,
      warnings: this.collectWarnings(markdown, extractedMetadata),
    };

    return {
      markdown,
      extractedMetadata: this.mergeMetadata(extractedMetadata, metadata),
      parsingInfo,
    };
  }

  private getStrategy(sourceType: SourceType): IParsingStrategy {
    const strategy = this.strategyMap.get(sourceType.getValue());
    if (!strategy) {
      throw new UnsupportedSourceTypeError(
        `No parsing strategy registered for source type: ${sourceType.toString()}`,
      );
    }
    return strategy;
  }

  private getOriginalFormat(sourceType: SourceType): string {
    const formatMap: Record<SourceTypeEnum, string> = {
      [SourceTypeEnum.WEB]: 'text/html',
      [SourceTypeEnum.RSS]: 'application/rss+xml',
      [SourceTypeEnum.SOCIAL_MEDIA]: 'text/html',
      [SourceTypeEnum.WIKIPEDIA]: 'text/html',
      [SourceTypeEnum.PDF]: 'application/pdf',
      [SourceTypeEnum.OCR]: 'image/*',
    };
    return formatMap[sourceType.getValue()] || 'text/plain';
  }

  private collectWarnings(
    markdown: string,
    metadata: ExtractedMetadata,
  ): string[] | undefined {
    const warnings: string[] = [];

    if (!markdown || markdown.trim().length === 0) {
      warnings.push('Parsing produced empty markdown content');
    }

    if (!metadata.title) {
      warnings.push('Could not extract title from content');
    }

    return warnings.length > 0 ? warnings : undefined;
  }

  private mergeMetadata(
    extracted: ExtractedMetadata,
    provided?: ContentMetadata,
  ): ExtractedMetadata {
    if (!provided) return extracted;

    return {
      ...extracted,
      title: extracted.title || provided.title || undefined,
      author: extracted.author || provided.author || undefined,
      publishedAt: extracted.publishedAt || provided.publishedAt || undefined,
    };
  }
}
