import * as fc from 'fast-check';
import { Repository, InsertResult, SelectQueryBuilder } from 'typeorm';
import {
  SourceConfiguration,
  SourceType,
  SourceTypeEnum,
  ContentItem,
  ContentHash,
  ContentMetadata,
} from '@/ingestion/domain';
import { TypeOrmSourceConfigurationWriteRepository } from '../source-configuration-write';
import { TypeOrmSourceConfigurationReadRepository } from '../source-configuration-read';
import { TypeOrmSourceConfigurationFactory } from '../../factories/source-configuration-factory';
import { TypeOrmContentItemWriteRepository } from '../content-item-write';
import { TypeOrmContentItemReadRepository } from '../content-item-read';
import { TypeOrmContentItemFactory } from '../../factories/content-item-factory';
import { SourceConfigurationEntity } from '../../entities/source-configuration';
import { ContentItemEntity } from '../../entities/content-item';

/**
 * Property-Based Tests for Referential Integrity
 *
 * Feature: content-ingestion
 * Property 24: Referential Integrity
 *
 * Validates: Requirements 10.5
 *
 * For any persisted content item, the sourceId should reference an existing
 * source configuration, and deleting the source should not orphan the content items.
 */
describe('Referential Integrity Properties', () => {
  let sourceWriteRepo: TypeOrmSourceConfigurationWriteRepository;
  let sourceReadRepo: TypeOrmSourceConfigurationReadRepository;
  let sourceFactory: TypeOrmSourceConfigurationFactory;
  let contentWriteRepo: TypeOrmContentItemWriteRepository;
  let contentReadRepo: TypeOrmContentItemReadRepository;
  let contentFactory: TypeOrmContentItemFactory;
  let mockSourceRepository: jest.Mocked<Repository<SourceConfigurationEntity>>;
  let mockContentRepository: jest.Mocked<Repository<ContentItemEntity>>;

  beforeEach(() => {
    // Create mock repositories
    mockSourceRepository = {
      insert: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<SourceConfigurationEntity>>;

    mockContentRepository = {
      insert: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<ContentItemEntity>>;

    // Create repositories and factories
    sourceWriteRepo = new TypeOrmSourceConfigurationWriteRepository(
      mockSourceRepository,
    );
    sourceReadRepo = new TypeOrmSourceConfigurationReadRepository(
      mockSourceRepository,
    );
    sourceFactory = new TypeOrmSourceConfigurationFactory(sourceReadRepo);

    contentWriteRepo = new TypeOrmContentItemWriteRepository(
      mockContentRepository,
    );
    contentReadRepo = new TypeOrmContentItemReadRepository(
      mockContentRepository,
    );
    contentFactory = new TypeOrmContentItemFactory(contentReadRepo);
  });

  /**
   * Property 24: Referential Integrity
   *
   * Content items should reference existing source configurations.
   * When a source is deleted, content items should remain accessible.
   */
  it('should maintain referential integrity between content and source', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom(...Object.values(SourceTypeEnum)),
        fc.string({ minLength: 3, maxLength: 100 }),
        fc.array(
          fc.record({
            contentId: fc.uuid(),
            contentHash: fc.stringMatching(/^[0-9a-f]{64}$/),
            rawContent: fc.string({ minLength: 10, maxLength: 500 }),
            normalizedContent: fc.string({ minLength: 10, maxLength: 500 }),
          }),
          { minLength: 1, maxLength: 5 },
        ),
        async (sourceId, sourceTypeValue, sourceName, contentItems) => {
          const sourceType = SourceType.fromString(sourceTypeValue);

          // Create source configuration
          const source = SourceConfiguration.create({
            sourceId,
            sourceType,
            name: sourceName,
            config: { test: 'config' },
          });

          mockSourceRepository.insert.mockResolvedValue({} as InsertResult);
          await sourceWriteRepo.save(source);

          // Mock source retrieval
          const sourceEntity: SourceConfigurationEntity = {
            sourceId,
            sourceType: sourceTypeValue,
            name: sourceName,
            config: { test: 'config' },
            credentials: undefined,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 0,
          };
          mockSourceRepository.findOne.mockResolvedValue(sourceEntity);

          // Verify source exists
          const retrievedSource = await sourceFactory.load(sourceId);
          expect(retrievedSource).not.toBeNull();

          // Create content items referencing this source
          const contentAggregates: ContentItem[] = [];
          const contentEntities: ContentItemEntity[] = [];

          for (const item of contentItems) {
            const contentHash = ContentHash.create(item.contentHash);
            const metadata = ContentMetadata.create({
              title: null,
              author: null,
              publishedAt: null,
              language: null,
              sourceUrl: null,
            });

            const contentItem = ContentItem.reconstitute({
              contentId: item.contentId,
              sourceId, // References the source
              contentHash,
              rawContent: item.rawContent,
              normalizedContent: item.normalizedContent,
              metadata,
              assetTags: [],
              collectedAt: new Date(),
              version: 0,
            });

            contentAggregates.push(contentItem);

            // Mock content entity
            const contentEntity: ContentItemEntity = {
              contentId: item.contentId,
              sourceId,
              contentHash: item.contentHash,
              rawContent: item.rawContent,
              normalizedContent: item.normalizedContent,
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
            contentEntities.push(contentEntity);

            // Mock content insert
            mockContentRepository.insert.mockResolvedValue({} as InsertResult);
            await contentWriteRepo.save(contentItem);
          }

          // Verify all content items reference the source
          for (let i = 0; i < contentItems.length; i++) {
            mockContentRepository.findOne.mockResolvedValue(contentEntities[i]);
            const retrievedContent = await contentFactory.load(
              contentItems[i].contentId,
            );
            expect(retrievedContent).not.toBeNull();
            expect(retrievedContent!.sourceId).toBe(sourceId);
          }

          // Mock findBySource to return all content
          mockContentRepository.find.mockResolvedValue(contentEntities);

          // Verify content can be queried by source
          const contentBySource = await contentReadRepo.findBySource(
            sourceId,
            10,
          );
          expect(contentBySource).toHaveLength(contentItems.length);
          contentBySource.forEach((content) => {
            expect(content.sourceId).toBe(sourceId);
          });

          // Now delete (deactivate) the source
          mockSourceRepository.findOne.mockResolvedValue(sourceEntity);
          const sourceToDelete = await sourceFactory.load(sourceId);
          sourceToDelete!.deactivate();

          const mockQueryBuilder = {
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({ affected: 1 }),
          };
          mockSourceRepository.createQueryBuilder.mockReturnValue(
            mockQueryBuilder as unknown as SelectQueryBuilder<SourceConfigurationEntity>,
          );

          await sourceWriteRepo.save(sourceToDelete!);

          // Verify source is deactivated
          const deactivatedSourceEntity: SourceConfigurationEntity = {
            ...sourceEntity,
            isActive: false,
            version: 1,
          };
          mockSourceRepository.findOne.mockResolvedValue(
            deactivatedSourceEntity,
          );

          const deletedSource = await sourceFactory.load(sourceId);
          expect(deletedSource).not.toBeNull();
          expect(deletedSource!.isActive).toBe(false);

          // CRITICAL: Content items should still be accessible after source deletion
          mockContentRepository.find.mockResolvedValue(contentEntities);
          const contentAfterDeletion = await contentReadRepo.findBySource(
            sourceId,
            10,
          );

          // Verify content is NOT orphaned
          expect(contentAfterDeletion).toHaveLength(contentItems.length);
          contentAfterDeletion.forEach((content) => {
            expect(content.sourceId).toBe(sourceId);
          });

          // Verify each content item is still retrievable
          for (let i = 0; i < contentItems.length; i++) {
            mockContentRepository.findOne.mockResolvedValue(contentEntities[i]);
            const content = await contentFactory.load(
              contentItems[i].contentId,
            );
            expect(content).not.toBeNull();
            expect(content!.sourceId).toBe(sourceId);
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 24: Referential Integrity (Source Reference Validation)
   *
   * Content items should always reference a valid source ID.
   * The sourceId should be a non-empty string.
   */
  it('should enforce valid source references in content items', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.stringMatching(/^[0-9a-f]{64}$/),
        fc.string({ minLength: 10, maxLength: 500 }),
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
   * Property 24: Referential Integrity (Historical Data Preservation)
   *
   * After source deletion, historical content should remain queryable
   * and maintain its relationship to the deleted source.
   */
  it('should preserve historical content after source deletion', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom(...Object.values(SourceTypeEnum)),
        fc.string({ minLength: 3, maxLength: 100 }),
        fc.integer({ min: 1, max: 10 }), // Number of content items
        async (sourceId, sourceTypeValue, sourceName, contentCount) => {
          const sourceType = SourceType.fromString(sourceTypeValue);

          // Create source
          const source = SourceConfiguration.create({
            sourceId,
            sourceType,
            name: sourceName,
            config: { test: 'config' },
          });

          mockSourceRepository.insert.mockResolvedValue({} as InsertResult);
          await sourceWriteRepo.save(source);

          // Create multiple content items
          const contentEntities: ContentItemEntity[] = [];
          for (let i = 0; i < contentCount; i++) {
            const contentEntity: ContentItemEntity = {
              contentId: `content-${i}`,
              sourceId,
              contentHash: '0'.repeat(64),
              rawContent: `content ${i}`,
              normalizedContent: `content ${i}`,
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
            contentEntities.push(contentEntity);
          }

          // Mock content retrieval before deletion
          mockContentRepository.find.mockResolvedValue(contentEntities);
          const contentBeforeDeletion = await contentReadRepo.findBySource(
            sourceId,
            100,
          );
          expect(contentBeforeDeletion).toHaveLength(contentCount);

          // Delete source
          const sourceEntity: SourceConfigurationEntity = {
            sourceId,
            sourceType: sourceTypeValue,
            name: sourceName,
            config: { test: 'config' },
            credentials: undefined,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 0,
          };
          mockSourceRepository.findOne.mockResolvedValue(sourceEntity);

          const sourceToDelete = await sourceFactory.load(sourceId);
          sourceToDelete!.deactivate();

          const mockQueryBuilder = {
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({ affected: 1 }),
          };
          mockSourceRepository.createQueryBuilder.mockReturnValue(
            mockQueryBuilder as unknown as SelectQueryBuilder<SourceConfigurationEntity>,
          );

          await sourceWriteRepo.save(sourceToDelete!);

          // Mock content retrieval after deletion
          mockContentRepository.find.mockResolvedValue(contentEntities);
          const contentAfterDeletion = await contentReadRepo.findBySource(
            sourceId,
            100,
          );

          // Verify all historical content is preserved
          expect(contentAfterDeletion).toHaveLength(contentCount);
          expect(contentAfterDeletion.length).toBe(
            contentBeforeDeletion.length,
          );

          // Verify content still references the deleted source
          contentAfterDeletion.forEach((content) => {
            expect(content.sourceId).toBe(sourceId);
          });
        },
      ),
      { numRuns: 30 },
    );
  });
});
