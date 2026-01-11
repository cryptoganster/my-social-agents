import * as fc from 'fast-check';
import { Repository, InsertResult, SelectQueryBuilder } from 'typeorm';
import { SourceConfiguration } from '@/ingestion/source/domain/aggregates/source-configuration';
import { SourceType } from '@/ingestion/source/domain/value-objects/source-type';
import { SourceTypeEnum } from '@/ingestion/source/domain/value-objects/source-type';
import { ContentItemReadModel } from '@/ingestion/content/app/queries/read-models/content-item';
import { TypeOrmSourceConfigurationWriteRepository } from '../repositories/source-configuration-write';
import { TypeOrmSourceConfigurationReadRepository } from '../repositories/source-configuration-read';
import { TypeOrmSourceConfigurationFactory } from '../factories/source-configuration-factory';
import { TypeOrmContentItemReadRepository } from '@/ingestion/content/infra/persistence/repositories/content-item-read';
import { SourceConfigurationEntity } from '../entities/source-configuration';
import { ContentItemEntity } from '@/ingestion/content/infra/persistence/entities/content-item';

/**
 * Property-Based Tests for Source Deletion Integrity
 *
 * Feature: content-ingestion
 * Property 24b: Source Deletion Integrity
 *
 * Validates: Requirements 10.5
 *
 * When a source is deleted (deactivated), content items that reference
 * that source should remain accessible and queryable. This ensures
 * historical data preservation.
 */
describe('Source Deletion Integrity', () => {
  let sourceWriteRepo: TypeOrmSourceConfigurationWriteRepository;
  let sourceReadRepo: TypeOrmSourceConfigurationReadRepository;
  let sourceFactory: TypeOrmSourceConfigurationFactory;
  let contentReadRepo: TypeOrmContentItemReadRepository;
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

    contentReadRepo = new TypeOrmContentItemReadRepository(
      mockContentRepository,
    );
  });

  /**
   * Property 24b: Content remains accessible after source deletion
   *
   * When a source is deleted (deactivated):
   * - Content items should NOT be orphaned
   * - Content should remain queryable by sourceId
   * - Content should maintain its reference to the deleted source
   */
  it('should preserve content accessibility after source deletion', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // sourceId
        fc.constantFrom(...Object.values(SourceTypeEnum)),
        fc.string({ minLength: 3, maxLength: 100 }), // sourceName
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

          // Create multiple content items referencing this source
          const contentEntities: ContentItemEntity[] = [];
          for (let i = 0; i < contentCount; i++) {
            const contentEntity: ContentItemEntity = {
              contentId: `content-${i}`,
              sourceId, // References the source
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

          // Delete (deactivate) the source
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
            consecutiveFailures: 0,
            successRate: 0,
            totalJobs: 0,
            lastSuccessAt: null,
            lastFailureAt: null,
          };
          mockSourceRepository.findOne.mockResolvedValue(sourceEntity);

          const sourceToDelete = await sourceFactory.load(sourceId);
          if (!sourceToDelete) {
            throw new Error('Source not found');
          }
          sourceToDelete.deactivate();

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

          await sourceWriteRepo.save(sourceToDelete);

          // Verify source is deactivated
          const deactivatedSourceEntity: SourceConfigurationEntity = {
            ...sourceEntity,
            isActive: false,
            version: 1,
            consecutiveFailures: 0,
            successRate: 0,
            totalJobs: 0,
            lastSuccessAt: null,
            lastFailureAt: null,
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
            100,
          );

          // Verify all historical content is preserved
          expect(contentAfterDeletion).toHaveLength(contentCount);
          expect(contentAfterDeletion.length).toBe(
            contentBeforeDeletion.length,
          );

          // Verify content still references the deleted source
          contentAfterDeletion.forEach((content: ContentItemReadModel) => {
            expect(content.sourceId).toBe(sourceId);
          });
        },
      ),
      { numRuns: 30 },
    );
  });

  /**
   * Property 24b: Source deletion is soft delete (deactivation)
   *
   * Deleting a source should:
   * - Set isActive to false
   * - NOT remove the source record
   * - Allow the source to be retrieved (but marked as inactive)
   */
  it('should soft delete sources by deactivation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // sourceId
        fc.constantFrom(...Object.values(SourceTypeEnum)),
        fc.string({ minLength: 3, maxLength: 100 }), // sourceName
        async (sourceId, sourceTypeValue, sourceName) => {
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

          // Verify source is active
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
            consecutiveFailures: 0,
            successRate: 0,
            totalJobs: 0,
            lastSuccessAt: null,
            lastFailureAt: null,
          };
          mockSourceRepository.findOne.mockResolvedValue(sourceEntity);

          const activeSource = await sourceFactory.load(sourceId);
          expect(activeSource).not.toBeNull();
          expect(activeSource!.isActive).toBe(true);

          // Delete (deactivate) the source
          const sourceToDelete = await sourceFactory.load(sourceId);
          if (!sourceToDelete) {
            throw new Error('Source not found');
          }
          sourceToDelete.deactivate();

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

          await sourceWriteRepo.save(sourceToDelete);

          // Verify source is deactivated but still exists
          const deactivatedSourceEntity: SourceConfigurationEntity = {
            ...sourceEntity,
            isActive: false,
            version: 1,
            consecutiveFailures: 0,
            successRate: 0,
            totalJobs: 0,
            lastSuccessAt: null,
            lastFailureAt: null,
          };
          mockSourceRepository.findOne.mockResolvedValue(
            deactivatedSourceEntity,
          );

          const deletedSource = await sourceFactory.load(sourceId);
          expect(deletedSource).not.toBeNull(); // Still exists
          expect(deletedSource!.isActive).toBe(false); // But inactive
          expect(deletedSource!.sourceId).toBe(sourceId); // Same ID
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 24b: Multiple content items survive source deletion
   *
   * When a source with multiple content items is deleted:
   * - All content items should remain accessible
   * - Content count should not change
   * - Each content item should still reference the deleted source
   */
  it('should preserve all content items when source is deleted', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // sourceId
        fc.constantFrom(...Object.values(SourceTypeEnum)),
        fc.string({ minLength: 3, maxLength: 100 }), // sourceName
        fc.array(
          fc.record({
            contentId: fc.uuid(),
            content: fc.string({ minLength: 10, maxLength: 100 }),
          }),
          { minLength: 2, maxLength: 10 },
        ),
        async (sourceId, sourceTypeValue, sourceName, contentItems) => {
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

          // Create content entities
          const contentEntities: ContentItemEntity[] = contentItems.map(
            (item) => ({
              contentId: item.contentId,
              sourceId, // All reference the same source
              contentHash: '0'.repeat(64),
              rawContent: item.content,
              normalizedContent: item.content,
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

          // Mock content retrieval before deletion
          mockContentRepository.find.mockResolvedValue(contentEntities);
          const contentBeforeDeletion = await contentReadRepo.findBySource(
            sourceId,
            100,
          );
          const countBefore = contentBeforeDeletion.length;

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
            consecutiveFailures: 0,
            successRate: 0,
            totalJobs: 0,
            lastSuccessAt: null,
            lastFailureAt: null,
          };
          mockSourceRepository.findOne.mockResolvedValue(sourceEntity);

          const sourceToDelete = await sourceFactory.load(sourceId);
          if (!sourceToDelete) {
            throw new Error('Source not found');
          }
          sourceToDelete.deactivate();

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

          await sourceWriteRepo.save(sourceToDelete);

          // Mock content retrieval after deletion
          mockContentRepository.find.mockResolvedValue(contentEntities);
          const contentAfterDeletion = await contentReadRepo.findBySource(
            sourceId,
            100,
          );
          const countAfter = contentAfterDeletion.length;

          // Verify content count hasn't changed
          expect(countAfter).toBe(countBefore);
          expect(countAfter).toBe(contentItems.length);

          // Verify all content items still reference the deleted source
          contentAfterDeletion.forEach((content: ContentItemReadModel) => {
            expect(content.sourceId).toBe(sourceId);
          });
        },
      ),
      { numRuns: 30 },
    );
  });
});
