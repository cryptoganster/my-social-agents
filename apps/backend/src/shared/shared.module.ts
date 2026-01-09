import { Module } from '@nestjs/common';
import { ResilienceModule } from './infra/resilience/resilience.module';
import { ScheduleModule } from './infra/scheduling/schedule.module';
import { SharedExternalModule } from './infra/external/shared-external.module';

/**
 * SharedModule
 *
 * Centralized module that provides all shared infrastructure services
 * across all bounded contexts.
 *
 * Includes:
 * - ResilienceModule: Retry and Circuit Breaker services
 * - ScheduleModule: Job scheduling infrastructure
 * - SharedExternalModule: Cryptographic hashing and external services
 *
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [SharedModule],
 *   providers: [MyService],
 * })
 * export class MyModule {}
 * ```
 *
 * This module exports all shared services for easy consumption
 * by bounded contexts without needing to import individual modules.
 */
@Module({
  imports: [ResilienceModule, ScheduleModule, SharedExternalModule],
  exports: [ResilienceModule, ScheduleModule, SharedExternalModule],
})
export class SharedModule {}
