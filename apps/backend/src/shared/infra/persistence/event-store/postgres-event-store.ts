import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  IEventStore,
  StoredEvent,
  AppendOptions,
  StreamQuery,
  GlobalQuery,
  Subscription,
  DomainEvent,
  EventMetadata,
} from '@/shared/event-sourcing/event-store';
import { ConcurrencyException } from '@/shared/kernel/concurrency-exception';
import { DomainEventEntity } from './entities/domain-event.entity';

/**
 * PostgreSQL implementation of IEventStore
 *
 * Provides append-only event storage with:
 * - Optimistic concurrency control (expectedVersion check)
 * - Idempotency (via idempotencyKey)
 * - Global ordering (via global_sequence)
 * - Stream queries (per aggregate)
 * - Global queries (across aggregates)
 * - Live subscriptions (polling-based)
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */
@Injectable()
export class PostgresEventStore implements IEventStore {
  private readonly logger = new Logger(PostgresEventStore.name);
  private subscriptions = new Map<string, NodeJS.Timeout>();
  private subscriptionCounter = 0;

  constructor(
    @InjectRepository(DomainEventEntity)
    private readonly eventRepository: Repository<DomainEventEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Appends events to an aggregate's stream
   *
   * @throws ConcurrencyException if expectedVersion doesn't match current version
   * @throws Error if idempotencyKey already exists
   */
  async append(
    aggregateId: string,
    aggregateType: string,
    events: DomainEvent[],
    options: AppendOptions,
  ): Promise<StoredEvent[]> {
    if (events.length === 0) {
      return [];
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Check current version (optimistic concurrency)
      const currentVersion = await this.getCurrentVersion(
        aggregateId,
        queryRunner.manager.getRepository(DomainEventEntity),
      );

      if (currentVersion !== options.expectedVersion) {
        throw new ConcurrencyException(
          `Concurrency conflict for ${aggregateType} ${aggregateId}: ` +
            `expected version ${options.expectedVersion}, but current version is ${currentVersion}`,
        );
      }

      // 2. Insert events
      const storedEvents: StoredEvent[] = [];
      let version = options.expectedVersion;

      for (const event of events) {
        version++;

        const entity = new DomainEventEntity();
        entity.aggregateId = aggregateId;
        entity.aggregateType = aggregateType;
        entity.eventType = event.eventType;
        entity.eventData = this.serializeEventData(event);
        entity.metadata = this.extractMetadata(event) as unknown as Record<
          string,
          unknown
        >;
        entity.version = version;
        entity.schemaVersion = 1; // TODO: Get from event or registry
        entity.timestamp = event.occurredAt;
        entity.idempotencyKey = options.idempotencyKey;

        const saved = await queryRunner.manager.save(entity);

        storedEvents.push(this.toStoredEvent(saved));
      }

      await queryRunner.commitTransaction();

      this.logger.debug(
        `Appended ${events.length} events to ${aggregateType} ${aggregateId} (version ${version})`,
      );

      return storedEvents;
    } catch (error) {
      await queryRunner.rollbackTransaction();

      // Check for unique constraint violation on idempotency_key
      if (
        error instanceof Error &&
        error.message.includes('UQ_domain_events_idempotency_key')
      ) {
        this.logger.warn(
          `Duplicate idempotency key: ${options.idempotencyKey}`,
        );
        // Return empty array (idempotent behavior)
        return [];
      }

      // Check for unique constraint violation on aggregate_id + version
      if (
        error instanceof Error &&
        error.message.includes('UQ_domain_events_aggregate_version')
      ) {
        throw new ConcurrencyException(
          `Concurrency conflict for ${aggregateType} ${aggregateId}`,
        );
      }

      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Loads all events for an aggregate stream
   */
  async loadStream(query: StreamQuery): Promise<StoredEvent[]> {
    const qb = this.eventRepository
      .createQueryBuilder('event')
      .where('event.aggregateId = :aggregateId', {
        aggregateId: query.aggregateId,
      })
      .orderBy('event.version', 'ASC');

    if (query.fromVersion !== undefined) {
      qb.andWhere('event.version >= :fromVersion', {
        fromVersion: query.fromVersion,
      });
    }

    if (query.toVersion !== undefined) {
      qb.andWhere('event.version <= :toVersion', {
        toVersion: query.toVersion,
      });
    }

    const entities = await qb.getMany();

    this.logger.debug(
      `Loaded ${entities.length} events for aggregate ${query.aggregateId}`,
    );

    return entities.map((e) => this.toStoredEvent(e));
  }

  /**
   * Queries events globally (across aggregates)
   */
  async queryEvents(query: GlobalQuery): Promise<StoredEvent[]> {
    const qb = this.eventRepository
      .createQueryBuilder('event')
      .orderBy('event.globalSequence', 'ASC');

    if (query.aggregateType) {
      qb.andWhere('event.aggregateType = :aggregateType', {
        aggregateType: query.aggregateType,
      });
    }

    if (query.fromSequence !== undefined) {
      qb.andWhere('event.globalSequence >= :fromSequence', {
        fromSequence: query.fromSequence,
      });
    }

    if (query.toSequence !== undefined) {
      qb.andWhere('event.globalSequence <= :toSequence', {
        toSequence: query.toSequence,
      });
    }

    if (query.fromTimestamp) {
      qb.andWhere('event.timestamp >= :fromTimestamp', {
        fromTimestamp: query.fromTimestamp,
      });
    }

    if (query.toTimestamp) {
      qb.andWhere('event.timestamp <= :toTimestamp', {
        toTimestamp: query.toTimestamp,
      });
    }

    if (query.limit) {
      qb.limit(query.limit);
    }

    const entities = await qb.getMany();

    this.logger.debug(`Queried ${entities.length} events globally`);

    return entities.map((e) => this.toStoredEvent(e));
  }

  /**
   * Subscribes to new events (polling-based implementation)
   *
   * Polls the database every 1 second for new events.
   * For production, consider using PostgreSQL LISTEN/NOTIFY.
   */
  subscribe(
    fromSequence: number,
    handler: (event: StoredEvent) => Promise<void>,
  ): Subscription {
    const subscriptionId = `sub-${++this.subscriptionCounter}`;
    let currentSequence = fromSequence;
    let isProcessing = false;

    const poll = async () => {
      if (isProcessing) {
        return; // Skip if still processing previous batch
      }

      isProcessing = true;

      try {
        const events = await this.queryEvents({
          fromSequence: currentSequence + 1,
          limit: 100, // Process in batches
        });

        for (const event of events) {
          try {
            await handler(event).catch((handlerError) => {
              this.logger.error(
                `Subscription ${subscriptionId} handler failed for event ${event.globalSequence}`,
                handlerError instanceof Error
                  ? handlerError.stack
                  : String(handlerError),
              );
            });
            currentSequence = event.globalSequence;
          } catch (error) {
            this.logger.error(
              `Subscription ${subscriptionId} handler failed for event ${event.globalSequence}`,
              error instanceof Error ? error.stack : String(error),
            );
            // Continue processing other events
          }
        }
      } catch (error) {
        this.logger.error(
          `Subscription ${subscriptionId} polling failed`,
          error instanceof Error ? error.stack : String(error),
        );
      } finally {
        isProcessing = false;
      }
    };

    // Poll every 1 second
    const intervalId = setInterval(() => {
      void poll();
    }, 1000);
    this.subscriptions.set(subscriptionId, intervalId);

    this.logger.debug(
      `Created subscription ${subscriptionId} from sequence ${fromSequence}`,
    );

    return {
      id: subscriptionId,
      unsubscribe: () => {
        const interval = this.subscriptions.get(subscriptionId);
        if (interval) {
          clearInterval(interval);
          this.subscriptions.delete(subscriptionId);
          this.logger.debug(`Unsubscribed ${subscriptionId}`);
        }
      },
    };
  }

  /**
   * Gets the current global sequence number
   */
  async getCurrentSequence(): Promise<number> {
    const result = await this.eventRepository
      .createQueryBuilder('event')
      .select('MAX(event.globalSequence)', 'maxSequence')
      .getRawOne<{ maxSequence: string | null }>();

    return result?.maxSequence ? parseInt(result.maxSequence, 10) : 0;
  }

  /**
   * Gets the current version for an aggregate
   * Returns 0 if aggregate has no events
   */
  private async getCurrentVersion(
    aggregateId: string,
    repository: Repository<DomainEventEntity>,
  ): Promise<number> {
    const result = await repository
      .createQueryBuilder('event')
      .select('MAX(event.version)', 'maxVersion')
      .where('event.aggregateId = :aggregateId', { aggregateId })
      .getRawOne<{ maxVersion: string | null }>();

    return result?.maxVersion ? parseInt(result.maxVersion, 10) : 0;
  }

  /**
   * Serializes domain event to JSON
   */
  private serializeEventData(event: DomainEvent): Record<string, unknown> {
    // Remove eventType and occurredAt (stored separately)
    const {
      eventType: _eventType,
      occurredAt: _occurredAt,
      ...data
    } = event as any;
    return data;
  }

  /**
   * Extracts metadata from domain event
   */
  private extractMetadata(event: DomainEvent): EventMetadata {
    // TODO: Extract from event if it has metadata properties
    return {
      correlationId: (event as any).correlationId || event.aggregateId,
      causationId: (event as any).causationId,
      userId: (event as any).userId,
      timestamp: event.occurredAt,
    };
  }

  /**
   * Converts entity to StoredEvent
   */
  private toStoredEvent(entity: DomainEventEntity): StoredEvent {
    return {
      globalSequence: Number(entity.globalSequence),
      aggregateId: entity.aggregateId,
      aggregateType: entity.aggregateType,
      eventType: entity.eventType,
      eventData: entity.eventData,
      metadata: entity.metadata as unknown as EventMetadata,
      version: entity.version,
      schemaVersion: entity.schemaVersion,
      timestamp: entity.timestamp,
      idempotencyKey: entity.idempotencyKey,
    };
  }
}
