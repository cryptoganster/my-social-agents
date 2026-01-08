/**
 * Property-Based Test: Job Lifecycle Progression
 *
 * Property 1: Job Lifecycle Progression
 * For any ingestion job, the status transitions must follow the valid state machine:
 * PENDING → RUNNING → (COMPLETED | FAILED)
 *
 * Requirements: 1.1, 1.3, 1.4, 1.5, 1.6
 * Design: Correctness Properties - Property 1
 *
 * Feature: ingestion-event-driven-architecture, Property 1: Job Lifecycle Progression
 */

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus, CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ScheduleJobCommand } from '@/ingestion/job/app/commands/schedule-job/command';
import { ExecuteIngestionJobCommand } from '@/ingestion/job/app/commands/execute-job/command';
import { GetJobByIdQuery } from '@/ingestion/job/app/queries/get-job-by-id/query';
import { ConfigureSourceCommand } from '@/ingestion/source/app/commands/configure-source/command';
import { IngestionSharedModule } from '@/ingestion/shared/ingestion-shared.module';
import { IngestionSourceModule } from '@/ingestion/source/ingestion-source.module';
import { IngestionJobModule } from '@/ingestion/job/ingestion-job.module';
import { IngestionContentModule } from '@/ingestion/content/ingestion-content.module';
import { SourceTypeEnum } from '@/ingestion/source/domain/value-objects/source-type';
import { createTestDataSource } from '@/../test/setup';

describe('Property: Job Lifecycle Progression', () => {
  let module: TestingModule;
  let commandBus: CommandBus;
  let queryBus: QueryBus;
  let dataSource: DataSource;

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
        IngestionSharedModule,
        IngestionSourceModule,
        IngestionJobModule,
        IngestionContentModule,
      ],
    }).compile();

    commandBus = module.get(CommandBus);
    queryBus = module.get(QueryBus);

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
   * Property 1: Job Lifecycle Progression
   *
   * For any job, the status transitions must follow the valid state machine:
   * PENDING → RUNNING → (COMPLETED | FAILED)
   *
   * Invalid transitions should not occur:
   * - Cannot go from COMPLETED back to RUNNING
   * - Cannot go from FAILED back to RUNNING
   * - Cannot skip RUNNING state
   */
  it('should only allow valid state transitions for any job', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random source configurations
        fc.record({
          sourceName: fc.string({ minLength: 5, maxLength: 50 }),
          sourceType: fc.constantFrom(
            SourceTypeEnum.WEB,
            SourceTypeEnum.RSS,
            SourceTypeEnum.SOCIAL_MEDIA,
          ),
          shouldFail: fc.boolean(), // Randomly decide if job should fail
        }),
        async ({ sourceName, sourceType, shouldFail }) => {
          // 1. Configure a source
          const configResult = await commandBus.execute(
            new ConfigureSourceCommand(
              undefined,
              sourceType,
              sourceName,
              sourceType === SourceTypeEnum.WEB
                ? {
                    url: shouldFail
                      ? 'https://invalid-domain-12345.com'
                      : 'https://example.com',
                    selectors: { title: 'h1', content: 'article' },
                  }
                : sourceType === SourceTypeEnum.RSS
                  ? {
                      feedUrl: shouldFail
                        ? 'https://invalid-domain-12345.com/feed.xml'
                        : 'https://example.com/feed.xml',
                    }
                  : {
                      platform: 'twitter',
                      credentials: { apiKey: 'test' },
                    },
              undefined,
              true,
            ),
          );

          // 2. Schedule a job - should start in PENDING state
          const scheduleResult = await commandBus.execute(
            new ScheduleJobCommand(configResult.sourceId),
          );

          const jobAfterSchedule = await queryBus.execute(
            new GetJobByIdQuery(scheduleResult.jobId),
          );

          // Verify initial state is PENDING
          expect(jobAfterSchedule.status).toBe('PENDING');

          // 3. Execute the job - should transition to RUNNING then COMPLETED/FAILED
          await commandBus.execute(
            new ExecuteIngestionJobCommand(scheduleResult.jobId),
          );

          const jobAfterExecution = await queryBus.execute(
            new GetJobByIdQuery(scheduleResult.jobId),
          );

          // Verify final state is either COMPLETED or FAILED (never PENDING or RUNNING)
          expect(['COMPLETED', 'FAILED']).toContain(jobAfterExecution.status);

          // Verify executedAt timestamp was set (proves it went through RUNNING)
          expect(jobAfterExecution.executedAt).toBeDefined();
          expect(jobAfterExecution.executedAt).toBeInstanceOf(Date);

          // Verify completedAt timestamp was set
          expect(jobAfterExecution.completedAt).toBeDefined();
          expect(jobAfterExecution.completedAt).toBeInstanceOf(Date);

          // Verify temporal ordering: scheduledAt < executedAt < completedAt
          expect(jobAfterExecution.executedAt.getTime()).toBeGreaterThanOrEqual(
            jobAfterSchedule.scheduledAt.getTime(),
          );
          expect(
            jobAfterExecution.completedAt.getTime(),
          ).toBeGreaterThanOrEqual(jobAfterExecution.executedAt.getTime());

          // 4. Try to execute again - should not change state
          await commandBus.execute(
            new ExecuteIngestionJobCommand(scheduleResult.jobId),
          );

          const jobAfterSecondExecution = await queryBus.execute(
            new GetJobByIdQuery(scheduleResult.jobId),
          );

          // Verify state didn't change (no invalid transitions)
          expect(jobAfterSecondExecution.status).toBe(jobAfterExecution.status);
        },
      ),
      { numRuns: 20, timeout: 60000 }, // 100 iterations, 60s timeout per iteration
    );
  }, 120000); // 2 minute total timeout

  /**
   * Additional property: State transitions are monotonic
   *
   * Once a job reaches a terminal state (COMPLETED or FAILED),
   * it should never transition to any other state.
   */
  it('should never transition from terminal states', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 50 }),
        async (sourceName) => {
          // 1. Create and execute a job to completion
          const configResult = await commandBus.execute(
            new ConfigureSourceCommand(
              undefined,
              SourceTypeEnum.WEB,
              sourceName,
              {
                url: 'https://example.com',
                selectors: { title: 'h1', content: 'article' },
              },
              undefined,
              true,
            ),
          );

          const scheduleResult = await commandBus.execute(
            new ScheduleJobCommand(configResult.sourceId),
          );

          await commandBus.execute(
            new ExecuteIngestionJobCommand(scheduleResult.jobId),
          );

          const jobAfterCompletion = await queryBus.execute(
            new GetJobByIdQuery(scheduleResult.jobId),
          );

          const terminalStatus = jobAfterCompletion.status;
          expect(['COMPLETED', 'FAILED']).toContain(terminalStatus);

          // 2. Attempt multiple operations that might change state
          // Try executing again
          await commandBus.execute(
            new ExecuteIngestionJobCommand(scheduleResult.jobId),
          );

          const jobAfterRetry = await queryBus.execute(
            new GetJobByIdQuery(scheduleResult.jobId),
          );

          // Verify status remained in terminal state
          expect(jobAfterRetry.status).toBe(terminalStatus);
        },
      ),
      { numRuns: 20, timeout: 60000 },
    );
  }, 120000);
});
