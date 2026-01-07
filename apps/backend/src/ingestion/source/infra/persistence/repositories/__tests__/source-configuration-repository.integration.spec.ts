import { DataSource, Repository } from 'typeorm';
import { setupTestDatabase, teardownTestDatabase } from '@/../test/setup';
import { SourceConfiguration } from '@/ingestion/source/domain/aggregates/source-configuration';
import {
  SourceType,
  SourceTypeEnum,
} from '@/ingestion/source/domain/value-objects/source-type';
import { TypeOrmSourceConfigurationWriteRepository } from '../source-configuration-write';
import { TypeOrmSourceConfigurationReadRepository } from '../source-configuration-read';
import { TypeOrmSourceConfigurationFactory } from '../../factories/source-configuration-factory';
import { SourceConfigurationEntity } from '../../entities/source-configuration';

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */

/**
 * SourceConfiguration Repository Integration Tests
 *
 * Tests actual database operations to catch schema mismatches early.
 * Run with: npm run test:integration
 */
describe('SourceConfiguration Repository Integration', () => {
  let dataSource: DataSource;
  let writeRepo: TypeOrmSourceConfigurationWriteRepository;
  let readRepo: TypeOrmSourceConfigurationReadRepository;
  let factory: TypeOrmSourceConfigurationFactory;
  let entityRepository: Repository<SourceConfigurationEntity>;

  beforeAll(async () => {
    dataSource = await setupTestDatabase();
    entityRepository = dataSource.getRepository(SourceConfigurationEntity);
    writeRepo = new TypeOrmSourceConfigurationWriteRepository(entityRepository);
    readRepo = new TypeOrmSourceConfigurationReadRepository(entityRepository);
    factory = new TypeOrmSourceConfigurationFactory(readRepo);
  });

  afterAll(async () => {
    await teardownTestDatabase(dataSource);
  });

  afterEach(async () => {
    await entityRepository.clear();
  });

  describe('Write Repository', () => {
    it('should save a new source configuration with all fields', async () => {
      const source = SourceConfiguration.create({
        sourceId: 'source-1',
        sourceType: SourceType.fromEnum(SourceTypeEnum.RSS),
        name: 'CoinTelegraph',
        config: {
          feedUrl: 'https://cointelegraph.com/rss',
          updateInterval: 3600,
        },
        credentials: 'encrypted-credentials',
      });

      await writeRepo.save(source);

      const saved = await entityRepository.findOne({
        where: { sourceId: 'source-1' },
      });

      expect(saved).toBeDefined();
      expect(saved?.sourceId).toBe('source-1');
      expect(saved?.sourceType).toBe('RSS');
      expect(saved?.name).toBe('CoinTelegraph');
      expect(saved?.config).toEqual({
        feedUrl: 'https://cointelegraph.com/rss',
        updateInterval: 3600,
      });
      expect(saved?.credentials).toBe('encrypted-credentials');
      expect(saved?.isActive).toBe(true);
      expect(saved?.version).toBe(0);
    });

    it('should save source configuration without credentials', async () => {
      const source = SourceConfiguration.create({
        sourceId: 'source-2',
        sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
        name: 'Bitcoin.org',
        config: {
          url: 'https://bitcoin.org',
        },
      });

      await writeRepo.save(source);

      const saved = await entityRepository.findOne({
        where: { sourceId: 'source-2' },
      });

      expect(saved).toBeDefined();
      expect(saved?.credentials).toBeNull();
    });

    it('should update existing source configuration with version increment', async () => {
      const source = SourceConfiguration.create({
        sourceId: 'source-3',
        sourceType: SourceType.fromEnum(SourceTypeEnum.RSS),
        name: 'Original Name',
        config: { feedUrl: 'https://example.com/rss' },
      });

      await writeRepo.save(source);

      source.update({ name: 'Updated Name' });
      await writeRepo.save(source);

      const updated = await entityRepository.findOne({
        where: { sourceId: 'source-3' },
      });

      expect(updated?.name).toBe('Updated Name');
      expect(updated?.version).toBe(1);
    });
  });

  describe('Read Repository', () => {
    beforeEach(async () => {
      const source1 = SourceConfiguration.create({
        sourceId: 'read-test-1',
        sourceType: SourceType.fromEnum(SourceTypeEnum.RSS),
        name: 'Active Source',
        config: { feedUrl: 'https://active.com/rss' },
      });

      const source2 = SourceConfiguration.create({
        sourceId: 'read-test-2',
        sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
        name: 'Inactive Source',
        config: { url: 'https://inactive.com' },
        isActive: false,
      });

      await writeRepo.save(source1);
      await writeRepo.save(source2);
    });

    it('should find source by ID', async () => {
      const found = await readRepo.findById('read-test-1');

      expect(found).toBeDefined();
      expect(found?.sourceId).toBe('read-test-1');
      expect(found?.name).toBe('Active Source');
    });

    it('should return null for non-existent source', async () => {
      const found = await readRepo.findById('non-existent');
      expect(found).toBeNull();
    });

    it('should find only active sources', async () => {
      const active = await readRepo.findActive();

      expect(active).toHaveLength(1);
      expect(active[0].sourceId).toBe('read-test-1');
      expect(active[0].isActive).toBe(true);
    });

    it('should find sources by type', async () => {
      const rssSources = await readRepo.findByType('RSS');

      expect(rssSources).toHaveLength(1);
      expect(rssSources[0].sourceType).toBe('RSS');
    });
  });

  describe('Factory', () => {
    beforeEach(async () => {
      const source = SourceConfiguration.create({
        sourceId: 'factory-test-1',
        sourceType: SourceType.fromEnum(SourceTypeEnum.RSS),
        name: 'Factory Test Source',
        config: {
          feedUrl: 'https://factory.com/rss',
          updateInterval: 3600,
        },
        credentials: 'encrypted-creds',
      });

      await writeRepo.save(source);
    });

    it('should reconstitute source configuration from database', async () => {
      const loaded = await factory.load('factory-test-1');

      expect(loaded).toBeDefined();
      expect(loaded).toBeInstanceOf(SourceConfiguration);
      expect(loaded?.sourceId).toBe('factory-test-1');
      expect(loaded?.name).toBe('Factory Test Source');
      expect(loaded?.sourceType.toString()).toBe('RSS');
      expect(loaded?.config).toEqual({
        feedUrl: 'https://factory.com/rss',
        updateInterval: 3600,
      });
    });

    it('should return null for non-existent source', async () => {
      const loaded = await factory.load('non-existent');
      expect(loaded).toBeNull();
    });

    it('should reconstitute with correct version', async () => {
      const loaded = await factory.load('factory-test-1');
      expect(loaded?.toObject().version).toBe(0);
    });
  });
});
