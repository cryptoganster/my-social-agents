import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from '@/shared/shared.module';
import { IngestionSourceModule } from '@/ingestion/source/ingestion-source.module';

// Command Handlers
import { ScheduleJobCommandHandler } from './app/commands/schedule-job/handler';
import { StartJobCommandHandler } from './app/commands/start-job/handler';
import { CompleteJobCommandHandler } from './app/commands/complete-job/handler';
import { FailJobCommandHandler } from './app/commands/fail-job/handler';
import { UpdateJobMetricsCommandHandler } from './app/commands/update-job-metrics/handler';

// Query Handlers
import { GetJobByIdQueryHandler } from './app/queries/get-job-by-id/handler';
import { GetJobsByStatusQueryHandler } from './app/queries/get-jobs-by-status/handler';
import { GetJobHistoryQueryHandler } from './app/queries/get-job-history/handler';

// Event Handlers
import { StartJobOnJobScheduled } from './app/events/start-job-on-job-scheduled';
import { IngestContentOnJobStarted } from './app/events/ingest-content-on-job-started';
import { UpdateSourceHealthOnJobCompleted } from './app/events/update-source-health-on-job-completed';
import { UpdateSourceHealthOnJobFailed } from './app/events/update-source-health-on-job-failed';

// Domain Services
import { JobMetricsCalculator } from './domain/services/job-metrics-calculator';

// Infrastructure
import { TypeOrmIngestionJobWriteRepository } from './infra/persistence/repositories/ingestion-job-write';
import { TypeOrmIngestionJobFactory } from './infra/persistence/factories/ingestion-job-factory';
import { TypeOrmIngestionJobReadRepository } from './infra/persistence/repositories/ingestion-job-read';
import { IngestionJobEntity } from './infra/persistence/entities/ingestion-job';

/**
 * IngestionJobModule
 *
 * NestJS module for the Job sub-context within Content Ingestion.
 * Handles ingestion job scheduling, execution, and lifecycle management.
 *
 * Job Execution Pipeline (Event-Driven):
 * 1. ScheduleJobCommand → JobScheduled
 * 2. StartJobOnJobScheduled → StartJobCommand → JobStarted
 * 3. IngestContentOnJobStarted → IngestContentCommand
 * 4. Content pipeline processes items, updates metrics via UpdateJobMetricsCommand
 * 5. CompleteJobCommand or FailJobCommand finalizes job
 *
 * Dependencies (provided by parent module or imports):
 * - ISourceConfigurationFactory (from source sub-context)
 * - IRetryService (from shared sub-context)
 * - ICircuitBreaker (from shared sub-context)
 * - IJobScheduler (from shared kernel - ScheduleModule)
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */
@Module({
  imports: [
    CqrsModule,
    SharedModule,
    IngestionSourceModule,
    TypeOrmModule.forFeature([IngestionJobEntity]),
  ],
  providers: [
    // ===== Command Handlers =====
    ScheduleJobCommandHandler,
    StartJobCommandHandler,
    CompleteJobCommandHandler,
    FailJobCommandHandler,
    UpdateJobMetricsCommandHandler,

    // ===== Query Handlers =====
    GetJobByIdQueryHandler,
    GetJobsByStatusQueryHandler,
    GetJobHistoryQueryHandler,

    // ===== Event Handlers =====
    StartJobOnJobScheduled,
    IngestContentOnJobStarted,
    UpdateSourceHealthOnJobCompleted,
    UpdateSourceHealthOnJobFailed,

    // ===== Domain Services =====
    JobMetricsCalculator,

    // ===== Write Repository =====
    {
      provide: 'IIngestionJobWriteRepository',
      useClass: TypeOrmIngestionJobWriteRepository,
    },

    // ===== Factory =====
    {
      provide: 'IIngestionJobFactory',
      useClass: TypeOrmIngestionJobFactory,
    },

    // ===== Read Repository =====
    TypeOrmIngestionJobReadRepository,
    {
      provide: 'IIngestionJobReadRepository',
      useExisting: TypeOrmIngestionJobReadRepository,
    },
  ],
  exports: [
    // Export command handlers for use in other modules
    ScheduleJobCommandHandler,
    StartJobCommandHandler,
    CompleteJobCommandHandler,
    FailJobCommandHandler,

    // Export query handlers for use in other modules
    GetJobByIdQueryHandler,
    GetJobsByStatusQueryHandler,
    GetJobHistoryQueryHandler,

    // Export repository tokens for use in other modules
    'IIngestionJobWriteRepository',
    'IIngestionJobFactory',
    'IIngestionJobReadRepository',
  ],
})
export class IngestionJobModule {}
