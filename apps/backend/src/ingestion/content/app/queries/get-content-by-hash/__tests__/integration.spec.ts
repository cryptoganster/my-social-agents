import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { GetContentByHashQueryHandler } from '../handler';
import { GetContentByHashQuery } from '../query';
import { TypeOrmContentItemReadRepository } from '@/ingestion/content/infra/persistence/repositories/content-item-read';
import { ContentItemEntity } from '@/ingestion/content/infra/persistence/entities/content-item';
import { ContentHash } from '@/ingestion/content/domain/value-objects/content-hash';
import {
  setupTestDatabase,
  teardownTestDatabase,
} from '../../../../../../../test/setup';

/**
 * Integration Test: GetContentByHashQuery End-to-End
 *
 * Tests the complete query flow with real database:
 * - Query handler
 * - Read repository
 * - TypeORM
 * - PostgreSQL
 *
 * Validates:
 * - Query returns content when it exists in database
 * - Query returns null when content doesn't exist
 * - Hash-based lookup works correctly
 *
 * Requirements: 2.1, 2.2, 3.1, 3.2
 */
describe('GetContentByHashQuery Integration', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let handler: GetContentByHashQueryHandler;
  let repository: TypeOrmContentItemReadRepository;

  beforeAll(async () => {
    // Set up test database
    dataSource = await setupTestDatabase();

    // Create test module with real database connection
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST ?? 'localhost',
          port: parseInt(process.env.DB_PORT ?? '5432', 10),
          username: process.env.DB_USERNAME ?? 'postgres',
          password: process.env.DB_PASSWORD ?? 'postgres',
          database: process.env.DB_DATABASE_TEST ?? 'crypto_knowledge_test',
          entities: [ContentItemEntity],
          synchronize: true,
          dropSchema: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([ContentItemEntity]),
      ],
      providers: [
        GetContentByHashQueryHandler,
        {
          provide: 'IContentItemReadRepository',
          useClass: TypeOrmContentItemReadRepository,
        },
      ],
    }).compile();

    handler = module.get<GetContentByHashQueryHandler>(
      GetContentByHashQueryHandler,
    );
    repository = module.get<TypeOrmContentItemReadRepository>(
      'IContentItemReadRepository',
    );
  });

  afterAll(async () => {
    await module.close();
    await teardownTestDatabase(dataSource);
  });

  beforeEach(async () => {
    // Clear database before each test
    const repo = dataSource.getRepository(ContentItemEntity);
    await repo.clear();
  });

  describe('end-to-end query execution', () => {
    it('should return content when it exists in database', async () => {
      // Arrange - Insert test content directly into database
      const repo = dataSource.getRepository(ContentItemEntity);
      const hashValue = 'a'.repeat(64);

      const testContent = repo.create({
        contentId: 'test-content-123',
        sourceId: 'test-source-456',
        contentHash: hashValue,
        rawContent: 'Bitcoin reaches new all-time high',
        normalizedContent: 'bitcoin reaches new all time high',
        title: 'BTC News',
        author: 'John Doe',
        publishedAt: new Date('2024-01-15T10:00:00Z'),
        language: 'en',
        sourceUrl: 'https://example.com/btc-news',
        assetTags: [
          { symbol: 'BTC', confidence: 0.95 },
          { symbol: 'BITCOIN', confidence: 0.9 },
        ],
        collectedAt: new Date('2024-01-15T10:05:00Z'),
        version: 1,
      });

      await repo.save(testContent);

      // Act - Execute query
      const query = new GetContentByHashQuery(hashValue);
      const result = await handler.execute(query);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.contentId).toBe('test-content-123');
      expect(result?.sourceId).toBe('test-source-456');
      expect(result?.contentHash).toBe(hashValue);
      expect(result?.rawContent).toBe('Bitcoin reaches new all-time high');
      expect(result?.normalizedContent).toBe(
        'bitcoin reaches new all time high',
      );
      expect(result?.title).toBe('BTC News');
      expect(result?.author).toBe('John Doe');
      expect(result?.language).toBe('en');
      expect(result?.sourceUrl).toBe('https://example.com/btc-news');
      expect(result?.assetTags).toHaveLength(2);
      expect(result?.assetTags[0]).toEqual({ symbol: 'BTC', confidence: 0.95 });
    });

    it('should return null when content does not exist', async () => {
      // Arrange - Use a hash that doesn't exist in database
      const nonExistentHash = 'b'.repeat(64);

      // Act - Execute query
      const query = new GetContentByHashQuery(nonExistentHash);
      const result = await handler.execute(query);

      // Assert
      expect(result).toBeNull();
    });

    it('should distinguish between different hashes', async () => {
      // Arrange - Insert two different content items
      const repo = dataSource.getRepository(ContentItemEntity);
      const hash1 = '1'.repeat(64);
      const hash2 = '2'.repeat(64);

      const content1 = repo.create({
        contentId: 'content-1',
        sourceId: 'source-1',
        contentHash: hash1,
        rawContent: 'Content 1',
        normalizedContent: 'content 1',
        title: 'Title 1',
        author: null,
        publishedAt: null,
        language: 'en',
        sourceUrl: null,
        assetTags: [],
        collectedAt: new Date(),
        version: 1,
      });

      const content2 = repo.create({
        contentId: 'content-2',
        sourceId: 'source-2',
        contentHash: hash2,
        rawContent: 'Content 2',
        normalizedContent: 'content 2',
        title: 'Title 2',
        author: null,
        publishedAt: null,
        language: 'en',
        sourceUrl: null,
        assetTags: [],
        collectedAt: new Date(),
        version: 1,
      });

      await repo.save([content1, content2]);

      // Act - Query for each hash
      const result1 = await handler.execute(new GetContentByHashQuery(hash1));
      const result2 = await handler.execute(new GetContentByHashQuery(hash2));

      // Assert
      expect(result1).not.toBeNull();
      expect(result1?.contentId).toBe('content-1');
      expect(result1?.contentHash).toBe(hash1);

      expect(result2).not.toBeNull();
      expect(result2?.contentId).toBe('content-2');
      expect(result2?.contentHash).toBe(hash2);
    });

    it('should handle hash-based deduplication check', async () => {
      // Arrange - Insert content with specific hash
      const repo = dataSource.getRepository(ContentItemEntity);
      const duplicateHash = 'c'.repeat(64);

      const existingContent = repo.create({
        contentId: 'existing-content',
        sourceId: 'source-1',
        contentHash: duplicateHash,
        rawContent: 'Existing content',
        normalizedContent: 'existing content',
        title: 'Existing',
        author: null,
        publishedAt: null,
        language: 'en',
        sourceUrl: null,
        assetTags: [],
        collectedAt: new Date(),
        version: 1,
      });

      await repo.save(existingContent);

      // Act - Check if content with this hash exists (deduplication check)
      const query = new GetContentByHashQuery(duplicateHash);
      const result = await handler.execute(query);

      // Assert - Should find the existing content
      expect(result).not.toBeNull();
      expect(result?.contentId).toBe('existing-content');
      expect(result?.contentHash).toBe(duplicateHash);

      // This confirms deduplication would work:
      // If result is not null, content already exists, skip ingestion
    });
  });

  describe('repository integration', () => {
    it('should use ContentHash value object correctly', async () => {
      // Arrange
      const repo = dataSource.getRepository(ContentItemEntity);
      const hashValue = 'd'.repeat(64);

      const testContent = repo.create({
        contentId: 'test-vo',
        sourceId: 'source-vo',
        contentHash: hashValue,
        rawContent: 'Test VO',
        normalizedContent: 'test vo',
        title: 'VO Test',
        author: null,
        publishedAt: null,
        language: 'en',
        sourceUrl: null,
        assetTags: [],
        collectedAt: new Date(),
        version: 1,
      });

      await repo.save(testContent);

      // Act - Query using ContentHash value object
      const contentHash = ContentHash.create(hashValue);
      const result = await repository.findByHash(contentHash);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.contentId).toBe('test-vo');
      expect(result?.contentHash).toBe(hashValue);
    });
  });
});
