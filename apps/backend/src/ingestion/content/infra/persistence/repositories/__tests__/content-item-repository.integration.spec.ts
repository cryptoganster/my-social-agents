import { DataSource, Repository } from 'typeorm';
import { setupTestDatabase, teardownTestDatabase } from '@/../test/setup';
import { ContentItem } from '@/ingestion/content/domain/aggregates/content-item';
import { ContentHash } from '@/ingestion/content/domain/value-objects/content-hash';
import { ContentMetadata } from '@/ingestion/content/domain/value-objects/content-metadata';
import { TypeOrmContentItemWriteRepository } from '../content-item-write';
import { TypeOrmContentItemReadRepository } from '../content-item-read';
import { TypeOrmContentItemFactory } from '../../factories/content-item-factory';
import { ContentItemEntity } from '../../entities/content-item';

/**
 * ContentItem Repository Integration Tests
 *
 * Tests actual database operations to catch schema mismatches early.
 * Run with: npm test -- content-item-repository.integration.spec.ts
 */
describe('ContentItem Repository Integration', () => {
  let dataSource: DataSource;
  let writeRepo: TypeOrmContentItemWriteRepository;
  let readRepo: TypeOrmContentItemReadRepository;
  let factory: TypeOrmContentItemFactory;
  let entityRepository: Repository<ContentItemEntity>;

  beforeAll(async () => {
    dataSource = await setupTestDatabase();
    entityRepository = dataSource.getRepository(ContentItemEntity);
    writeRepo = new TypeOrmContentItemWriteRepository(entityRepository);
    readRepo = new TypeOrmContentItemReadRepository(entityRepository);
    factory = new TypeOrmContentItemFactory(readRepo);
  });

  afterAll(async () => {
    await teardownTestDatabase(dataSource);
  });

  afterEach(async () => {
    await entityRepository.clear();
  });

  describe('Write Repository', () => {
    it('should save a new content item with all fields', async () => {
      const contentItem = ContentItem.create({
        contentId: 'test-id-1',
        sourceId: 'source-id-1',
        contentHash: ContentHash.create('a'.repeat(64)),
        rawContent: 'Raw content',
        normalizedContent: 'Normalized content',
        metadata: ContentMetadata.create({
          title: 'Test Article',
          author: 'Test Author',
          sourceUrl: 'https://example.com/article',
          publishedAt: new Date('2024-01-01'),
          language: 'en',
        }),
        assetTags: [],
        collectedAt: new Date(),
      });

      await writeRepo.save(contentItem);

      const saved = await entityRepository.findOne({
        where: { contentId: 'test-id-1' },
      });

      expect(saved).toBeDefined();
      expect(saved?.contentId).toBe('test-id-1');
      expect(saved?.sourceId).toBe('source-id-1');
      expect(saved?.contentHash).toBe('a'.repeat(64));
      expect(saved?.title).toBe('Test Article');
      expect(saved?.author).toBe('Test Author');
      expect(saved?.sourceUrl).toBe('https://example.com/article');
      expect(saved?.language).toBe('en');
      expect(saved?.version).toBe(0);
    });

    it('should save content item with minimal metadata', async () => {
      const contentItem = ContentItem.create({
        contentId: 'test-id-2',
        sourceId: 'source-id-2',
        contentHash: ContentHash.create('b'.repeat(64)),
        rawContent: 'Raw content',
        normalizedContent: 'Normalized content',
        metadata: ContentMetadata.create({
          sourceUrl: 'https://example.com/minimal',
        }),
        assetTags: [],
        collectedAt: new Date(),
      });

      await writeRepo.save(contentItem);

      const saved = await entityRepository.findOne({
        where: { contentId: 'test-id-2' },
      });

      expect(saved).toBeDefined();
      expect(saved?.title).toBeNull();
      expect(saved?.author).toBeNull();
      expect(saved?.sourceUrl).toBe('https://example.com/minimal');
    });
  });

  describe('Read Repository', () => {
    beforeEach(async () => {
      const contentItem = ContentItem.create({
        contentId: 'read-test-id',
        sourceId: 'source-id',
        contentHash: ContentHash.create('c'.repeat(64)),
        rawContent: 'Raw content',
        normalizedContent: 'Normalized content',
        metadata: ContentMetadata.create({
          title: 'Read Test',
          sourceUrl: 'https://example.com/read',
        }),
        assetTags: [],
        collectedAt: new Date(),
      });

      await writeRepo.save(contentItem);
    });

    it('should find content by hash', async () => {
      const hash = ContentHash.create('c'.repeat(64));
      const found = await readRepo.findByHash(hash);

      expect(found).toBeDefined();
      expect(found?.contentHash).toBe('c'.repeat(64));
    });

    it('should find content by ID', async () => {
      const found = await readRepo.findById('read-test-id');

      expect(found).toBeDefined();
      expect(found?.contentId).toBe('read-test-id');
    });

    it('should return null for non-existent hash', async () => {
      const hash = ContentHash.create('d'.repeat(64));
      const found = await readRepo.findByHash(hash);
      expect(found).toBeNull();
    });
  });

  describe('Factory', () => {
    beforeEach(async () => {
      const contentItem = ContentItem.create({
        contentId: 'factory-test-id',
        sourceId: 'source-id',
        contentHash: ContentHash.create('e'.repeat(64)),
        rawContent: 'Raw content',
        normalizedContent: 'Normalized content',
        metadata: ContentMetadata.create({
          title: 'Factory Test',
          author: 'Test Author',
          sourceUrl: 'https://example.com/factory',
        }),
        assetTags: [],
        collectedAt: new Date(),
      });

      await writeRepo.save(contentItem);
    });

    it('should reconstitute content item from database', async () => {
      const loaded = await factory.load('factory-test-id');

      expect(loaded).toBeDefined();
      expect(loaded).toBeInstanceOf(ContentItem);
      expect(loaded?.contentId).toBe('factory-test-id');
      expect(loaded?.contentHash.toString()).toBe('e'.repeat(64));
      expect(loaded?.metadata.title).toBe('Factory Test');
    });

    it('should return null for non-existent content', async () => {
      const loaded = await factory.load('non-existent');
      expect(loaded).toBeNull();
    });
  });
});
