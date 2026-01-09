import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@/shared/infra/scheduling';
import { IngestionSharedModule } from '@/ingestion/shared/ingestion-shared.module';
import { IngestionSourceModule } from '@/ingestion/source/ingestion-source.module';
import { ScheduleJobCommandHandler } from './app/commands/schedule-job/handler';
import { ExecuteIngestionJobCommandHandler } from './app/commands/execute-job/handler';
import { UpdateJobMetricsCommandHandler } from './app/commands/update-job-metrics/handler';
import { GetJobByIdQueryHandler } from './app/queries/get-job-by-id/handler';
import { GetJobsByStatusQueryHandler } from './app/queries/get-jobs-by-status/handler';
import { GetJobHistoryQueryHandler } from './app/queries/get-job-history/handler';
import { JobScheduledEventHandler } from './app/events/job-scheduled/handler';
import { JobCompletedEventHandler } from './app/events/job-completed/handler';
import { JobFailedEventHandler } from './app/events/job-failed/handler';
import { JobMetricsCalculator } from './domain/services/job-metrics-calculator';
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
 * Responsibilities:
 * - Job scheduling (ScheduleIngestionJobCommand)
 * - Job execution (ExecuteIngestionJobCommand)
 * - Job persistence (write repository)
 * - Job queries (read repository)
 * - Job reconstitution (factory)
 *
 * Dependencies (to be provided by parent module):
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
    ScheduleModule, // Provides IJobScheduler
    IngestionSharedModule,
    IngestionSourceModule,
    TypeOrmModule.forFeature([IngestionJobEntity]),
  ],
  providers: [
    // Command Handlers
    ScheduleJobCommandHandler,
    ExecuteIngestionJobCommandHandler,
    UpdateJobMetricsCommandHandler,

    // Query Handlers
    GetJobByIdQueryHandler,
    GetJobsByStatusQueryHandler,
    GetJobHistoryQueryHandler,

    // Event Handlers
    JobScheduledEventHandler,
    JobCompletedEventHandler,
    JobFailedEventHandler,

    // Domain Services
    JobMetricsCalculator,

    // Write Repository with Interface Token
    {
      provide: 'IIngestionJobWriteRepository',
      useClass: TypeOrmIngestionJobWriteRepository,
    },

    // Factory with Interface Token
    {
      provide: 'IIngestionJobFactory',
      useClass: TypeOrmIngestionJobFactory,
    },

    // Read Repository - Register both class and interface token
    TypeOrmIngestionJobReadRepository,
    {
      provide: 'IIngestionJobReadRepository',
      useExisting: TypeOrmIngestionJobReadRepository,
    },
  ],
  exports: [
    // Export command handlers for use in other modules
    ScheduleJobCommandHandler,
    ExecuteIngestionJobCommandHandler,

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
