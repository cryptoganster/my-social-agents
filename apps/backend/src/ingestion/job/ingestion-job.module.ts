import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleIngestionJobCommandHandler } from './app/commands/schedule-job/handler';
import { ExecuteIngestionJobCommandHandler } from './app/commands/execute-job/handler';
import { TypeOrmIngestionJobWriteRepository } from './infra/persistence/repositories/ingestion-job-write';
import { TypeOrmIngestionJobFactory } from './infra/persistence/factories/ingestion-job-factory';
import { TypeOrmIngestionJobReadRepository } from './infra/persistence/repositories/ingestion-job-read';

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
 * - IJobScheduler (from shared kernel)
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */
@Module({
  imports: [CqrsModule],
  providers: [
    // Command Handlers
    ScheduleIngestionJobCommandHandler,
    ExecuteIngestionJobCommandHandler,

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

    // Read Repository with Interface Token
    {
      provide: 'IIngestionJobReadRepository',
      useClass: TypeOrmIngestionJobReadRepository,
    },
  ],
  exports: [
    // Export command handlers for use in other modules
    ScheduleIngestionJobCommandHandler,
    ExecuteIngestionJobCommandHandler,

    // Export repository tokens for use in other modules
    'IIngestionJobWriteRepository',
    'IIngestionJobFactory',
    'IIngestionJobReadRepository',
  ],
})
export class IngestionJobModule {}
