import { Module } from '@nestjs/common';
import { ScheduleModule } from '@/shared/infra/scheduling';
import { IngestionContentModule } from './ingestion/content/ingestion-content.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [ScheduleModule, IngestionContentModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
