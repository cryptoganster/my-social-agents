import { Module } from '@nestjs/common';
import { ScheduleModule } from '@/shared/infra/scheduling';
import { IngestionSharedModule } from './ingestion/shared/ingestion-shared.module';
import { IngestionSourceModule } from './ingestion/source/ingestion-source.module';
import { IngestionJobModule } from './ingestion/job/ingestion-job.module';
import { IngestionContentModule } from './ingestion/content/ingestion-content.module';
import { IngestionApiModule } from './ingestion/api/ingestion-api.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

/**
 * AppModule
 *
 * Root application module that imports all bounded contexts and shared infrastructure.
 *
 * Module Dependency Order (important for proper dependency injection):
 * 1. ScheduleModule - Shared scheduling infrastructure
 * 2. IngestionSharedModule - Shared ingestion infrastructure (retry, circuit breaker, encryption, hashing, events)
 * 3. IngestionSourceModule - Source configuration and adapters
 * 4. IngestionJobModule - Job scheduling and execution
 * 5. IngestionContentModule - Content ingestion and normalization
 * 6. IngestionApiModule - API layer (HTTP controllers and CLI)
 *
 * This order ensures that:
 * - Shared services are available before sub-contexts that depend on them
 * - Source module is available before Job and Content modules (they depend on source configuration)
 * - Job module is available before Content module (content ingestion is triggered by jobs)
 * - API module is last (depends on all command handlers)
 */
@Module({
  imports: [
    // Shared infrastructure
    ScheduleModule,

    // Ingestion bounded context (in dependency order)
    IngestionSharedModule, // Shared → Source → Job → Content → API
    IngestionSourceModule,
    IngestionJobModule,
    IngestionContentModule,
    IngestionApiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
