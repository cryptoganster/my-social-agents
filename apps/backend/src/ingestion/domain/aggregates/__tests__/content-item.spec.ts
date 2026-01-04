import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { ContentItem } from '../content-item';
import { ContentHash, ContentMetadata, AssetTag } from '../../value-objects';

describe('ContentItem', () => {
  describe('Unit Tests', () => {
    it('should create a valid ContentItem', () => {
      const contentItem = ContentItem.create({
        contentId: 'content-123',
        sourceId: 'source-456',
        contentHash: ContentHash.create('a'.repeat(64)),
        rawContent: 'Raw content here',
        normalizedContent: 'Normalized content here',
        metadata: ContentMetadata.create({
          title: 'Test Article',
          sourceUrl: 'https://example.com/article',
        }),
        assetTags: [],
        collectedAt: new Date(),
      });

      expect(contentItem.contentId).toBe('content-123');
      expect(contentItem.sourceId).toBe('source-456');
      expect(contentItem.normalizedContent).toBe('Normalized content here');
    });

    it('should validate and reject content that is too short', () => {
      expect(() =>
        ContentItem.create({
          contentId: 'content-123',
          sourceId: 'source-456',
          contentHash: ContentHash.create('a'.repeat(64)),
          rawContent: 'Short',
          normalizedContent: 'Short',
          metadata: ContentMetadata.create({
            title: 'Test',
            sourceUrl: 'https://example.com',
          }),
          assetTags: [],
          collectedAt: new Date(),
        }),
      ).toThrow('Content is too short');
    });

    it('should validate and reject content without required metadata', () => {
      expect(() =>
        ContentItem.create({
          contentId: 'content-123',
          sourceId: 'source-456',
          contentHash: ContentHash.create('a'.repeat(64)),
          rawContent: 'This is some raw content',
          normalizedContent: 'This is normalized content',
          metadata: ContentMetadata.create({}),
          assetTags: [],
          collectedAt: new Date(),
        }),
      ).toThrow('Metadata must have at least title or sourceUrl');
    });

    it('should detect duplicates by hash', () => {
      const hash1 = ContentHash.create('a'.repeat(64));
      const hash2 = ContentHash.create('a'.repeat(64));
      const hash3 = ContentHash.create('b'.repeat(64));

      const contentItem = ContentItem.create({
        contentId: 'content-123',
        sourceId: 'source-456',
        contentHash: hash1,
        rawContent: 'Raw content here',
        normalizedContent: 'Normalized content here',
        metadata: ContentMetadata.create({
          title: 'Test Article',
        }),
        assetTags: [],
        collectedAt: new Date(),
      });

      expect(contentItem.isDuplicate(hash2)).toBe(true);
      expect(contentItem.isDuplicate(hash3)).toBe(false);
    });

    it('should add asset tags', () => {
      const contentItem = ContentItem.create({
        contentId: 'content-123',
        sourceId: 'source-456',
        contentHash: ContentHash.create('a'.repeat(64)),
        rawContent: 'Bitcoin and Ethereum news',
        normalizedContent: 'Bitcoin and Ethereum news',
        metadata: ContentMetadata.create({
          title: 'Crypto News',
        }),
        assetTags: [],
        collectedAt: new Date(),
      });

      const btcTag = AssetTag.create({ symbol: 'BTC', confidence: 0.9 });
      const ethTag = AssetTag.create({ symbol: 'ETH', confidence: 0.85 });

      contentItem.addAssetTag(btcTag);
      contentItem.addAssetTag(ethTag);

      expect(contentItem.assetTags).toHaveLength(2);
      expect(contentItem.hasAssetTag('BTC')).toBe(true);
      expect(contentItem.hasAssetTag('ETH')).toBe(true);
    });

    it('should not add duplicate asset tags', () => {
      const contentItem = ContentItem.create({
        contentId: 'content-123',
        sourceId: 'source-456',
        contentHash: ContentHash.create('a'.repeat(64)),
        rawContent: 'Bitcoin news',
        normalizedContent: 'Bitcoin news',
        metadata: ContentMetadata.create({
          title: 'Crypto News',
        }),
        assetTags: [],
        collectedAt: new Date(),
      });

      const btcTag1 = AssetTag.create({ symbol: 'BTC', confidence: 0.9 });
      const btcTag2 = AssetTag.create({ symbol: 'BTC', confidence: 0.95 });

      contentItem.addAssetTag(btcTag1);
      contentItem.addAssetTag(btcTag2);

      expect(contentItem.assetTags).toHaveLength(1);
    });

    it('should get high confidence tags', () => {
      const contentItem = ContentItem.create({
        contentId: 'content-123',
        sourceId: 'source-456',
        contentHash: ContentHash.create('a'.repeat(64)),
        rawContent: 'Crypto news',
        normalizedContent: 'Crypto news',
        metadata: ContentMetadata.create({
          title: 'Crypto News',
        }),
        assetTags: [
          AssetTag.create({ symbol: 'BTC', confidence: 0.9 }),
          AssetTag.create({ symbol: 'ETH', confidence: 0.7 }),
          AssetTag.create({ symbol: 'ADA', confidence: 0.85 }),
        ],
        collectedAt: new Date(),
      });

      const highConfidenceTags = contentItem.getHighConfidenceTags();
      expect(highConfidenceTags).toHaveLength(2);
      expect(highConfidenceTags.map((t) => t.symbol)).toContain('BTC');
      expect(highConfidenceTags.map((t) => t.symbol)).toContain('ADA');
    });
  });

  describe('Property-Based Tests', () => {
    // Helper generator for non-whitespace strings
    const nonWhitespaceString = (
      minLength: number,
      maxLength: number,
    ): fc.Arbitrary<string> =>
      fc
        .string({ minLength, maxLength })
        .filter((s) => s.trim().length >= minLength);

    // Feature: content-ingestion, Property 2: Content Normalization Consistency
    // Validates: Requirements 2.1, 2.2
    it('should always produce ContentItem with all required fields populated', () => {
      fc.assert(
        fc.property(
          nonWhitespaceString(1, 50), // contentId
          nonWhitespaceString(1, 50), // sourceId
          nonWhitespaceString(10, 1000), // rawContent
          nonWhitespaceString(10, 1000), // normalizedContent
          fc.option(nonWhitespaceString(1, 200), { nil: null }), // title
          fc.option(fc.webUrl(), { nil: null }), // sourceUrl
          fc.date({ min: new Date('2020-01-01'), max: new Date() }), // collectedAt
          (
            contentId: string,
            sourceId: string,
            rawContent: string,
            normalizedContent: string,
            title: string | null,
            sourceUrl: string | null,
            collectedAt: Date,
          ) => {
            // Ensure at least one of title or sourceUrl is present
            const metadata = ContentMetadata.create({
              title:
                title !== null && title.length > 0
                  ? title
                  : sourceUrl !== null && sourceUrl.length > 0
                    ? null
                    : 'Default Title',
              sourceUrl:
                sourceUrl !== null && sourceUrl.length > 0
                  ? sourceUrl
                  : title !== null && title.length > 0
                    ? null
                    : 'https://example.com',
            });

            const contentHash = ContentHash.create('a'.repeat(64));

            const contentItem = ContentItem.create({
              contentId,
              sourceId,
              contentHash,
              rawContent,
              normalizedContent,
              metadata,
              assetTags: [],
              collectedAt,
            });

            // Verify all required fields are populated
            expect(contentItem.contentId).toBeTruthy();
            expect(contentItem.sourceId).toBeTruthy();
            expect(contentItem.contentHash).toBeTruthy();
            expect(contentItem.normalizedContent).toBeTruthy();
            expect(contentItem.metadata).toBeTruthy();
            expect(contentItem.collectedAt).toBeTruthy();
            expect(contentItem.assetTags).toBeDefined();

            // Verify validation passes
            const validation = contentItem.validate();
            expect(validation.isValid).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    // Feature: content-ingestion, Property 6: Duplicate Detection Accuracy
    // Validates: Requirements 3.2, 3.3
    it('should detect duplicates when content has the same hash', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[0-9a-f]{64}$/), // hash string (64 hex chars)
          nonWhitespaceString(10, 1000), // content
          (hashStr: string, content: string) => {
            const hash1 = ContentHash.create(hashStr);
            const hash2 = ContentHash.create(hashStr);

            const contentItem1 = ContentItem.create({
              contentId: 'content-1',
              sourceId: 'source-1',
              contentHash: hash1,
              rawContent: content,
              normalizedContent: content,
              metadata: ContentMetadata.create({
                title: 'Test Article',
              }),
              assetTags: [],
              collectedAt: new Date(),
            });

            // Same hash should be detected as duplicate
            expect(contentItem1.isDuplicate(hash2)).toBe(true);

            // Different hash should not be detected as duplicate
            const differentHash = ContentHash.create(
              hashStr.split('').reverse().join(''),
            );
            expect(contentItem1.isDuplicate(differentHash)).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
