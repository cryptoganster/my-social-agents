import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { SourceUnhealthyEvent } from '@/ingestion/source/domain/events';
import { DisableSourceCommand } from '@/ingestion/source/app/commands/disable-source/command';

/**
 * DisableSourceOnSourceUnhealthy
 *
 * Event handler that automatically disables a source when it becomes unhealthy.
 * Delegates the actual disable logic to DisableSourceCommand.
 *
 * Single Responsibility: Trigger source disabling when unhealthy event occurs.
 *
 * Requirements: 4.5, 4.6
 */
@Injectable()
@EventsHandler(SourceUnhealthyEvent)
export class DisableSourceOnSourceUnhealthy implements IEventHandler<SourceUnhealthyEvent> {
  private readonly logger = new Logger(DisableSourceOnSourceUnhealthy.name);

  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: SourceUnhealthyEvent): Promise<void> {
    try {
      const reason = `Automatic disable: ${event.failureRate.toFixed(2)}% failure rate, ${event.consecutiveFailures} consecutive failures`;

      await this.commandBus.execute(
        new DisableSourceCommand(event.sourceId, reason),
      );
    } catch (error) {
      // Error isolation: log but don't rethrow
      this.logger.error(
        `Error disabling source ${event.sourceId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
