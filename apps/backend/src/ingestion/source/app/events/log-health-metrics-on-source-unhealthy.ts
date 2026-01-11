import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { SourceUnhealthyEvent } from '@/ingestion/source/domain/events';

/**
 * LogHealthMetricsOnSourceUnhealthy
 *
 * Event handler that logs structured health metrics when a source becomes unhealthy.
 * Provides observability for monitoring and alerting systems.
 *
 * Single Responsibility: Log health metrics for monitoring.
 *
 * Requirements: 4.7
 */
@Injectable()
@EventsHandler(SourceUnhealthyEvent)
export class LogHealthMetricsOnSourceUnhealthy implements IEventHandler<SourceUnhealthyEvent> {
  private readonly logger = new Logger(LogHealthMetricsOnSourceUnhealthy.name);

  handle(event: SourceUnhealthyEvent): void {
    // Structured logging for monitoring systems
    this.logger.error(
      `Source unhealthy: ${event.sourceId} - ` +
        `failureRate=${event.failureRate.toFixed(2)}%, ` +
        `consecutiveFailures=${event.consecutiveFailures}, ` +
        `detectedAt=${event.detectedAt.toISOString()}`,
    );
  }
}
