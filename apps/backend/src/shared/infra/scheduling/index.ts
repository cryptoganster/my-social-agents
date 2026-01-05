/**
 * Shared Scheduling Infrastructure
 *
 * This module provides shared scheduling infrastructure that can be used
 * across all bounded contexts. It includes:
 * - JobSchedulerService: Implementation of IJobScheduler using NestJS SchedulerRegistry
 * - ScheduleModule: NestJS module wrapper for easy import
 *
 * @example
 * ```typescript
 * // In any bounded context module
 * import { ScheduleModule } from '@/shared/infra/scheduling';
 *
 * @Module({
 *   imports: [ScheduleModule],
 *   // ...
 * })
 * export class MyBoundedContextModule {}
 * ```
 */

export * from './job-scheduler';
export * from './schedule.module';
