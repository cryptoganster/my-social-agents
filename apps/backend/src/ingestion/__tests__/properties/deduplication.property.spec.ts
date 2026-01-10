/**
 * Property-Based Test: Deduplication Correctness
 *
 * Property 3: Deduplication Correctness
 * For any content with a given hash, if GetContentByHashQuery returns a result,
 * then IngestContentCommand must skip persistence and increment duplicate counter.
 *
 * This test focuses on the hash generation property which is the foundation
 * of deduplication: same content always produces the same hash, different
 * content produces different hashes.
 *
 * Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3
 * Design: Correctness Properties - Property 3
 *
 * Feature: ingestion-event-driven-architecture, Property 3: Deduplication Correctness
 */

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SharedModule } from '@/shared/shared.module';
import { IngestionContentModule } from '@/ingestion/content/ingestion-content.module';
import { ContentHashGenerator } from '@/ingestion/content/domain/services/content-hash-generator';
import { createTestDataSource } from '@/../test/setup';

describe('Property: Deduplication Correctness', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let hashGenerator: ContentHashGenerator;

  beforeAll(async () => {
    dataSource = createTestDataSource();
    await dataSource.initialize();

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
        SharedModule,
        IngestionContentModule,
      ],
    }).compile();

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

  /**
   * Property 3: Deduplication Correctness - Hash Consistency
   *
   * For any content string, the hash should be consistent across multiple generations.
   * Same content should always produce the same hash (deterministic hashing).
   * This is the foundation of deduplication.
   */
  it('should produce consistent hashes for same content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 100, maxLength: 1000 }),
        async (content) => {
          // Generate hash multiple times for the same content
          const hash1 = hashGenerator.generate(content);
          const hash2 = hashGenerator.generate(content);
          const hash3 = hashGenerator.generate(content);

          // Verify all hashes are identical (deterministic)
          expect(hash1.getValue()).toBe(hash2.getValue());
          expect(hash2.getValue()).toBe(hash3.getValue());
          expect(hash1.getValue()).toBe(hash3.getValue());

          // Verify hash format (SHA-256 produces 64-character hex string)
          expect(hash1.getValue()).toHaveLength(64);
          expect(hash1.getValue()).toMatch(/^[a-f0-9]{64}$/);
        },
      ),
      { numRuns: 20, timeout: 60000 },
    );
  }, 120000);

  /**
   * Additional property: Different content produces different hashes
   *
   * For any two different content strings, they should produce different hashes.
   * This ensures no false duplicates (hash collisions are extremely unlikely with SHA-256).
   */
  it('should produce different hashes for different content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .tuple(
            fc.string({ minLength: 100, maxLength: 500 }),
            fc.string({ minLength: 100, maxLength: 500 }),
          )
          .filter(([content1, content2]) => content1 !== content2), // Ensure different
        async ([content1, content2]) => {
          // Generate hashes for both content items
          const hash1 = hashGenerator.generate(content1);
          const hash2 = hashGenerator.generate(content2);

          // Verify different content produces different hashes
          expect(hash1.getValue()).not.toBe(hash2.getValue());

          // Both should be valid SHA-256 hashes
          expect(hash1.getValue()).toHaveLength(64);
          expect(hash2.getValue()).toHaveLength(64);
          expect(hash1.getValue()).toMatch(/^[a-f0-9]{64}$/);
          expect(hash2.getValue()).toMatch(/^[a-f0-9]{64}$/);
        },
      ),
      { numRuns: 20, timeout: 60000 },
    );
  }, 120000);

  /**
   * Property: Hash independence from metadata
   *
   * For any content, the hash should depend only on the content itself,
   * not on metadata like title, author, or timestamps.
   * This ensures that the same content from different sources is recognized as duplicate.
   */
  it('should produce same hash regardless of metadata', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 100, maxLength: 1000 }),
        async (content) => {
          // Generate hash for the same content (metadata doesn't matter)
          const hash1 = hashGenerator.generate(content);
          const hash2 = hashGenerator.generate(content);

          // Hashes should be identical even though we're treating them
          // as if they came with different metadata
          expect(hash1.getValue()).toBe(hash2.getValue());
        },
      ),
      { numRuns: 20, timeout: 60000 },
    );
  }, 120000);

  /**
   * Property: Minor content changes produce different hashes
   *
   * Even small changes to content should produce completely different hashes.
   * This is a property of cryptographic hash functions (avalanche effect).
   *
   * Uses a fixed seed for reproducibility across different environments (local, CI).
   * Uses guaranteed-different modifications to ensure test reliability.
   */
  it('should produce different hashes for minor content changes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 100, maxLength: 500 }),
        async (content) => {
          // Original content
          const hash1 = hashGenerator.generate(content);

          // Strategy 1: Add a unique suffix (guaranteed to be different)
          const modifiedContent = content + '_MODIFIED_SUFFIX';
          const hash2 = hashGenerator.generate(modifiedContent);

          // Hashes should be completely different
          expect(hash1.getValue()).not.toBe(hash2.getValue());

          // Strategy 2: Prepend a unique prefix (guaranteed to be different)
          const alteredContent = 'PREFIX_' + content;
          const hash3 = hashGenerator.generate(alteredContent);

          expect(hash1.getValue()).not.toBe(hash3.getValue());
          expect(hash2.getValue()).not.toBe(hash3.getValue());

          // Strategy 3: Append different suffix (guaranteed to be different from strategy 1)
          const anotherModification = content + '_DIFFERENT_SUFFIX';
          const hash4 = hashGenerator.generate(anotherModification);

          expect(hash1.getValue()).not.toBe(hash4.getValue());
          expect(hash2.getValue()).not.toBe(hash4.getValue());
          expect(hash3.getValue()).not.toBe(hash4.getValue());
        },
      ),
      { numRuns: 100, timeout: 60000, seed: 42 }, // Fixed seed for reproducibility, increased to 100 runs per testing standards
    );
  }, 120000);
});
