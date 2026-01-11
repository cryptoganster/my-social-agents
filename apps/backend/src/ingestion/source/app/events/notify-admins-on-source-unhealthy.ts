import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { SourceUnhealthyEvent } from '@/ingestion/source/domain/events';

/**
 * NotifyAdminsOnSourceUnhealthy
 *
 * Event handler that sends alerts to administrators when a source becomes unhealthy.
 * Placeholder for future alerting implementation (email, Slack, PagerDuty, etc.).
 *
 * Single Responsibility: Notify administrators about unhealthy sources.
 *
 * Requirements: 4.7
 *
 * TODO: Implement actual alerting mechanism:
 * - Email notifications
 * - Slack integration
 * - PagerDuty alerts
 * - Include source details, failure metrics, and recommended actions
 */
@Injectable()
@EventsHandler(SourceUnhealthyEvent)
export class NotifyAdminsOnSourceUnhealthy implements IEventHandler<SourceUnhealthyEvent> {
  private readonly logger = new Logger(NotifyAdminsOnSourceUnhealthy.name);

  handle(event: SourceUnhealthyEvent): void {
    try {
      // TODO: Implement actual alerting mechanism
      // For now, just log that an alert would be sent
      this.logger.warn(
        `[ALERT PLACEHOLDER] Source ${event.sourceId} requires attention: ` +
          `${event.failureRate.toFixed(2)}% failure rate, ` +
          `${event.consecutiveFailures} consecutive failures`,
      );

      // Future implementation:
      // await this.alertService.sendAlert({
      //   type: 'SOURCE_UNHEALTHY',
      //   severity: 'HIGH',
      //   sourceId: event.sourceId,
      //   metrics: {
      //     failureRate: event.failureRate,
      //     consecutiveFailures: event.consecutiveFailures,
      //   },
      //   detectedAt: event.detectedAt,
      // });
    } catch (error) {
      // Error isolation: log but don't rethrow
      // Allows other event handlers to continue
      this.logger.error(
        `Error notifying admins for source ${event.sourceId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
