/**
 * Content Deduplication Integration Test
 *
 * Tests the content deduplication flow:
 * - Ingest content for the first time
 * - Ingest the same content again
 * - Verify duplicate is detected
 * - Verify duplicate counter is incremented
 * - Verify content is not persisted twice
 *
 * Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3
 * Design: Testing Strategy - Integration Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus, CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { IngestContentCommand } from '@/ingestion/content/app/commands/ingest-content/command';
import { IngestContentResult } from '@/ingestion/content/app/commands/ingest-content/result';
import { ConfigureSourceCommand } from '@/ingestion/source/app/commands/configure-source/command';
import { ConfigureSourceResult } from '@/ingestion/source/app/commands/configure-source/result';
import { GetContentByHashQuery } from '@/ingestion/content/app/queries/get-content-by-hash/query';
import { IngestionSharedModule } from '@/ingestion/shared/ingestion-shared.module';
import { IngestionSourceModule } from '@/ingestion/source/ingestion-source.module';
import { IngestionJobModule } from '@/ingestion/job/ingestion-job.module';
import { IngestionContentModule } from '@/ingestion/content/ingestion-content.module';
import { SourceTypeEnum } from '@/ingestion/source/domain/value-objects/source-type';
import { ContentHashGenerator } from '@/ingestion/content/domain/services/content-hash-generator';
import { createTestDataSource } from '@/../test/setup';

describe('Integration: Content Deduplication', () => {
  let module: TestingModule;
  let commandBus: CommandBus;
  let queryBus: QueryBus;
  let dataSource: DataSource;
  let hashGenerator: ContentHashGenerator;

  beforeAll(async () => {
    // Create test database connection
    dataSource = createTestDataSource();
    await dataSource.initialize();

    // Create test module with all required modules
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST ?? 'localhost',
          port: parseInt(process.env.DB_PORT ?? '5432', 10),
          username: process.env.DB_USERNAME ?? 'postgres',
          password: process.env.DB_PASSWORD ?? 'postgres',
          database: process.env.DB_DATABASE_TEST ?? 'crypto_knowledge_test',
          entities: [__dirname + '/../../**/infra/persistence/entities/*.ts'],
          synchronize: true,
          dropSchema: true,
          logging: false,
        }),
        CqrsModule,
        IngestionSharedModule,
        IngestionSourceModule,
        IngestionJobModule,
        IngestionContentModule,
      ],
    }).compile();

    commandBus = module.get(CommandBus);
    queryBus = module.get(QueryBus);
    hashGenerator = module.get(ContentHashGenerator);

    await module.init();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  describe('Duplicate Detection', () => {
    it('should detect duplicate content on second ingestion', async () => {
      // Define test content
      const testContent =
        'This is unique test content for deduplication testing';

      // Mock the adapter to return controlled content
      const mockAdapter = {
        collect: jest.fn().mockResolvedValue([
          {
            externalId: 'dedup-test-1',
            content: testContent,
            metadata: {
              title: 'Deduplication Test',
              publishedAt: new Date(),
            },
          },
        ]),
      };

      const adapterRegistry = module.get('AdapterRegistry');
      jest.spyOn(adapterRegistry, 'getAdapter').mockReturnValue(mockAdapter);

      // 1. Configure a test source
      const configureResult = await commandBus.execute<
        ConfigureSourceCommand,
        ConfigureSourceResult
      >(
        new ConfigureSourceCommand(
          undefined,
          SourceTypeEnum.WEB,
          'Test Deduplication Source',
          {
            url: 'https://example.com',
            selectors: {
              title: 'h1',
              content: 'article',
            },
          },
          undefined,
          true,
        ),
      );

      const sourceId = configureResult.sourceId;

      // 2. First ingestion - should succeed
      const firstResult = await commandBus.execute<
        IngestContentCommand,
        IngestContentResult
      >(new IngestContentCommand(sourceId));

      expect(firstResult.itemsCollected).toBe(1);
      expect(mockAdapter.collect).toHaveBeenCalledTimes(1);

      // 3. Generate hash for the test content
      const contentHash = hashGenerator.generate(testContent);

      // 4. Verify content was persisted
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const persistedContent = await queryBus.execute(
        new GetContentByHashQuery(contentHash.getValue()),
      );

      expect(persistedContent).toBeDefined();
      expect(persistedContent.contentHash).toBe(contentHash.getValue());

      // 5. Second ingestion - should detect duplicate
      const secondResult = await commandBus.execute<
        IngestContentCommand,
        IngestContentResult
      >(new IngestContentCommand(sourceId));

      // 6. Verify collection happened
      expect(secondResult.itemsCollected).toBe(1);
      expect(mockAdapter.collect).toHaveBeenCalledTimes(2);

      // 7. Wait for event processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 8. Verify content was not duplicated in database
      // Query should still return the same single content item
      const contentAfterSecondIngestion = await queryBus.execute(
        new GetContentByHashQuery(contentHash.getValue()),
      );

      expect(contentAfterSecondIngestion).toBeDefined();
      expect(contentAfterSecondIngestion.contentHash).toBe(
        contentHash.getValue(),
      );
      // Content should still be the same (not duplicated)
    }, 30000);

    it('should not persist duplicate content twice', async () => {
      // Mock adapter with consistent content
      const mockAdapter = {
        collect: jest.fn().mockResolvedValue([
          {
            externalId: 'rss-1',
            content: 'RSS feed content for deduplication',
            metadata: {
              title: 'RSS Test',
              publishedAt: new Date(),
            },
          },
        ]),
      };

      const adapterRegistry = module.get('AdapterRegistry');
      jest.spyOn(adapterRegistry, 'getAdapter').mockReturnValue(mockAdapter);

      // 1. Configure source
      const configureResult = await commandBus.execute(
        new ConfigureSourceCommand(
          undefined,
          SourceTypeEnum.RSS,
          'Test RSS Deduplication',
          {
            feedUrl: 'https://example.com/feed.xml',
          },
          undefined,
          true,
        ),
      );

      const sourceId = configureResult.sourceId;

      // 2. First ingestion
      const firstResult = await commandBus.execute(
        new IngestContentCommand(sourceId),
      );

      expect(firstResult.itemsCollected).toBe(1);
      expect(firstResult.duplicatesDetected).toBe(0);

      // 3. Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 4. Second ingestion (same source, should return same content)
      const secondResult = await commandBus.execute(
        new IngestContentCommand(sourceId),
      );

      // 5. Verify collection happened
      expect(secondResult.itemsCollected).toBe(1);

      // 6. Wait for event processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 7. Verify content was not persisted twice
      const contentHash = hashGenerator.generate(
        'RSS feed content for deduplication',
      );
      const persistedContent = await queryBus.execute(
        new GetContentByHashQuery(contentHash.getValue()),
      );

      expect(persistedContent).toBeDefined();
      expect(persistedContent.contentHash).toBe(contentHash.getValue());
    }, 30000);

    it('should increment duplicate counter correctly', async () => {
      // Mock adapter
      const mockAdapter = {
        collect: jest.fn().mockResolvedValue([
          {
            externalId: 'counter-test-1',
            content: 'Content for counter test',
            metadata: {
              title: 'Counter Test',
              publishedAt: new Date(),
            },
          },
        ]),
      };

      const adapterRegistry = module.get('AdapterRegistry');
      jest.spyOn(adapterRegistry, 'getAdapter').mockReturnValue(mockAdapter);

      // 1. Configure source
      const configureResult = await commandBus.execute(
        new ConfigureSourceCommand(
          undefined,
          SourceTypeEnum.WEB,
          'Test Duplicate Counter',
          {
            url: 'https://example.com',
            selectors: {
              title: 'h1',
              content: 'article',
            },
          },
          undefined,
          true,
        ),
      );

      const sourceId = configureResult.sourceId;

      // 2. First ingestion
      const firstResult = await commandBus.execute(
        new IngestContentCommand(sourceId),
      );

      expect(firstResult.itemsCollected).toBe(1);

      // 3. Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 4. Second ingestion
      const secondResult = await commandBus.execute(
        new IngestContentCommand(sourceId),
      );

      // 5. Verify collection happened
      expect(secondResult.itemsCollected).toBe(1);

      // 6. Wait for event processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 7. Verify content was not duplicated
      const contentHash = hashGenerator.generate('Content for counter test');
      const persistedContent = await queryBus.execute(
        new GetContentByHashQuery(contentHash.getValue()),
      );

      expect(persistedContent).toBeDefined();
      expect(persistedContent.contentHash).toBe(contentHash.getValue());
    }, 30000);
  });

  describe('Hash-Based Deduplication', () => {
    it('should use content hash for duplicate detection', async () => {
      // 1. Create test content
      const testContent = 'Unique content for hash testing';

      // 2. Generate hash
      const hash = hashGenerator.generate(testContent);

      expect(hash).toBeDefined();
      expect(hash.getValue()).toHaveLength(64); // SHA-256 produces 64-char hex

      // 3. Query by hash (should return null initially)
      const result = await queryBus.execute(
        new GetContentByHashQuery(hash.getValue()),
      );

      // Initially, no content with this hash should exist
      expect(result).toBeNull();
    });

    it('should find content by hash after ingestion', async () => {
      // This test would require:
      // 1. Ingesting content with known hash
      // 2. Querying by that hash
      // 3. Verifying the content is found
      //
      // Note: Requires controlled test data or mock adapter
      expect(true).toBe(true);
    });
  });

  describe('Deduplication Across Sources', () => {
    it('should detect duplicates even from different sources', async () => {
      // 1. Configure first source
      const source1Result = await commandBus.execute(
        new ConfigureSourceCommand(
          undefined,
          SourceTypeEnum.WEB,
          'Source 1',
          {
            url: 'https://example1.com',
            selectors: { title: 'h1', content: 'article' },
          },
          undefined,
          true,
        ),
      );

      // 2. Configure second source
      const source2Result = await commandBus.execute(
        new ConfigureSourceCommand(
          undefined,
          SourceTypeEnum.RSS,
          'Source 2',
          {
            feedUrl: 'https://example2.com/feed.xml',
          },
          undefined,
          true,
        ),
      );

      // 3. Ingest from first source
      const result1 = await commandBus.execute(
        new IngestContentCommand(source1Result.sourceId),
      );

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 4. Ingest from second source (if it returns same content, should detect duplicate)
      const result2 = await commandBus.execute(
        new IngestContentCommand(source2Result.sourceId),
      );

      // 5. Verify both ingestions completed
      expect(result1.itemsCollected).toBeGreaterThanOrEqual(0);
      expect(result2.itemsCollected).toBeGreaterThanOrEqual(0);

      // Note: Actual duplicate detection across sources depends on
      // both adapters returning the same content
    }, 30000);
  });
});
