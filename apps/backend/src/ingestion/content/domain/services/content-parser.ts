import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
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
import { IJsRenderingDetector } from '../interfaces/services/js-rendering-detector';

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
  private readonly logger = new Logger(ContentParser.name);
  private readonly strategyMap: Map<SourceTypeEnum, IParsingStrategy>;

  constructor(
    @Inject('IHtmlParsingStrategy')
    private readonly htmlStrategy: IParsingStrategy,
    @Inject('IRssParsingStrategy')
    private readonly rssStrategy: IParsingStrategy,
    @Optional()
    @Inject('IFirecrawlParsingStrategy')
    private readonly firecrawlStrategy: IParsingStrategy | null = null,
    @Optional()
    @Inject('IJsRenderingDetector')
    private readonly jsDetector: IJsRenderingDetector | null = null,
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

    let [markdown, extractedMetadata] = await Promise.all([
      strategy.parse(rawContent, options),
      strategy.extractMetadata(rawContent),
    ]);

    // Fallback logic for WEB sources with minimal content
    if (
      this.shouldFallbackToFirecrawl(rawContent, markdown, sourceType, metadata)
    ) {
      this.logger.debug(
        `Falling back to Firecrawl for URL: ${metadata?.sourceUrl || 'unknown'}`,
      );

      try {
        // Use Firecrawl strategy with URL from metadata
        const firecrawlOptions: ParsingOptions = {
          ...options,
          url: metadata?.sourceUrl ?? undefined,
        };

        const [firecrawlMarkdown, firecrawlMetadata] = await Promise.all([
          this.firecrawlStrategy!.parse(rawContent, firecrawlOptions),
          this.firecrawlStrategy!.extractMetadata(rawContent),
        ]);

        markdown = firecrawlMarkdown;
        extractedMetadata = firecrawlMetadata;

        this.logger.debug(
          `Firecrawl fallback successful for URL: ${metadata?.sourceUrl || 'unknown'}`,
        );
      } catch (error) {
        this.logger.warn(
          `Firecrawl fallback failed for URL: ${metadata?.sourceUrl || 'unknown'}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        // Continue with original markdown if fallback fails
      }
    }

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

  private shouldFallbackToFirecrawl(
    rawContent: string,
    markdown: string,
    sourceType: SourceType,
    metadata?: ContentMetadata,
  ): boolean {
    // Only fallback for WEB sources
    if (sourceType.getValue() !== SourceTypeEnum.WEB) {
      return false;
    }

    // Fallback not available if dependencies are missing
    if (!this.firecrawlStrategy || !this.jsDetector) {
      return false;
    }

    // Check if content is minimal (less than 200 characters)
    if (markdown.length >= 200) {
      return false;
    }

    // Use JS rendering detector to decide
    const url = metadata?.sourceUrl || '';
    return this.jsDetector.needsJsRendering(rawContent, url);
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
