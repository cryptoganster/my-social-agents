import { DataSource, Repository } from 'typeorm';
import { setupTestDatabase, teardownTestDatabase } from '@/../test/setup';
import { IngestionJob } from '@/ingestion/job/domain/aggregates/ingestion-job';
import { JobMetrics } from '@/ingestion/job/domain/value-objects';
import { SourceConfiguration } from '@/ingestion/source/domain/aggregates/source-configuration';
import {
  SourceType,
  SourceTypeEnum,
} from '@/ingestion/source/domain/value-objects/source-type';
import {
  ErrorRecord,
  ErrorType,
} from '@/ingestion/shared/entities/error-record';
import { TypeOrmIngestionJobWriteRepository } from '../ingestion-job-write';
import { TypeOrmIngestionJobReadRepository } from '../ingestion-job-read';
import { TypeOrmIngestionJobFactory } from '../../factories/ingestion-job-factory';
import { IngestionJobEntity } from '../../entities/ingestion-job';

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/**
 * IngestionJob Repository Integration Tests
 *
 * Tests actual database operations to catch schema mismatches early.
 * Run with: npm run test:integration
 */
describe('IngestionJob Repository Integration', () => {
  let dataSource: DataSource;
  let writeRepo: TypeOrmIngestionJobWriteRepository;
  let readRepo: TypeOrmIngestionJobReadRepository;
  let factory: TypeOrmIngestionJobFactory;
  let entityRepository: Repository<IngestionJobEntity>;
  let testSourceConfig: SourceConfiguration;

  beforeAll(async () => {
    dataSource = await setupTestDatabase();
    entityRepository = dataSource.getRepository(IngestionJobEntity);
    writeRepo = new TypeOrmIngestionJobWriteRepository(entityRepository);
    readRepo = new TypeOrmIngestionJobReadRepository(entityRepository);
    factory = new TypeOrmIngestionJobFactory(readRepo);

    // Create a test source configuration
    testSourceConfig = SourceConfiguration.create({
      sourceId: 'test-source-1',
      sourceType: SourceType.fromEnum(SourceTypeEnum.RSS),
      name: 'Test Source',
      config: { feedUrl: 'https://test.com/rss' },
    });
  });

  afterAll(async () => {
    await teardownTestDatabase(dataSource);
  });

  afterEach(async () => {
    await entityRepository.clear();
  });

  describe('Write Repository', () => {
    it('should save a new ingestion job', async () => {
      const job = IngestionJob.create(
        'job-1',
        testSourceConfig,
        new Date('2024-01-01T00:00:00Z'),
      );

      await writeRepo.save(job);

      const saved = await entityRepository.findOne({
        where: { jobId: 'job-1' },
      });

      expect(saved).toBeDefined();
      expect(saved?.jobId).toBe('job-1');
      expect(saved?.sourceId).toBe('test-source-1');
      expect(saved?.status).toBe('PENDING');
      expect(saved?.version).toBe(0);
      expect(saved?.itemsCollected).toBe(0);
      expect(saved?.duplicatesDetected).toBe(0);
      expect(saved?.errorsEncountered).toBe(0);
    });

    it('should update job status with version increment', async () => {
      const job = IngestionJob.create('job-2', testSourceConfig);
      await writeRepo.save(job);

      job.start();
      await writeRepo.save(job);

      const updated = await entityRepository.findOne({
        where: { jobId: 'job-2' },
      });

      expect(updated?.status).toBe('RUNNING');
      expect(updated?.version).toBe(1);
      expect(updated?.executedAt).toBeDefined();
    });

    it('should save job with metrics', async () => {
      const job = IngestionJob.create('job-3', testSourceConfig);
      job.start();

      const metrics = JobMetrics.create({
        itemsCollected: 10,
        duplicatesDetected: 2,
        errorsEncountered: 1,
        bytesProcessed: 1024,
        durationMs: 5000,
      });

      job.complete(metrics);
      await writeRepo.save(job);

      const saved = await entityRepository.findOne({
        where: { jobId: 'job-3' },
      });

      expect(saved?.status).toBe('COMPLETED');
      expect(saved?.itemsCollected).toBe(10);
      expect(saved?.duplicatesDetected).toBe(2);
      expect(saved?.errorsEncountered).toBe(1);
      expect(saved?.bytesProcessed).toBe(1024);
      expect(saved?.durationMs).toBe(5000);
      expect(saved?.completedAt).toBeDefined();
    });

    it('should save job with errors', async () => {
      const job = IngestionJob.create('job-4', testSourceConfig);
      job.start();

      const error = ErrorRecord.create({
        errorType: ErrorType.NETWORK_ERROR,
        message: 'Connection timeout',
        stackTrace: 'Error: Connection timeout\n  at ...',
      });

      job.fail(error);
      await writeRepo.save(job);

      const saved = await entityRepository.findOne({
        where: { jobId: 'job-4' },
      });

      expect(saved?.status).toBe('FAILED');
      expect(saved?.errors).toHaveLength(1);
      expect(saved?.errors[0].errorType).toBe('NETWORK_ERROR');
      expect(saved?.errors[0].message).toBe('Connection timeout');
    });
  });

  describe('Read Repository', () => {
    beforeEach(async () => {
      const job1 = IngestionJob.create('read-job-1', testSourceConfig);
      const job2 = IngestionJob.create('read-job-2', testSourceConfig);
      job2.start();

      const job3 = IngestionJob.create('read-job-3', testSourceConfig);
      job3.start();
      job3.complete(JobMetrics.empty());

      await writeRepo.save(job1);
      await writeRepo.save(job2);
      await writeRepo.save(job3);
    });

    it('should find job by ID', async () => {
      const found = await readRepo.findById('read-job-1');

      expect(found).toBeDefined();
      expect(found?.jobId).toBe('read-job-1');
      expect(found?.status).toBe('PENDING');
    });

    it('should return null for non-existent job', async () => {
      const found = await readRepo.findById('non-existent');
      expect(found).toBeNull();
    });

    it('should find jobs by status', async () => {
      const pending = await readRepo.findByStatus('PENDING');
      const running = await readRepo.findByStatus('RUNNING');
      const completed = await readRepo.findByStatus('COMPLETED');

      expect(pending).toHaveLength(1);
      expect(running).toHaveLength(1);
      expect(completed).toHaveLength(1);
    });

    it('should find jobs by source ID', async () => {
      const jobs = await readRepo.findBySourceId('test-source-1');

      expect(jobs).toHaveLength(3);
      expect(jobs.every((j) => j.sourceId === 'test-source-1')).toBe(true);
    });

    it('should find scheduled jobs before a date', async () => {
      const futureDate = new Date('2025-01-01T00:00:00Z');
      const scheduled = await readRepo.findScheduledJobs(futureDate);

      expect(scheduled.length).toBeGreaterThan(0);
      expect(scheduled.every((j) => j.status === 'PENDING')).toBe(true);
    });
  });

  describe('Factory', () => {
    beforeEach(async () => {
      const job = IngestionJob.create(
        'factory-job-1',
        testSourceConfig,
        new Date('2024-01-01T00:00:00Z'),
      );

      job.start();

      const metrics = JobMetrics.create({
        itemsCollected: 5,
        duplicatesDetected: 1,
        errorsEncountered: 0,
        bytesProcessed: 512,
        durationMs: 2500,
      });

      job.complete(metrics);
      await writeRepo.save(job);
    });

    it('should reconstitute job from database', async () => {
      const loaded = await factory.load('factory-job-1');

      expect(loaded).toBeDefined();
      expect(loaded).toBeInstanceOf(IngestionJob);
      expect(loaded?.jobId).toBe('factory-job-1');
      expect(loaded?.status.toString()).toBe('COMPLETED');
      expect(loaded?.metrics.itemsCollected).toBe(5);
    });

    it('should return null for non-existent job', async () => {
      const loaded = await factory.load('non-existent');
      expect(loaded).toBeNull();
    });

    it('should reconstitute with correct version', async () => {
      const loaded = await factory.load('factory-job-1');
      expect(loaded?.toObject().version).toBe(2); // start() + complete()
    });

    it('should reconstitute source configuration', async () => {
      const loaded = await factory.load('factory-job-1');

      expect(loaded?.sourceConfig).toBeDefined();
      expect(loaded?.sourceConfig.sourceId).toBe('test-source-1');
      expect(loaded?.sourceConfig.name).toBe('Test Source');
    });
  });
});
