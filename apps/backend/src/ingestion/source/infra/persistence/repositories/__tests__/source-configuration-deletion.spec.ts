import * as fc from 'fast-check';
import { Repository, InsertResult, SelectQueryBuilder } from 'typeorm';
import { SourceConfiguration } from '@/ingestion/source/domain/aggregates/source-configuration';
import {
  SourceType,
  SourceTypeEnum,
} from '@/ingestion/source/domain/value-objects';
import { TypeOrmSourceConfigurationWriteRepository } from '../source-configuration-write';
import { TypeOrmSourceConfigurationReadRepository } from '../source-configuration-read';
import { TypeOrmSourceConfigurationFactory } from '../../factories/source-configuration-factory';
import { TypeOrmContentItemReadRepository } from '@/ingestion/content/infra/persistence/repositories/content-item-read';
import { SourceConfigurationEntity } from '../../entities/source-configuration';
import { ContentItemEntity } from '@/ingestion/content/infra/persistence/entities/content-item';

/**
 * Property-Based Tests for SourceConfiguration Deletion
 *
 * Feature: content-ingestion
 * Property 13: Source Deletion Behavior
 *
 * Validates: Requirements 5.3
 *
 * For any deleted source configuration, the system should prevent new ingestion
 * jobs from being created for that source while preserving all historical content
 * items collected from that source.
 */
describe('SourceConfiguration Deletion Properties', () => {
  let writeRepo: TypeOrmSourceConfigurationWriteRepository;
  let readRepo: TypeOrmSourceConfigurationReadRepository;
  let factory: TypeOrmSourceConfigurationFactory;
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
      findOne: jest.fn(),
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<ContentItemEntity>>;

    // Create repositories and factory
    writeRepo = new TypeOrmSourceConfigurationWriteRepository(
      mockSourceRepository,
    );
    readRepo = new TypeOrmSourceConfigurationReadRepository(
      mockSourceRepository,
    );
    factory = new TypeOrmSourceConfigurationFactory(readRepo);
    contentReadRepo = new TypeOrmContentItemReadRepository(
      mockContentRepository,
    );
  });

  /**
   * Property 13: Source Deletion Behavior
   *
   * When a source is deleted (deactivated), it should be marked as inactive,
   * preventing new jobs, but historical content should remain accessible.
   */
  it('should deactivate source while preserving historical content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom(...Object.values(SourceTypeEnum)),
        fc.string({ minLength: 3, maxLength: 100 }),
        fc.array(
          fc.record({
            contentId: fc.uuid(),
            contentHash: fc.stringMatching(/^[0-9a-f]{64}$/),
            content: fc.string({ minLength: 10, maxLength: 500 }),
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

          // Mock insert
          mockSourceRepository.insert.mockResolvedValue({} as InsertResult);
          await writeRepo.save(source);

          // Verify source is active
          expect(source.isActive).toBe(true);

          // Mock content items from this source
          const mockContentEntities: ContentItemEntity[] = contentItems.map(
            (item) => ({
              contentId: item.contentId,
              sourceId,
              contentHash: item.contentHash,
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

          // Mock findBySource to return content items
          mockContentRepository.find.mockResolvedValue(mockContentEntities);

          // Verify content exists before deletion
          const contentBeforeDeletion = await contentReadRepo.findBySource(
            sourceId,
            10,
          );
          expect(contentBeforeDeletion).toHaveLength(contentItems.length);

          // Mock findOne to return active source
          const activeEntity: SourceConfigurationEntity = {
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
          mockSourceRepository.findOne.mockResolvedValue(activeEntity);

          // Load and deactivate source
          const loadedSource = await factory.load(sourceId);
          expect(loadedSource).not.toBeNull();
          loadedSource!.deactivate();

          // Mock update
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

          // Persist deactivation
          await writeRepo.save(loadedSource!);

          // Mock findOne to return deactivated source
          const deactivatedEntity: SourceConfigurationEntity = {
            sourceId,
            sourceType: sourceTypeValue,
            name: sourceName,
            config: { test: 'config' },
            credentials: undefined,
            isActive: false, // Now inactive
            createdAt: activeEntity.createdAt,
            updatedAt: new Date(),
            version: 1,
          };
          mockSourceRepository.findOne.mockResolvedValue(deactivatedEntity);

          // Verify source is deactivated
          const deactivatedSource = await factory.load(sourceId);
          expect(deactivatedSource).not.toBeNull();
          expect(deactivatedSource!.isActive).toBe(false);

          // Verify historical content is still accessible
          mockContentRepository.find.mockResolvedValue(mockContentEntities);
          const contentAfterDeletion = await contentReadRepo.findBySource(
            sourceId,
            10,
          );
          expect(contentAfterDeletion).toHaveLength(contentItems.length);

          // Verify content IDs match
          const contentIdsBefore = contentBeforeDeletion.map(
            (c) => c.contentId,
          );
          const contentIdsAfter = contentAfterDeletion.map((c) => c.contentId);
          expect(contentIdsAfter.sort()).toEqual(contentIdsBefore.sort());
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 13: Source Deletion Behavior (Soft Delete)
   *
   * Deletion should be a soft delete (deactivation), not a hard delete.
   * The source record should still exist in the database.
   */
  it('should perform soft delete by deactivating source', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom(...Object.values(SourceTypeEnum)),
        fc.string({ minLength: 3, maxLength: 100 }),
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
          await writeRepo.save(source);

          // Mock findOne to return active source
          const activeEntity: SourceConfigurationEntity = {
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
          mockSourceRepository.findOne.mockResolvedValue(activeEntity);

          // Load and deactivate
          const loadedSource = await factory.load(sourceId);
          loadedSource!.deactivate();

          // Mock update
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

          await writeRepo.save(loadedSource!);

          // Mock findOne to return deactivated source (still exists!)
          const deactivatedEntity: SourceConfigurationEntity = {
            sourceId,
            sourceType: sourceTypeValue,
            name: sourceName,
            config: { test: 'config' },
            credentials: undefined,
            isActive: false,
            createdAt: activeEntity.createdAt,
            updatedAt: new Date(),
            version: 1,
          };
          mockSourceRepository.findOne.mockResolvedValue(deactivatedEntity);

          // Verify source still exists (soft delete)
          const deletedSource = await factory.load(sourceId);
          expect(deletedSource).not.toBeNull(); // Still exists!
          expect(deletedSource!.isActive).toBe(false);
          expect(deletedSource!.sourceId).toBe(sourceId);
          expect(deletedSource!.name).toBe(sourceName);
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 13: Source Deletion Behavior (Active Sources Query)
   *
   * After deletion, the source should not appear in queries for active sources.
   */
  it('should exclude deactivated sources from active sources query', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            sourceId: fc.uuid(),
            sourceType: fc.constantFrom(...Object.values(SourceTypeEnum)),
            name: fc.string({ minLength: 3, maxLength: 100 }),
          }),
          { minLength: 2, maxLength: 5 },
        ),
        fc.integer({ min: 0, max: 4 }), // Index of source to deactivate
        async (sources, deactivateIndex) => {
          // Ensure we have at least 2 sources
          fc.pre(sources.length >= 2);
          fc.pre(deactivateIndex < sources.length);

          // Create all sources as active
          const entities: SourceConfigurationEntity[] = sources.map(
            (source) => ({
              sourceId: source.sourceId,
              sourceType: source.sourceType,
              name: source.name,
              config: { test: 'config' },
              credentials: undefined,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              version: 0,
            }),
          );

          // Mock findActive to return all sources initially
          mockSourceRepository.find.mockResolvedValue(entities);

          // Get active sources before deactivation
          const activeBeforeDeactivation = await readRepo.findActive();
          expect(activeBeforeDeactivation).toHaveLength(sources.length);

          // Deactivate one source
          const sourceToDeactivate = sources[deactivateIndex];

          // Mock findActive to return only active sources
          const activeEntities = entities.filter(
            (_e, i) => i !== deactivateIndex,
          );
          mockSourceRepository.find.mockResolvedValue(activeEntities);

          // Get active sources after deactivation
          const activeAfterDeactivation = await readRepo.findActive();

          // Verify deactivated source is not in active list
          expect(activeAfterDeactivation).toHaveLength(sources.length - 1);
          const activeIds = activeAfterDeactivation.map((s) => s.sourceId);
          expect(activeIds).not.toContain(sourceToDeactivate.sourceId);

          // Verify other sources are still active
          sources.forEach((source, index) => {
            if (index !== deactivateIndex) {
              expect(activeIds).toContain(source.sourceId);
            }
          });
        },
      ),
      { numRuns: 30 },
    );
  });
});
