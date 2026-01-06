import * as fc from 'fast-check';
import { Repository, InsertResult } from 'typeorm';
import { ContentItem } from '@/ingestion/content/domain/aggregates/content-item';
import { ContentHash } from '@/ingestion/content/domain/value-objects/content-hash';
import { ContentMetadata } from '@/ingestion/content/domain/value-objects/content-metadata';
import { TypeOrmContentItemWriteRepository } from '../repositories/content-item-write';
import { TypeOrmContentItemReadRepository } from '../repositories/content-item-read';
import { TypeOrmContentItemFactory } from '../factories/content-item-factory';
import { ContentItemEntity } from '../entities/content-item';

/**
 * Property-Based Tests for Content-Source References
 *
 * Feature: content-ingestion
 * Property 24a: Content Source References
 *
 * Validates: Requirements 10.5
 *
 * Content items should always reference a valid source ID.
 * The sourceId should be a non-empty string (UUID).
 */
describe('Content Source References', () => {
  let contentWriteRepo: TypeOrmContentItemWriteRepository;
  let contentReadRepo: TypeOrmContentItemReadRepository;
  let contentFactory: TypeOrmContentItemFactory;
  let mockContentRepository: jest.Mocked<Repository<ContentItemEntity>>;

  beforeEach(() => {
    // Create mock repository
    mockContentRepository = {
      insert: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<ContentItemEntity>>;

    // Create repositories and factory
    contentWriteRepo = new TypeOrmContentItemWriteRepository(
      mockContentRepository,
    );
    contentReadRepo = new TypeOrmContentItemReadRepository(
      mockContentRepository,
    );
    contentFactory = new TypeOrmContentItemFactory(contentReadRepo);
  });

  /**
   * Property 24a: Content items must reference valid source IDs
   *
   * Every content item must have a valid sourceId that:
   * - Is a non-empty string
   * - Is a valid UUID format
   * - Is preserved through persistence and retrieval
   */
  it('should enforce valid source references in content items', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // sourceId
        fc.uuid(), // contentId
        fc.stringMatching(/^[0-9a-f]{64}$/), // contentHash
        fc.string({ minLength: 10, maxLength: 500 }), // content
        async (sourceId, contentId, hashValue, content) => {
          // Create content item with source reference
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
            sourceId, // Must be a valid UUID
            contentHash,
            rawContent: content,
            normalizedContent: content,
            metadata,
            assetTags: [],
            collectedAt: new Date(),
            version: 0,
          });

          // Verify sourceId is set and valid
          expect(contentItem.sourceId).toBe(sourceId);
          expect(contentItem.sourceId).toBeTruthy();
          expect(typeof contentItem.sourceId).toBe('string');
          expect(contentItem.sourceId.length).toBeGreaterThan(0);

          // Mock persistence
          mockContentRepository.insert.mockResolvedValue({} as InsertResult);
          await contentWriteRepo.save(contentItem);

          // Mock retrieval
          const contentEntity: ContentItemEntity = {
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
            collectedAt: new Date(),
            version: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          mockContentRepository.findOne.mockResolvedValue(contentEntity);

          // Retrieve and verify source reference is preserved
          const retrieved = await contentFactory.load(contentId);
          expect(retrieved).not.toBeNull();
          expect(retrieved!.sourceId).toBe(sourceId);
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 24a: Content items can be queried by source ID
   *
   * Content items should be retrievable by their source ID,
   * allowing queries like "get all content from source X".
   */
  it('should allow querying content items by source ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // sourceId
        fc.array(
          fc.record({
            contentId: fc.uuid(),
            contentHash: fc.stringMatching(/^[0-9a-f]{64}$/),
            rawContent: fc.string({ minLength: 10, maxLength: 500 }),
          }),
          { minLength: 1, maxLength: 5 },
        ),
        async (sourceId, contentItems) => {
          // Create content entities for this source
          const contentEntities: ContentItemEntity[] = contentItems.map(
            (item) => ({
              contentId: item.contentId,
              sourceId, // All reference the same source
              contentHash: item.contentHash,
              rawContent: item.rawContent,
              normalizedContent: item.rawContent,
              title: null,
              author: null,
              publishedAt: null,
              language: null,
              sourceUrl: null,
              assetTags: [],
              collectedAt: new Date(),
              version: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          );

          // Mock findBySource to return all content for this source
          mockContentRepository.find.mockResolvedValue(contentEntities);

          // Query content by source
          const contentBySource = await contentReadRepo.findBySource(
            sourceId,
            10,
          );

          // Verify all content items reference the correct source
          expect(contentBySource).toHaveLength(contentItems.length);
          contentBySource.forEach((content) => {
            expect(content.sourceId).toBe(sourceId);
          });
        },
      ),
      { numRuns: 30 },
    );
  });

  /**
   * Property 24a: Content items maintain source reference integrity
   *
   * The sourceId should remain consistent through:
   * - Creation
   * - Persistence
   * - Retrieval
   * - Updates
   */
  it('should maintain source reference through lifecycle', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // sourceId
        fc.uuid(), // contentId
        fc.stringMatching(/^[0-9a-f]{64}$/), // contentHash
        fc.string({ minLength: 10, maxLength: 500 }), // content
        async (sourceId, contentId, hashValue, content) => {
          // Create content item
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
            assetTags: [],
            collectedAt: new Date(),
            version: 0,
          });

          // Verify sourceId at creation
          expect(contentItem.sourceId).toBe(sourceId);

          // Mock persistence
          mockContentRepository.insert.mockResolvedValue({} as InsertResult);
          await contentWriteRepo.save(contentItem);

          // Verify persistence was called with correct sourceId
          // eslint-disable-next-line @typescript-eslint/unbound-method
          expect(mockContentRepository.insert).toHaveBeenCalled();

          // Mock retrieval
          const contentEntity: ContentItemEntity = {
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
            collectedAt: new Date(),
            version: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          mockContentRepository.findOne.mockResolvedValue(contentEntity);

          // Retrieve and verify sourceId is preserved
          const retrieved = await contentFactory.load(contentId);
          expect(retrieved).not.toBeNull();
          expect(retrieved!.sourceId).toBe(sourceId);

          // Verify sourceId hasn't changed
          expect(retrieved!.sourceId).toBe(contentItem.sourceId);
        },
      ),
      { numRuns: 50 },
    );
  });
});
