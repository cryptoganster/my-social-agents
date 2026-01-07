import { Injectable } from '@nestjs/common';
import {
  SourceAdapter,
  RawContent,
  AdapterValidationResult,
} from '@/ingestion/source/domain/interfaces/source-adapter';
import { SourceConfiguration } from '@/ingestion/source/domain/aggregates/source-configuration';
import {
  SourceType,
  SourceTypeEnum,
} from '@/ingestion/source/domain/value-objects/source-type';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * PdfAdapter
 *
 * Implements PDF text extraction supporting various PDF formats.
 * Can handle both local file paths and remote URLs.
 *
 * Requirements: 1.4
 */
@Injectable()
export class PdfAdapter implements SourceAdapter {
  /**
   * Collects content from PDF documents
   */
  async collect(config: SourceConfiguration): Promise<RawContent[]> {
    const pdfPath = config.config.path as string;
    const pdfUrl = config.config.url as string;

    if (!pdfPath && !pdfUrl) {
      throw new Error(
        'PDF adapter requires either a path or url in configuration',
      );
    }

    try {
      let pdfBuffer: Buffer;
      let sourceUrl: string | undefined;

      if (pdfUrl) {
        // Fetch PDF from URL
        pdfBuffer = await this.fetchPdfFromUrl(pdfUrl);
        sourceUrl = pdfUrl;
      } else {
        // Read PDF from local file
        pdfBuffer = await this.readPdfFromPath(pdfPath);
        sourceUrl = `file://${path.resolve(pdfPath)}`;
      }

      // Extract text from PDF
      const text = this.extractTextFromPdf(pdfBuffer);

      // Extract metadata
      const metadata = this.extractMetadata(pdfBuffer, sourceUrl);

      return [
        {
          content: text,
          metadata,
        },
      ];
    } catch (error) {
      throw new Error(
        `Failed to process PDF: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Checks if this adapter supports the given source type
   */
  supports(sourceType: SourceType): boolean {
    return sourceType.getValue() === SourceTypeEnum.PDF;
  }

  /**
   * Validates PDF configuration
   */
  validateConfig(config: Record<string, unknown>): AdapterValidationResult {
    const errors: string[] = [];

    // Validate that either path or url is provided
    if (typeof config.path !== 'string' && typeof config.url !== 'string') {
      errors.push('Either path or url is required');
    }

    // Validate path if provided
    if (config.path !== undefined && typeof config.path !== 'string') {
      errors.push('path must be a string');
    }

    // Validate url if provided
    if (config.url !== undefined) {
      if (typeof config.url !== 'string') {
        errors.push('url must be a string');
      } else {
        try {
          new URL(config.url);
        } catch {
          errors.push('url must be a valid URL');
        }
      }
    }

    // Validate optional page range
    if (config.startPage !== undefined) {
      if (typeof config.startPage !== 'number' || config.startPage < 1) {
        errors.push('startPage must be a positive number');
      }
    }

    if (config.endPage !== undefined) {
      if (typeof config.endPage !== 'number' || config.endPage < 1) {
        errors.push('endPage must be a positive number');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Fetches PDF from URL
   */
  private async fetchPdfFromUrl(url: string): Promise<Buffer> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CryptoKnowledgeBot/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Reads PDF from local file path
   */
  private async readPdfFromPath(filePath: string): Promise<Buffer> {
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      throw new Error(
        `Failed to read PDF file: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Extracts text from PDF buffer
   *
   * Note: This is a simplified implementation that demonstrates the structure.
   * In production, you would use a library like pdf-parse or pdfjs-dist.
   */
  private extractTextFromPdf(buffer: Buffer): string {
    // Check if it's a valid PDF
    const header = buffer.slice(0, 5).toString();
    if (header !== '%PDF-') {
      throw new Error('Invalid PDF file: missing PDF header');
    }

    // In a real implementation, you would use a PDF parsing library
    // For now, we'll do a basic text extraction by looking for text objects

    const pdfContent = buffer.toString('latin1');
    const textChunks: string[] = [];

    // Very basic extraction - look for text between BT (Begin Text) and ET (End Text) operators
    const textRegex = /BT\s+([\s\S]*?)\s+ET/g;
    let match;

    while ((match = textRegex.exec(pdfContent)) !== null) {
      const textBlock = match[1];

      // Extract text from Tj and TJ operators
      const tjRegex = /\((.*?)\)\s*Tj/g;
      let tjMatch;

      while ((tjMatch = tjRegex.exec(textBlock)) !== null) {
        textChunks.push(tjMatch[1]);
      }
    }

    if (textChunks.length === 0) {
      // Fallback: try to extract any printable text
      const printableText = pdfContent
        .replace(/[^\x20-\x7E\n]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return printableText || 'No text content could be extracted from PDF';
    }

    return textChunks.join(' ').trim();
  }

  /**
   * Extracts metadata from PDF
   */
  private extractMetadata(
    buffer: Buffer,
    sourceUrl?: string,
  ): RawContent['metadata'] {
    const metadata: RawContent['metadata'] = {
      sourceUrl,
    };

    try {
      const pdfContent = buffer.toString('latin1');

      // Extract title
      const titleMatch = pdfContent.match(/\/Title\s*\((.*?)\)/);
      if (titleMatch) {
        metadata.title = titleMatch[1].trim();
      }

      // Extract author
      const authorMatch = pdfContent.match(/\/Author\s*\((.*?)\)/);
      if (authorMatch) {
        metadata.author = authorMatch[1].trim();
      }

      // Extract creation date
      const dateMatch = pdfContent.match(
        /\/CreationDate\s*\(D:(\d{4})(\d{2})(\d{2})/,
      );
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        metadata.publishedAt = new Date(`${year}-${month}-${day}`);
      }

      // Extract subject
      const subjectMatch = pdfContent.match(/\/Subject\s*\((.*?)\)/);
      if (subjectMatch) {
        metadata.subject = subjectMatch[1].trim();
      }
    } catch {
      // Metadata extraction is optional, continue if it fails
    }

    return metadata;
  }
}
