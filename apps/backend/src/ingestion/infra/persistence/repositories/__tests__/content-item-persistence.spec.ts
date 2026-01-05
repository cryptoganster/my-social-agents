import * as fc from 'fast-check';
import { Repository, InsertResult } from 'typeorm';
import {
  ContentItem,
  ContentHash,
  ContentMetadata,
  AssetTag,
} from '@/ingestion/domain';
import { TypeOrmContentItemWriteRepository } from '../content-item-write';
import { TypeOrmContentItemReadRepository } from '../content-item-read';
import { TypeOrmContentItemFactory } from '../../factories/content-item-factory';
import { ContentItemEntity } from '../../entities/content-item';

/**
 * Property-Based Tests for ContentItem Persistence
 *
 * Feature: content-ingestion
 * Property 21: Content Persistence
 *
 * Validates: Requirements 10.1
 *
 * For any validated content item, persisting it should result in the item being
 * retrievable by its contentId, and the retrieved item should match the original.
 */
describe('ContentItem Persistence Properties', () => {
  let writeRepo: TypeOrmContentItemWriteRepository;
  let readRepo: TypeOrmContentItemReadRepository;
  let factory: TypeOrmContentItemFactory;
  let mockRepository: jest.Mocked<Repository<ContentItemEntity>>;

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      insert: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<ContentItemEntity>>;

    // Create repositories and factory
    writeRepo = new TypeOrmContentItemWriteRepository(mockRepository);
    readRepo = new TypeOrmContentItemReadRepository(mockRepository);
    factory = new TypeOrmContentItemFactory(readRepo);
  });

  /**
   * Property 21: Content Persistence
   *
   * For any content item, persisting it and then retrieving it should return
   * an item that matches the original in all properties.
   */
  it('should persist and retrieve content items correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generators for content item properties
        fc.uuid(),
        fc.uuid(),
        fc.stringMatching(/^[0-9a-f]{64}$/), // 64-character hex string
        fc.string({ minLength: 10, maxLength: 1000 }),
        fc.string({ minLength: 10, maxLength: 1000 }),
        fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
        fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
        fc.option(fc.date({ max: new Date() }), { nil: null }), // Only past dates
        fc.option(fc.constantFrom('en', 'es', 'fr', 'de', 'zh'), { nil: null }),
        fc.option(fc.webUrl(), { nil: null }),
        fc.array(
          fc.record({
            symbol: fc.constantFrom('BTC', 'ETH', 'SOL', 'ADA', 'DOT'),
            confidence: fc.double({ min: 0, max: 1 }),
          }),
          { minLength: 0, maxLength: 5 },
        ),
        fc.date(),
        async (
          contentId,
          sourceId,
          hashValue,
          rawContent,
          normalizedContent,
          title,
          author,
          publishedAt,
          language,
          sourceUrl,
          assetTagsData,
          collectedAt,
        ) => {
          // Create content item aggregate
          const contentHash = ContentHash.create(hashValue);
          const metadata = ContentMetadata.create({
            title,
            author,
            publishedAt,
            language,
            sourceUrl,
          });
          const assetTags = assetTagsData.map((tag) => AssetTag.create(tag));

          const contentItem = ContentItem.reconstitute({
            contentId,
            sourceId,
            contentHash,
            rawContent,
            normalizedContent,
            metadata,
            assetTags,
            collectedAt,
            version: 0,
          });

          // Mock the insert operation
          mockRepository.insert.mockResolvedValue({} as InsertResult);

          // Mock the findOne operation to return the persisted data
          const mockEntity: ContentItemEntity = {
            contentId,
            sourceId,
            contentHash: hashValue,
            rawContent,
            normalizedContent,
            title,
            author,
            publishedAt,
            language,
            sourceUrl,
            assetTags: assetTagsData,
            collectedAt,
            version: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          mockRepository.findOne.mockResolvedValue(mockEntity);

          // Persist the content item
          await writeRepo.save(contentItem);

          // Retrieve the content item
          const retrieved = await factory.load(contentId);

          // Verify the item was retrieved
          expect(retrieved).not.toBeNull();
          expect(retrieved!.contentId).toBe(contentId);
          expect(retrieved!.sourceId).toBe(sourceId);
          expect(retrieved!.contentHash.equals(contentHash)).toBe(true);
          expect(retrieved!.rawContent).toBe(rawContent);
          expect(retrieved!.normalizedContent).toBe(normalizedContent);
          expect(retrieved!.metadata.title).toBe(title);
          expect(retrieved!.metadata.author).toBe(author);
          expect(retrieved!.metadata.language).toBe(language);
          expect(retrieved!.metadata.sourceUrl).toBe(sourceUrl);
          expect(retrieved!.assetTags).toHaveLength(assetTagsData.length);
          expect(retrieved!.version.value).toBe(0); // Access version.value

          // Verify asset tags
          retrieved!.assetTags.forEach((tag, index) => {
            expect(tag.symbol).toBe(assetTagsData[index].symbol);
            expect(tag.confidence).toBe(assetTagsData[index].confidence);
          });
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 21: Content Persistence (Edge Case - Empty Asset Tags)
   *
   * Content items with no asset tags should persist and retrieve correctly.
   */
  it('should handle content items with no asset tags', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.stringMatching(/^[0-9a-f]{64}$/), // 64-character hex string
        fc.string({ minLength: 10, maxLength: 500 }),
        fc.date(),
        async (contentId, sourceId, hashValue, content, collectedAt) => {
          const contentHash = ContentHash.create(hashValue);
          const metadata = ContentMetadata.create({
            title: null,
            author: null,
            publishedAt: null,
            language: null,
            sourceUrl: null,
          });

          const contentItem = ContentItem.reconstitute({
            contentId,
            sourceId,
            contentHash,
            rawContent: content,
            normalizedContent: content,
            metadata,
            assetTags: [], // Empty array
            collectedAt,
            version: 0,
          });

          // Mock operations
          mockRepository.insert.mockResolvedValue({} as InsertResult);
          const mockEntity: ContentItemEntity = {
            contentId,
            sourceId,
            contentHash: hashValue,
            rawContent: content,
            normalizedContent: content,
            title: null,
            author: null,
            publishedAt: null,
            language: null,
            sourceUrl: null,
            assetTags: [],
            collectedAt,
            version: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          mockRepository.findOne.mockResolvedValue(mockEntity);

          // Persist and retrieve
          await writeRepo.save(contentItem);
          const retrieved = await factory.load(contentId);

          // Verify
          expect(retrieved).not.toBeNull();
          expect(retrieved!.assetTags).toHaveLength(0);
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property 21: Content Persistence (Edge Case - All Metadata Fields Populated)
   *
   * Content items with all metadata fields should persist correctly.
   */
  it('should preserve all metadata fields when populated', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.stringMatching(/^[0-9a-f]{64}$/), // 64-character hex string
        fc.string({ minLength: 10, maxLength: 500 }),
        fc.string({ minLength: 5, maxLength: 200 }),
        fc.string({ minLength: 3, maxLength: 100 }),
        fc.date({ max: new Date() }), // Only past dates
        fc.constantFrom('en', 'es', 'fr', 'de', 'zh', 'ja', 'pt'),
        fc.webUrl(),
        fc.date(),
        async (
          contentId,
          sourceId,
          hashValue,
          content,
          title,
          author,
          publishedAt,
          language,
          sourceUrl,
          collectedAt,
        ) => {
          const contentHash = ContentHash.create(hashValue);
          const metadata = ContentMetadata.create({
            title,
            author,
            publishedAt,
            language,
            sourceUrl,
          });

          const contentItem = ContentItem.reconstitute({
            contentId,
            sourceId,
            contentHash,
            rawContent: content,
            normalizedContent: content,
            metadata,
            assetTags: [],
            collectedAt,
            version: 0,
          });

          // Mock operations
          mockRepository.insert.mockResolvedValue({} as InsertResult);
          const mockEntity: ContentItemEntity = {
            contentId,
            sourceId,
            contentHash: hashValue,
            rawContent: content,
            normalizedContent: content,
            title,
            author,
            publishedAt,
            language,
            sourceUrl,
            assetTags: [],
            collectedAt,
            version: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          mockRepository.findOne.mockResolvedValue(mockEntity);

          // Persist and retrieve
          await writeRepo.save(contentItem);
          const retrieved = await factory.load(contentId);

          // Verify all metadata fields
          expect(retrieved).not.toBeNull();
          expect(retrieved!.metadata.title).toBe(title);
          expect(retrieved!.metadata.author).toBe(author);
          expect(retrieved!.metadata.publishedAt).toEqual(publishedAt);
          expect(retrieved!.metadata.language).toBe(language);
          expect(retrieved!.metadata.sourceUrl).toBe(sourceUrl);
        },
      ),
      { numRuns: 30 },
    );
  });
});
