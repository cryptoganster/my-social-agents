/**
 * Property-Based Test: Read Model Query Independence
 *
 * Property 8: Read Model Query Independence
 * For any query to a read model, the query SHALL NOT trigger any writes or side effects in the system.
 *
 * Requirements: 3.1, 3.2, 3.3, 6.1, 6.2, 6.3
 * Design: Correctness Properties - Property 8
 *
 * Feature: decouple-bounded-contexts, Property 8: Read Model Query Independence
 */

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeOrmSourceConfigurationReadRepository } from '@/ingestion/source/infra/persistence/repositories/source-configuration-read';
import { TypeOrmContentItemReadRepository } from '@/ingestion/content/infra/persistence/repositories/content-item-read';
import { SourceConfigurationEntity } from '@/ingestion/source/infra/persistence/entities/source-configuration';
import { ContentItemEntity } from '@/ingestion/content/infra/persistence/entities/content-item';

describe('Property: Read Model Query Independence', () => {
  let sourceReadRepository: TypeOrmSourceConfigurationReadRepository;
  let contentItemReadRepository: TypeOrmContentItemReadRepository;
  let mockSourceRepository: jest.Mocked<Repository<SourceConfigurationEntity>>;
  let mockContentRepository: jest.Mocked<Repository<ContentItemEntity>>;

  beforeEach(async () => {
    // Create mock repositories
    mockSourceRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockContentRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TypeOrmSourceConfigurationReadRepository,
        TypeOrmContentItemReadRepository,
        {
          provide: getRepositoryToken(SourceConfigurationEntity),
          useValue: mockSourceRepository,
        },
        {
          provide: getRepositoryToken(ContentItemEntity),
          useValue: mockContentRepository,
        },
      ],
    }).compile();

    sourceReadRepository = module.get<TypeOrmSourceConfigurationReadRepository>(
      TypeOrmSourceConfigurationReadRepository,
    );
    contentItemReadRepository = module.get<TypeOrmContentItemReadRepository>(
      TypeOrmContentItemReadRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 1: SourceReadRepository queries do not trigger writes
   *
   * For any source read query (findById, findByType, findActive),
   * the repository should ONLY call read methods (findOne, find)
   * and NEVER call write methods (save, update, delete).
   */
  it('SourceReadRepository queries should not trigger any write operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          sourceId: fc.uuid(),
          sourceType: fc.constantFrom(
            'WEB_SCRAPER',
            'RSS_FEED',
            'SOCIAL_MEDIA',
          ),
        }),
        async (data) => {
          // Reset mocks before each property test iteration
          jest.clearAllMocks();

          // Mock return value for findById
          mockSourceRepository.findOne.mockResolvedValue({
            sourceId: data.sourceId,
            sourceType: data.sourceType,
            name: 'Test Source',
            config: {},
            credentials: undefined,
            isActive: true,
            consecutiveFailures: 0,
            successRate: 100.0,
            totalJobs: 0,
            lastSuccessAt: null,
            lastFailureAt: null,
            version: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as SourceConfigurationEntity);

          // Mock return value for findByType and findActive
          mockSourceRepository.find.mockResolvedValue([
            {
              sourceId: data.sourceId,
              sourceType: data.sourceType,
              name: 'Test Source',
              config: {},
              credentials: undefined,
              isActive: true,
              consecutiveFailures: 0,
              successRate: 100.0,
              totalJobs: 0,
              lastSuccessAt: null,
              lastFailureAt: null,
              version: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            } as SourceConfigurationEntity,
          ]);

          // Execute all read operations
          await sourceReadRepository.findById(data.sourceId);
          await sourceReadRepository.findByType(data.sourceType);
          await sourceReadRepository.findActive();

          // Verify ONLY read methods were called
          expect(mockSourceRepository.findOne).toHaveBeenCalled();
          expect(mockSourceRepository.find).toHaveBeenCalled();

          // Verify NO write methods were called
          expect(mockSourceRepository.save).not.toHaveBeenCalled();
          expect(mockSourceRepository.update).not.toHaveBeenCalled();
          expect(mockSourceRepository.delete).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2: ContentItemReadRepository queries do not trigger writes
   *
   * For any content item read query (findById, findByHash, findBySourceId),
   * the repository should ONLY call read methods (findOne, find)
   * and NEVER call write methods (save, update, delete).
   */
  it('ContentItemReadRepository queries should not trigger any write operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          contentId: fc.uuid(),
          sourceId: fc.uuid(),
          contentHash: fc
            .array(
              fc.constantFrom(
                '0',
                '1',
                '2',
                '3',
                '4',
                '5',
                '6',
                '7',
                '8',
                '9',
                'a',
                'b',
                'c',
                'd',
                'e',
                'f',
              ),
              { minLength: 64, maxLength: 64 },
            )
            .map((arr) => arr.join('')),
        }),
        async (data) => {
          // Reset mocks before each property test iteration
          jest.clearAllMocks();

          // Mock return value for findById and findByHash
          mockContentRepository.findOne.mockResolvedValue({
            contentId: data.contentId,
            sourceId: data.sourceId,
            contentHash: data.contentHash,
            rawContent: 'Test raw content',
            normalizedContent: 'Test content',
            title: 'Test Title',
            author: 'Test Author',
            publishedAt: new Date(),
            language: 'en',
            sourceUrl: 'https://example.com',
            assetTags: [],
            collectedAt: new Date(),
            version: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as ContentItemEntity);

          // Mock return value for findBySource
          mockContentRepository.find.mockResolvedValue([
            {
              contentId: data.contentId,
              sourceId: data.sourceId,
              contentHash: data.contentHash,
              rawContent: 'Test raw content',
              normalizedContent: 'Test content',
              title: 'Test Title',
              author: 'Test Author',
              publishedAt: new Date(),
              language: 'en',
              sourceUrl: 'https://example.com',
              assetTags: [],
              collectedAt: new Date(),
              version: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
            } as ContentItemEntity,
          ]);

          // Execute all read operations
          // Note: findByHash requires ContentHash value object, so we test findById and findBySource
          await contentItemReadRepository.findById(data.contentId);
          await contentItemReadRepository.findBySource(data.sourceId, 10);

          // Verify ONLY read methods were called
          expect(mockContentRepository.findOne).toHaveBeenCalled();
          expect(mockContentRepository.find).toHaveBeenCalled();

          // Verify NO write methods were called
          expect(mockContentRepository.save).not.toHaveBeenCalled();
          expect(mockContentRepository.update).not.toHaveBeenCalled();
          expect(mockContentRepository.delete).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3: Read queries are idempotent
   *
   * For any read query, executing it multiple times should:
   * 1. Return the same result (or equivalent result)
   * 2. Not change the underlying data
   * 3. Not have cumulative side effects
   */
  it('read queries should be idempotent - multiple calls return same result', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          sourceId: fc.uuid(),
          sourceType: fc.constantFrom('WEB_SCRAPER', 'RSS_FEED'),
          name: fc.string({ minLength: 5, maxLength: 50 }),
          isActive: fc.boolean(),
        }),
        async (data) => {
          // Reset mocks
          jest.clearAllMocks();

          // Mock consistent return value
          const mockEntity: SourceConfigurationEntity = {
            sourceId: data.sourceId,
            sourceType: data.sourceType,
            name: data.name,
            config: {},
            credentials: undefined,
            isActive: data.isActive,
            consecutiveFailures: 0,
            successRate: 100.0,
            totalJobs: 0,
            lastSuccessAt: null,
            lastFailureAt: null,
            version: 0,
            createdAt: new Date('2025-01-09T00:00:00Z'),
            updatedAt: new Date('2025-01-09T00:00:00Z'),
          } as SourceConfigurationEntity;

          mockSourceRepository.findOne.mockResolvedValue(mockEntity);

          // Execute query multiple times
          const result1 = await sourceReadRepository.findById(data.sourceId);
          const result2 = await sourceReadRepository.findById(data.sourceId);
          const result3 = await sourceReadRepository.findById(data.sourceId);

          // Verify all results are equivalent
          expect(result1).toEqual(result2);
          expect(result2).toEqual(result3);
          expect(result1).toEqual(result3);

          // Verify the same data is returned
          if (result1 && result2 && result3) {
            expect(result1.sourceId).toBe(data.sourceId);
            expect(result2.sourceId).toBe(data.sourceId);
            expect(result3.sourceId).toBe(data.sourceId);

            expect(result1.sourceType).toBe(data.sourceType);
            expect(result2.sourceType).toBe(data.sourceType);
            expect(result3.sourceType).toBe(data.sourceType);
          }

          // Verify NO write operations occurred
          expect(mockSourceRepository.save).not.toHaveBeenCalled();
          expect(mockSourceRepository.update).not.toHaveBeenCalled();
          expect(mockSourceRepository.delete).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4: Queries return null for non-existent entities without side effects
   *
   * For any query for a non-existent entity, the repository should:
   * 1. Return null (not throw an error)
   * 2. Not create any new entities
   * 3. Not modify any existing entities
   */
  it('queries for non-existent entities should return null without side effects', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          nonExistentId: fc.uuid(),
        }),
        async (data) => {
          // Reset mocks
          jest.clearAllMocks();

          // Mock null return (entity not found)
          mockSourceRepository.findOne.mockResolvedValue(null);
          mockContentRepository.findOne.mockResolvedValue(null);

          // Execute queries for non-existent entities
          const sourceResult = await sourceReadRepository.findById(
            data.nonExistentId,
          );
          const contentResult = await contentItemReadRepository.findById(
            data.nonExistentId,
          );

          // Verify null is returned
          expect(sourceResult).toBeNull();
          expect(contentResult).toBeNull();

          // Verify NO write operations occurred
          expect(mockSourceRepository.save).not.toHaveBeenCalled();
          expect(mockSourceRepository.update).not.toHaveBeenCalled();
          expect(mockSourceRepository.delete).not.toHaveBeenCalled();

          expect(mockContentRepository.save).not.toHaveBeenCalled();
          expect(mockContentRepository.update).not.toHaveBeenCalled();
          expect(mockContentRepository.delete).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5: Collection queries return empty arrays without side effects
   *
   * For any collection query that returns no results, the repository should:
   * 1. Return an empty array (not null or undefined)
   * 2. Not create any new entities
   * 3. Not modify any existing entities
   */
  it('collection queries with no results should return empty array without side effects', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          sourceType: fc.constantFrom('WEB_SCRAPER', 'RSS_FEED'),
          sourceId: fc.uuid(),
        }),
        async (data) => {
          // Reset mocks
          jest.clearAllMocks();

          // Mock empty array return (no results)
          mockSourceRepository.find.mockResolvedValue([]);
          mockContentRepository.find.mockResolvedValue([]);

          // Execute collection queries
          const sourcesByType = await sourceReadRepository.findByType(
            data.sourceType,
          );
          const activeSources = await sourceReadRepository.findActive();
          const contentBySource = await contentItemReadRepository.findBySource(
            data.sourceId,
            10,
          );

          // Verify empty arrays are returned
          expect(sourcesByType).toEqual([]);
          expect(activeSources).toEqual([]);
          expect(contentBySource).toEqual([]);

          expect(Array.isArray(sourcesByType)).toBe(true);
          expect(Array.isArray(activeSources)).toBe(true);
          expect(Array.isArray(contentBySource)).toBe(true);

          // Verify NO write operations occurred
          expect(mockSourceRepository.save).not.toHaveBeenCalled();
          expect(mockSourceRepository.update).not.toHaveBeenCalled();
          expect(mockSourceRepository.delete).not.toHaveBeenCalled();

          expect(mockContentRepository.save).not.toHaveBeenCalled();
          expect(mockContentRepository.update).not.toHaveBeenCalled();
          expect(mockContentRepository.delete).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });
});
