import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@/shared/infra/scheduling';
import { IngestionModule } from './ingestion/ingestion.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

/**
 * AppModule
 *
 * Root application module that imports all bounded contexts and shared infrastructure.
 *
 * Architecture:
 * - Clean Architecture with strict layer separation
 * - DDD bounded contexts (Content Ingestion, Document Processing, etc.)
 * - CQRS for command/query separation
 * - Event-driven communication between contexts
 *
 * Module Organization:
 * 1. ConfigModule - Environment configuration (global)
 * 2. TypeOrmModule - Database connection (PostgreSQL)
 * 3. ScheduleModule - Shared scheduling infrastructure
 * 4. IngestionModule - Content Ingestion bounded context (encapsulates all ingestion sub-modules)
 *
 * Future Bounded Contexts:
 * - ProcessingModule - Document Processing
 * - EmbeddingModule - Embedding & Indexing
 * - RetrievalModule - Retrieval & Re-Ranking
 * - QueryModule - Knowledge Query/Chat
 * - SignalsModule - Signals & Analytics
 * - IdentityModule - Identity & Configuration
 */
@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_DATABASE', 'crypto_knowledge'),
        entities: [__dirname + '/**/infra/persistence/entities/*.{ts,js}'],
        migrations: [__dirname + '/ingestion/migrations/*.{ts,js}'],
        synchronize: false, // Never use synchronize in production
        logging:
          configService.get<string>('NODE_ENV') === 'development' &&
          configService.get<string>('DB_LOGGING') !== 'false',
        autoLoadEntities: true,
      }),
    }),

    // Shared infrastructure
    ScheduleModule,

    // Bounded Contexts
    IngestionModule, // Content Ingestion bounded context
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
