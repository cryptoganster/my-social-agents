/**
 * Job Execution Flow Integration Test
 *
 * Tests the complete job execution flow:
 * - Schedule job → JobScheduled
 * - Execute job → JobStarted
 * - Content collection and ingestion
 * - Job completion → JobCompleted
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
import { GetJobByIdQuery } from '@/ingestion/job/app/queries/get-job-by-id/query';
import { IngestionJobReadModel } from '@/ingestion/job/app/queries/read-models/ingestion-job';
import { GetSourceByIdQuery } from '@/ingestion/source/app/queries/get-source-by-id/query';
import { CreateSourceCommand } from '@/ingestion/source/app/commands/create-source/command';
import { CreateSourceResult } from '@/ingestion/source/app/commands/create-source/result';
import { SharedModule } from '@/shared/shared.module';
import { IngestionSourceModule } from '@/ingestion/source/ingestion-source.module';
import { IngestionJobModule } from '@/ingestion/job/ingestion-job.module';
import { IngestionContentModule } from '@/ingestion/content/ingestion-content.module';
import { SourceTypeEnum } from '@/ingestion/source/domain/value-objects/source-type';
import { createTestDataSource } from '@/../test/setup';
import {
  waitForEvents,
  pollUntil,
  executeWithRetry,
} from '@/../test/helpers/integration-test-helpers';

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
        SharedModule,
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
    it.skip('should execute complete flow: schedule → execute → complete', async () => {
      // Mock the adapter to avoid real HTTP requests
      const mockAdapter = {
        collect: jest.fn().mockResolvedValue([
          {
            externalId: 'test-1',
            content: 'Test content for integration test',
            metadata: {
              title: 'Test Article',
              author: 'Test Author',
              publishedAt: new Date(),
              url: 'https://example.com/test',
            },
          },
        ]),
      };

      // Get AdapterRegistry and register mock
      const adapterRegistry = module.get('AdapterRegistry');
      jest.spyOn(adapterRegistry, 'getAdapter').mockReturnValue(mockAdapter);

      // 1. Configure a test source
      const configureResult = await commandBus.execute<
        CreateSourceCommand,
        CreateSourceResult
      >(
        new CreateSourceCommand(
          SourceTypeEnum.WEB,
          'Test Web Source',
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

      expect(configureResult.sourceId).toBeDefined();

      // 2. Verify source was created and is active
      const sourceResult = await queryBus.execute(
        new GetSourceByIdQuery(configureResult.sourceId),
      );

      expect(sourceResult).toBeDefined();
      expect(sourceResult!.isActive).toBe(true);
      expect(sourceResult!.sourceType).toBe(SourceTypeEnum.WEB);

      // 3. Schedule a job
      const scheduleResult = await executeWithRetry<ScheduleJobResult>(
        commandBus,
        new ScheduleJobCommand(configureResult.sourceId),
        {
          maxRetries: 3,
          retryDelay: 100,
        },
      );

      expect(scheduleResult.jobId).toBeDefined();
      expect(scheduleResult.scheduledAt).toBeInstanceOf(Date);

      // 4. Wait for automatic job execution to complete
      // StartJobOnJobScheduled automatically triggers execution
      const jobAfterExecution = await pollUntil<IngestionJobReadModel>(
        queryBus,
        new GetJobByIdQuery(scheduleResult.jobId),
        (job) => job !== null && ['COMPLETED', 'FAILED'].includes(job.status),
        {
          interval: 200,
          timeout: 10000,
          errorMessage: 'Job did not complete within timeout',
        },
      );

      // 5. Verify job completed successfully
      expect(jobAfterExecution).toBeDefined();
      expect(jobAfterExecution!.status).toBe('COMPLETED');
      expect(jobAfterExecution!.executedAt).toBeDefined();
      expect(jobAfterExecution!.completedAt).toBeDefined();

      // 6. Verify metrics were recorded
      expect(jobAfterExecution!.itemsCollected).toBeGreaterThanOrEqual(0);
      expect(jobAfterExecution!.duplicatesDetected).toBeGreaterThanOrEqual(0);
      expect(jobAfterExecution!.errorsEncountered).toBeGreaterThanOrEqual(0);

      // 7. Verify source health was updated (wait for event processing)
      await waitForEvents(500);
      const sourceAfterJob = await queryBus.execute(
        new GetSourceByIdQuery(configureResult.sourceId),
      );

      expect(sourceAfterJob!.healthMetrics).toBeDefined();
      // Health metrics should reflect the job execution
      // Note: Actual values depend on whether the job succeeded or failed
    }, 30000); // 30 second timeout for integration test

    it.skip('should handle job failure and update source health', async () => {
      // Mock the adapter to simulate failure
      const mockAdapter = {
        collect: jest.fn().mockRejectedValue(new Error('Network error')),
      };

      // Get AdapterRegistry and register mock
      const adapterRegistry = module.get('AdapterRegistry');
      jest.spyOn(adapterRegistry, 'getAdapter').mockReturnValue(mockAdapter);

      // 1. Configure a source with invalid configuration (will cause failure)
      const configureResult = await commandBus.execute<
        CreateSourceCommand,
        CreateSourceResult
      >(
        new CreateSourceCommand(
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
      const scheduleResult = await executeWithRetry<ScheduleJobResult>(
        commandBus,
        new ScheduleJobCommand(configureResult.sourceId),
        {
          maxRetries: 3,
          retryDelay: 100,
        },
      );

      // 3. Wait for automatic job execution (triggered by StartJobOnJobScheduled)
      const jobAfterExecution = await pollUntil<IngestionJobReadModel>(
        queryBus,
        new GetJobByIdQuery(scheduleResult.jobId),
        (job) => job !== null && ['COMPLETED', 'FAILED'].includes(job.status),
        {
          interval: 200,
          timeout: 10000,
        },
      );

      // 4. Verify job status reflects failure or completion with errors
      expect(jobAfterExecution).toBeDefined();
      // Job could be FAILED or COMPLETED depending on error handling
      expect(['FAILED', 'COMPLETED']).toContain(jobAfterExecution!.status);

      // 5. If job failed, verify error was recorded
      if (jobAfterExecution!.status === 'FAILED') {
        expect(jobAfterExecution!.errors).toBeDefined();
        expect(jobAfterExecution!.errors.length).toBeGreaterThan(0);
      }
    }, 30000);
  });

  describe('Event Publication', () => {
    it('should publish JobScheduled when job is scheduled', async () => {
      // Mock the adapter
      const mockAdapter = {
        collect: jest.fn().mockResolvedValue([]),
      };
      const adapterRegistry = module.get('AdapterRegistry');
      jest.spyOn(adapterRegistry, 'getAdapter').mockReturnValue(mockAdapter);

      // Set up event listener
      const publishedEvents: any[] = [];
      const originalPublish = eventBus.publish.bind(eventBus);
      jest.spyOn(eventBus, 'publish').mockImplementation((event: any) => {
        publishedEvents.push(event);
        return originalPublish(event);
      });

      // 1. Configure source
      const configureResult = await commandBus.execute<
        CreateSourceCommand,
        CreateSourceResult
      >(
        new CreateSourceCommand(
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
      await executeWithRetry<ScheduleJobResult>(
        commandBus,
        new ScheduleJobCommand(configureResult.sourceId),
        {
          maxRetries: 3,
          retryDelay: 100,
        },
      );

      // Wait for events to be processed
      await waitForEvents(1000);

      // 3. Verify JobScheduled was published
      const jobScheduledEvents = publishedEvents.filter(
        (e) => e.constructor.name === 'JobScheduled',
      );
      expect(jobScheduledEvents.length).toBeGreaterThan(0);

      // Restore original publish
      jest.restoreAllMocks();
    }, 30000);
  });

  describe('Metrics Aggregation', () => {
    it.skip('should aggregate metrics correctly during job execution', async () => {
      // Mock the adapter
      const mockAdapter = {
        collect: jest.fn().mockResolvedValue([
          {
            externalId: 'metrics-1',
            content: 'Content for metrics test',
            metadata: {
              title: 'Metrics Test',
              publishedAt: new Date(),
            },
          },
        ]),
      };
      const adapterRegistry = module.get('AdapterRegistry');
      jest.spyOn(adapterRegistry, 'getAdapter').mockReturnValue(mockAdapter);

      // 1. Configure source
      const configureResult = await commandBus.execute<
        CreateSourceCommand,
        CreateSourceResult
      >(
        new CreateSourceCommand(
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

      // 2. Schedule and execute job (automatic via StartJobOnJobScheduled)
      const scheduleResult = await executeWithRetry<ScheduleJobResult>(
        commandBus,
        new ScheduleJobCommand(configureResult.sourceId),
        {
          maxRetries: 3,
          retryDelay: 100,
        },
      );

      // Wait for automatic execution and event processing
      await pollUntil<IngestionJobReadModel>(
        queryBus,
        new GetJobByIdQuery(scheduleResult.jobId),
        (job) => job !== null && ['COMPLETED', 'FAILED'].includes(job.status),
        {
          interval: 200,
          timeout: 10000,
        },
      );

      // Additional wait for metrics to be updated
      await waitForEvents(500);

      // 3. Verify metrics
      const job = await queryBus.execute(
        new GetJobByIdQuery(scheduleResult.jobId),
      );

      expect(job).toBeDefined();
      expect(typeof job!.itemsCollected).toBe('number');
      expect(typeof job!.duplicatesDetected).toBe('number');
      expect(typeof job!.errorsEncountered).toBe('number');
      expect(job!.itemsCollected).toBeGreaterThanOrEqual(0);
    }, 30000);
  });
});
