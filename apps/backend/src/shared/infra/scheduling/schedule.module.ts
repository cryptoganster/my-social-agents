import { Module } from '@nestjs/common';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { JobSchedulerService } from './job-scheduler';

/**
 * ScheduleModule
 *
 * Shared NestJS module that provides scheduling infrastructure for all bounded contexts.
 * This module wraps the official @nestjs/schedule package and provides the JobSchedulerService
 * implementation of IJobScheduler.
 *
 * Features:
 * - Configures NestJS ScheduleModule with forRoot()
 * - Provides JobSchedulerService as an injectable service
 * - Exports JobSchedulerService for use in other modules
 * - Encapsulates scheduling infrastructure setup
 *
 * Usage:
 * Import this module in any bounded context that needs scheduling capabilities.
 * The module will automatically configure the NestJS scheduler and make
 * JobSchedulerService available for dependency injection.
 *
 * @example
 * ```typescript
 * // In ingestion module
 * import { ScheduleModule } from '@/shared/infra/scheduling';
 *
 * @Module({
 *   imports: [ScheduleModule],
 *   // ...
 * })
 * export class IngestionModule {}
 * ```
 *
 * @example
 * ```typescript
 * // In a use case
 * import { IJobScheduler } from '@/shared/kernel';
 *
 * @Injectable()
 * class MyUseCase {
 *   constructor(private readonly scheduler: IJobScheduler) {}
 *
 *   async execute(): Promise<void> {
 *     this.scheduler.scheduleOnce(
 *       'my-job',
 *       async () => { /* job logic *\/ },
 *       new Date(Date.now() + 5000)
 *     );
 *   }
 * }
 * ```
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
@Module({
  imports: [
    // Import and configure NestJS ScheduleModule
    NestScheduleModule.forRoot(),
  ],
  providers: [
    // Provide JobSchedulerService implementation with interface token
    {
      provide: 'IJobScheduler',
      useClass: JobSchedulerService,
    },
  ],
  exports: [
    // Export IJobScheduler token for use in other modules
    'IJobScheduler',
  ],
})
export class ScheduleModule {}
