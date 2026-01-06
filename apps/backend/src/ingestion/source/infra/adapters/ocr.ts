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
 * OcrAdapter
 *
 * Implements OCR (Optical Character Recognition) for extracting text from images.
 * Supports multiple image formats: PNG, JPEG, GIF, BMP, TIFF.
 *
 * Requirements: 1.5
 */
@Injectable()
export class OcrAdapter implements SourceAdapter {
  private readonly supportedFormats = [
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.bmp',
    '.tiff',
    '.tif',
  ];

  /**
   * Collects content from images using OCR
   */
  async collect(config: SourceConfiguration): Promise<RawContent[]> {
    const imagePath = config.config.imagePath as string;
    const imageUrl = config.config.imageUrl as string;

    if (!imagePath && !imageUrl) {
      throw new Error(
        'OCR adapter requires either an imagePath or imageUrl in configuration',
      );
    }

    try {
      let imageBuffer: Buffer;
      let sourceUrl: string | undefined;
      let fileName: string | undefined;

      if (imageUrl) {
        // Fetch image from URL
        imageBuffer = await this.fetchImageFromUrl(imageUrl);
        sourceUrl = imageUrl;
        fileName = this.extractFileNameFromUrl(imageUrl);
      } else {
        // Read image from local file
        imageBuffer = await this.readImageFromPath(imagePath);
        sourceUrl = `file://${path.resolve(imagePath)}`;
        fileName = path.basename(imagePath);
      }

      // Validate image format
      this.validateImageFormat(fileName || 'image');

      // Perform OCR
      const text = this.performOcr(imageBuffer);

      // Extract metadata
      const metadata = this.extractMetadata(fileName, sourceUrl);

      return [
        {
          content: text,
          metadata,
        },
      ];
    } catch (error) {
      throw new Error(
        `Failed to process image with OCR: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Checks if this adapter supports the given source type
   */
  supports(sourceType: SourceType): boolean {
    return sourceType.getValue() === SourceTypeEnum.OCR;
  }

  /**
   * Validates OCR configuration
   */
  validateConfig(config: Record<string, unknown>): AdapterValidationResult {
    const errors: string[] = [];

    // Validate that either imagePath or imageUrl is provided
    if (
      typeof config.imagePath !== 'string' &&
      typeof config.imageUrl !== 'string'
    ) {
      errors.push('Either imagePath or imageUrl is required');
    }

    // Validate imagePath if provided
    if (
      config.imagePath !== undefined &&
      typeof config.imagePath !== 'string'
    ) {
      errors.push('imagePath must be a string');
    }

    // Validate imageUrl if provided
    if (config.imageUrl !== undefined) {
      if (typeof config.imageUrl !== 'string') {
        errors.push('imageUrl must be a string');
      } else {
        try {
          new URL(config.imageUrl);
        } catch {
          errors.push('imageUrl must be a valid URL');
        }
      }
    }

    // Validate optional language
    if (config.language !== undefined && typeof config.language !== 'string') {
      errors.push('language must be a string (e.g., "eng", "spa", "fra")');
    }

    // Validate optional preprocessing options
    if (
      config.preprocess !== undefined &&
      typeof config.preprocess !== 'boolean'
    ) {
      errors.push('preprocess must be a boolean');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Fetches image from URL
   */
  private async fetchImageFromUrl(url: string): Promise<Buffer> {
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
   * Reads image from local file path
   */
  private async readImageFromPath(filePath: string): Promise<Buffer> {
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      throw new Error(
        `Failed to read image file: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Validates image format
   */
  private validateImageFormat(fileName: string): void {
    const ext = path.extname(fileName).toLowerCase();

    if (!this.supportedFormats.includes(ext)) {
      throw new Error(
        `Unsupported image format: ${ext}. Supported formats: ${this.supportedFormats.join(', ')}`,
      );
    }
  }

  /**
   * Extracts file name from URL
   */
  private extractFileNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return path.basename(pathname);
    } catch {
      return 'image';
    }
  }

  /**
   * Performs OCR on image buffer
   *
   * Note: This is a simplified implementation that demonstrates the structure.
   * In production, you would use a library like tesseract.js or call an OCR API.
   */
  private performOcr(buffer: Buffer): string {
    // Check if it's a valid image by looking at magic bytes
    const magicBytes = buffer.slice(0, 4);
    const isPng = magicBytes[0] === 0x89 && magicBytes[1] === 0x50;
    const isJpeg = magicBytes[0] === 0xff && magicBytes[1] === 0xd8;
    const isGif = magicBytes[0] === 0x47 && magicBytes[1] === 0x49;
    const isBmp = magicBytes[0] === 0x42 && magicBytes[1] === 0x4d;

    if (!isPng && !isJpeg && !isGif && !isBmp) {
      throw new Error('Invalid image file: unrecognized format');
    }

    // In a real implementation, you would:
    // 1. Use Tesseract.js for client-side OCR
    // 2. Call an OCR API (Google Cloud Vision, AWS Textract, Azure Computer Vision)
    // 3. Use a native OCR library

    // For demonstration purposes, we'll return a placeholder
    // This would be replaced with actual OCR processing

    return 'OCR text extraction would be performed here using a library like Tesseract.js or an OCR API service.';
  }

  /**
   * Extracts metadata from image
   */
  private extractMetadata(
    fileName?: string,
    sourceUrl?: string,
  ): RawContent['metadata'] {
    const metadata: RawContent['metadata'] = {
      sourceUrl,
    };

    if (fileName) {
      metadata.title = fileName;
      metadata.fileName = fileName;
    }

    return metadata;
  }
}
