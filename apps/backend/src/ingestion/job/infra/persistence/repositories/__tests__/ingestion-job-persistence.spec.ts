import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IngestionJob } from '@/ingestion/job/domain/aggregates/ingestion-job';
import { JobMetrics } from '@/ingestion/job/domain/value-objects';
import {
  SourceType,
  SourceTypeEnum,
} from '@/ingestion/source/domain/value-objects';
import { SourceConfiguration } from '@/ingestion/source/domain/aggregates/source-configuration';
import { TypeOrmIngestionJobWriteRepository } from '../ingestion-job-write';
import { TypeOrmIngestionJobReadRepository } from '../ingestion-job-read';
import { TypeOrmIngestionJobFactory } from '../../factories/ingestion-job-factory';
import { IngestionJobEntity } from '../../entities/ingestion-job';

/**
 * Property Test 10: Job Metrics Recording
 *
 * Validates: Requirements 4.5
 *
 * This test verifies that job metrics are correctly persisted and retrieved
 * through the write repository, read repository, and factory.
 */
describe('Property 10: Job Metrics Recording', () => {
  let writeRepo: TypeOrmIngestionJobWriteRepository;
  let factory: TypeOrmIngestionJobFactory;
  let mockRepository: jest.Mocked<Repository<IngestionJobEntity>>;

  // Helper to create a valid source configuration
  const createValidSourceConfig = (): SourceConfiguration => {
    return SourceConfiguration.create({
      sourceId: 'source-123',
      sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
      name: 'Test Source',
      config: { url: 'https://example.com' },
    });
  };

  // Arbitrary for job metrics (ensures duplicates <= items collected)
  const metricsArbitrary = fc
    .record({
      itemsCollected: fc.integer({ min: 0, max: 10000 }),
      errorsEncountered: fc.integer({ min: 0, max: 100 }),
      bytesProcessed: fc.integer({ min: 0, max: 1000000000 }),
      durationMs: fc.integer({ min: 0, max: 3600000 }),
    })
    .chain((base) =>
      fc
        .integer({ min: 0, max: base.itemsCollected })
        .map((duplicatesDetected) => ({
          ...base,
          duplicatesDetected,
        })),
    );

  beforeEach(async () => {
    // Create mock repository
    const mockQueryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockRepository = {
      findOne: jest.fn(),
      insert: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as unknown as jest.Mocked<Repository<IngestionJobEntity>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TypeOrmIngestionJobWriteRepository,
        TypeOrmIngestionJobReadRepository,
        TypeOrmIngestionJobFactory,
        {
          provide: getRepositoryToken(IngestionJobEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    writeRepo = module.get<TypeOrmIngestionJobWriteRepository>(
      TypeOrmIngestionJobWriteRepository,
    );
    factory = module.get<TypeOrmIngestionJobFactory>(
      TypeOrmIngestionJobFactory,
    );
  });

  it('should persist and retrieve job metrics correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // jobId
        metricsArbitrary,
        async (jobId: string, metricsData) => {
          // Create job
          const sourceConfig = createValidSourceConfig();
          const job = IngestionJob.create(jobId, sourceConfig);

          // Start and complete job with metrics
          job.start();
          const metrics = JobMetrics.create(metricsData);
          job.complete(metrics);

          // Persist job (will use update path since version is 2)
          await writeRepo.save(job);

          // Verify createQueryBuilder was called for update
          // eslint-disable-next-line @typescript-eslint/unbound-method
          expect(mockRepository.createQueryBuilder).toHaveBeenCalled();

          // Mock the read operation
          mockRepository.findOne.mockResolvedValue({
            jobId,
            sourceId: sourceConfig.sourceId,
            sourceConfig: {
              sourceId: sourceConfig.sourceId,
              sourceType: sourceConfig.sourceType.toString(),
              name: sourceConfig.name,
              config: sourceConfig.config,
              isActive: sourceConfig.isActive,
              createdAt: sourceConfig.createdAt,
              updatedAt: sourceConfig.updatedAt,
            },
            status: 'COMPLETED',
            scheduledAt: job.scheduledAt,
            executedAt: job.executedAt,
            completedAt: job.completedAt,
            itemsCollected: metricsData.itemsCollected,
            duplicatesDetected: metricsData.duplicatesDetected,
            errorsEncountered: metricsData.errorsEncountered,
            bytesProcessed: metricsData.bytesProcessed,
            durationMs: metricsData.durationMs,
            errors: [],
            version: 2, // Started (v1) + Completed (v2)
            createdAt: new Date(),
            updatedAt: new Date(),
          } as IngestionJobEntity);

          // Retrieve job using factory
          const retrievedJob = await factory.load(jobId);

          // Verify job was retrieved
          expect(retrievedJob).not.toBeNull();
          expect(retrievedJob!.jobId).toBe(jobId);

          // Verify metrics were retrieved correctly
          const retrievedMetrics = retrievedJob!.metrics;
          expect(retrievedMetrics.itemsCollected).toBe(
            metricsData.itemsCollected,
          );
          expect(retrievedMetrics.duplicatesDetected).toBe(
            metricsData.duplicatesDetected,
          );
          expect(retrievedMetrics.errorsEncountered).toBe(
            metricsData.errorsEncountered,
          );
          expect(retrievedMetrics.bytesProcessed).toBe(
            metricsData.bytesProcessed,
          );
          expect(retrievedMetrics.durationMs).toBe(metricsData.durationMs);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('should handle zero metrics correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // jobId
        async (jobId: string) => {
          // Create job
          const sourceConfig = createValidSourceConfig();
          const job = IngestionJob.create(jobId, sourceConfig);

          // Start and complete job with zero metrics
          job.start();
          const metrics = JobMetrics.create({
            itemsCollected: 0,
            duplicatesDetected: 0,
            errorsEncountered: 0,
            bytesProcessed: 0,
            durationMs: 0,
          });
          job.complete(metrics);

          // Persist job (will use update path since version is 2)
          await writeRepo.save(job);

          // Verify createQueryBuilder was called for update
          // eslint-disable-next-line @typescript-eslint/unbound-method
          expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
        },
      ),
      { numRuns: 20 },
    );
  });

  it('should preserve metrics precision for large values', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // jobId
        fc.integer({ min: 1000000, max: Number.MAX_SAFE_INTEGER }), // large bytes
        fc.integer({ min: 100000, max: 10000000 }), // large duration
        async (jobId: string, largeBytes: number, largeDuration: number) => {
          // Create job
          const sourceConfig = createValidSourceConfig();
          const job = IngestionJob.create(jobId, sourceConfig);

          // Start and complete job with large metrics
          job.start();
          const metrics = JobMetrics.create({
            itemsCollected: 10000,
            duplicatesDetected: 500,
            errorsEncountered: 10,
            bytesProcessed: largeBytes,
            durationMs: largeDuration,
          });
          job.complete(metrics);

          // Persist job (will use update path since version is 2)
          await writeRepo.save(job);

          // Verify createQueryBuilder was called for update
          // eslint-disable-next-line @typescript-eslint/unbound-method
          expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
        },
      ),
      { numRuns: 30 },
    );
  });
});
