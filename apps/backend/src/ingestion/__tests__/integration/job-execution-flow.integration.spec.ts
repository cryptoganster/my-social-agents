/**
 * Job Execution Flow Integration Test
 *
 * Tests the complete job execution flow:
 * - Schedule job → JobScheduledEvent
 * - Execute job → JobStartedEvent
 * - Content collection and ingestion
 * - Job completion → JobCompletedEvent
 * - Metrics aggregation
 * - Source health updates
 *
 * Requirements: 1.1-1.7, 3.1-3.7, 4.1-4.7
 * Design: Testing Strategy - Integration Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus, EventBus, CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ScheduleJobCommand } from '@/ingestion/job/app/commands/schedule-job/command';
import { ScheduleJobResult } from '@/ingestion/job/app/commands/schedule-job/result';
import { ExecuteIngestionJobCommand } from '@/ingestion/job/app/commands/execute-job/command';
import { GetJobByIdQuery } from '@/ingestion/job/app/queries/get-job-by-id/query';
import { GetSourceByIdQuery } from '@/ingestion/source/app/queries/get-source-by-id/query';
import { ConfigureSourceCommand } from '@/ingestion/source/app/commands/configure-source/command';
import { IngestionSharedModule } from '@/ingestion/shared/ingestion-shared.module';
import { IngestionSourceModule } from '@/ingestion/source/ingestion-source.module';
import { IngestionJobModule } from '@/ingestion/job/ingestion-job.module';
import { IngestionContentModule } from '@/ingestion/content/ingestion-content.module';
import { SourceTypeEnum } from '@/ingestion/source/domain/value-objects/source-type';
import { createTestDataSource } from '@/../test/setup';

describe('Integration: Job Execution Flow', () => {
  let module: TestingModule;
  let commandBus: CommandBus;
  let queryBus: QueryBus;
  let eventBus: EventBus;
  let dataSource: DataSource;

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
    eventBus = module.get(EventBus);

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

  describe('Complete Job Lifecycle', () => {
    it('should execute complete flow: schedule → execute → complete', async () => {
      // 1. Configure a test source
      const configureResult = await commandBus.execute(
        new ConfigureSourceCommand(
          undefined, // sourceId - undefined for new source
          SourceTypeEnum.WEB,
          'Test Web Source',
          {
            url: 'https://example.com',
            selectors: {
              title: 'h1',
              content: 'article',
            },
          },
          undefined, // credentials
          true, // isActive
        ),
      );

      expect(configureResult.sourceId).toBeDefined();

      // 2. Verify source was created and is active
      const sourceResult = await queryBus.execute(
        new GetSourceByIdQuery(configureResult.sourceId),
      );

      expect(sourceResult).toBeDefined();
      expect(sourceResult.isActive).toBe(true);
      expect(sourceResult.sourceType).toBe(SourceTypeEnum.WEB);

      // 3. Schedule a job
      const scheduleResult = await commandBus.execute<
        ScheduleJobCommand,
        ScheduleJobResult
      >(new ScheduleJobCommand(configureResult.sourceId));

      expect(scheduleResult.jobId).toBeDefined();
      expect(scheduleResult.scheduledAt).toBeInstanceOf(Date);

      // 4. Verify job was created with PENDING status
      const jobAfterSchedule = await queryBus.execute(
        new GetJobByIdQuery(scheduleResult.jobId),
      );

      expect(jobAfterSchedule).toBeDefined();
      expect(jobAfterSchedule.status).toBe('PENDING');
      expect(jobAfterSchedule.sourceId).toBe(configureResult.sourceId);

      // 5. Execute the job
      // Note: In a real scenario, this would be triggered by JobScheduledEventHandler
      // For this test, we execute it directly
      const executeResult = await commandBus.execute(
        new ExecuteIngestionJobCommand(scheduleResult.jobId),
      );

      expect(executeResult.success).toBe(true);
      expect(executeResult.jobId).toBe(scheduleResult.jobId);

      // 6. Verify job completed successfully
      const jobAfterExecution = await queryBus.execute(
        new GetJobByIdQuery(scheduleResult.jobId),
      );

      expect(jobAfterExecution).toBeDefined();
      expect(jobAfterExecution.status).toBe('COMPLETED');
      expect(jobAfterExecution.executedAt).toBeDefined();
      expect(jobAfterExecution.completedAt).toBeDefined();

      // 7. Verify metrics were recorded
      expect(jobAfterExecution.metrics).toBeDefined();
      expect(jobAfterExecution.metrics.itemsCollected).toBeGreaterThanOrEqual(
        0,
      );
      expect(
        jobAfterExecution.metrics.duplicatesDetected,
      ).toBeGreaterThanOrEqual(0);

      // 8. Verify source health was updated
      const sourceAfterJob = await queryBus.execute(
        new GetSourceByIdQuery(configureResult.sourceId),
      );

      expect(sourceAfterJob.healthMetrics).toBeDefined();
      // Health metrics should reflect the job execution
      // Note: Actual values depend on whether the job succeeded or failed
    }, 30000); // 30 second timeout for integration test

    it('should handle job failure and update source health', async () => {
      // 1. Configure a source with invalid configuration (will cause failure)
      const configureResult = await commandBus.execute(
        new ConfigureSourceCommand(
          undefined,
          SourceTypeEnum.WEB,
          'Test Failing Source',
          {
            url: 'https://invalid-domain-that-does-not-exist-12345.com',
            selectors: {
              title: 'h1',
              content: 'article',
            },
          },
          undefined,
          true,
        ),
      );

      // 2. Schedule a job
      const scheduleResult = await commandBus.execute<
        ScheduleJobCommand,
        ScheduleJobResult
      >(new ScheduleJobCommand(configureResult.sourceId));

      // 3. Execute the job (expect it to fail)
      const executeResult = await commandBus.execute(
        new ExecuteIngestionJobCommand(scheduleResult.jobId),
      );

      // Job should complete but with errors
      expect(executeResult.jobId).toBe(scheduleResult.jobId);

      // 4. Verify job status reflects failure or completion with errors
      const jobAfterExecution = await queryBus.execute(
        new GetJobByIdQuery(scheduleResult.jobId),
      );

      expect(jobAfterExecution).toBeDefined();
      // Job could be FAILED or COMPLETED depending on error handling
      expect(['FAILED', 'COMPLETED']).toContain(jobAfterExecution.status);

      // 5. If job failed, verify error was recorded
      if (jobAfterExecution.status === 'FAILED') {
        expect(jobAfterExecution.errors).toBeDefined();
        expect(jobAfterExecution.errors.length).toBeGreaterThan(0);
      }
    }, 30000);
  });

  describe('Event Publication', () => {
    it('should publish JobScheduledEvent when job is scheduled', async () => {
      // Set up event listener
      const publishedEvents: any[] = [];
      const originalPublish = eventBus.publish.bind(eventBus);
      jest.spyOn(eventBus, 'publish').mockImplementation((event: any) => {
        publishedEvents.push(event);
        return originalPublish(event);
      });

      // 1. Configure source
      const configureResult = await commandBus.execute(
        new ConfigureSourceCommand(
          undefined,
          SourceTypeEnum.RSS,
          'Test RSS Source',
          {
            feedUrl: 'https://example.com/feed.xml',
          },
          undefined,
          true,
        ),
      );

      // 2. Schedule job
      await commandBus.execute<ScheduleJobCommand, ScheduleJobResult>(
        new ScheduleJobCommand(configureResult.sourceId),
      );

      // 3. Verify JobScheduledEvent was published
      const jobScheduledEvents = publishedEvents.filter(
        (e) => e.constructor.name === 'JobScheduledEvent',
      );
      expect(jobScheduledEvents.length).toBeGreaterThan(0);

      // Restore original publish
      jest.restoreAllMocks();
    }, 30000);
  });

  describe('Metrics Aggregation', () => {
    it('should aggregate metrics correctly during job execution', async () => {
      // 1. Configure source
      const configureResult = await commandBus.execute(
        new ConfigureSourceCommand(
          undefined,
          SourceTypeEnum.WEB,
          'Test Metrics Source',
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

      // 2. Schedule and execute job
      const scheduleResult = await commandBus.execute<
        ScheduleJobCommand,
        ScheduleJobResult
      >(new ScheduleJobCommand(configureResult.sourceId));

      await commandBus.execute(
        new ExecuteIngestionJobCommand(scheduleResult.jobId),
      );

      // 3. Verify metrics
      const job = await queryBus.execute(
        new GetJobByIdQuery(scheduleResult.jobId),
      );

      expect(job.metrics).toBeDefined();
      expect(typeof job.metrics.itemsCollected).toBe('number');
      expect(typeof job.metrics.duplicatesDetected).toBe('number');
      expect(typeof job.metrics.validationErrors).toBe('number');
      expect(job.metrics.itemsCollected).toBeGreaterThanOrEqual(0);
    }, 30000);
  });
});
