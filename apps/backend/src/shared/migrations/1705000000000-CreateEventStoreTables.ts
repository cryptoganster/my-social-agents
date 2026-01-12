import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * CreateEventStoreTables Migration
 *
 * Creates all tables for Event Sourcing infrastructure:
 * - domain_events (Event Store - append-only log)
 * - aggregate_snapshots (Snapshot Store - performance optimization)
 * - projection_positions (Projection Engine - tracking)
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.1, 4.1
 */
export class CreateEventStoreTables1705000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create domain_events table (Event Store)
    await queryRunner.createTable(
      new Table({
        name: 'domain_events',
        columns: [
          {
            name: 'global_sequence',
            type: 'bigserial',
            isPrimary: true,
            comment: 'Global ordering of all events',
          },
          {
            name: 'aggregate_id',
            type: 'varchar',
            length: '255',
            isNullable: false,
            comment: 'Aggregate identifier',
          },
          {
            name: 'aggregate_type',
            type: 'varchar',
            length: '100',
            isNullable: false,
            comment: 'Aggregate type (e.g., IngestionJob, ContentItem)',
          },
          {
            name: 'event_type',
            type: 'varchar',
            length: '100',
            isNullable: false,
            comment: 'Event type (e.g., JobScheduled, ContentIngested)',
          },
          {
            name: 'event_data',
            type: 'jsonb',
            isNullable: false,
            comment: 'Event payload',
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: false,
            comment: 'Event metadata (correlationId, causationId, userId)',
          },
          {
            name: 'version',
            type: 'int',
            isNullable: false,
            comment: 'Aggregate version (1-based)',
          },
          {
            name: 'schema_version',
            type: 'int',
            isNullable: false,
            default: 1,
            comment: 'Event schema version for upcasting',
          },
          {
            name: 'timestamp',
            type: 'timestamptz',
            isNullable: false,
            default: 'NOW()',
            comment: 'When event was persisted',
          },
          {
            name: 'idempotency_key',
            type: 'varchar',
            length: '255',
            isNullable: true,
            comment: 'Optional idempotency key for deduplication',
          },
        ],
      }),
      true,
    );

    // 2. Create aggregate_snapshots table (Snapshot Store)
    await queryRunner.createTable(
      new Table({
        name: 'aggregate_snapshots',
        columns: [
          {
            name: 'id',
            type: 'bigserial',
            isPrimary: true,
          },
          {
            name: 'aggregate_id',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'aggregate_type',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'version',
            type: 'int',
            isNullable: false,
            comment: 'Aggregate version at snapshot time',
          },
          {
            name: 'state',
            type: 'jsonb',
            isNullable: false,
            comment: 'Serialized aggregate state',
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            isNullable: false,
            default: 'NOW()',
          },
        ],
      }),
      true,
    );

    // 3. Create projection_positions table (Projection Engine)
    await queryRunner.createTable(
      new Table({
        name: 'projection_positions',
        columns: [
          {
            name: 'projection_name',
            type: 'varchar',
            length: '100',
            isPrimary: true,
          },
          {
            name: 'last_processed_sequence',
            type: 'bigint',
            isNullable: false,
            default: 0,
            comment: 'Last global_sequence processed by this projection',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            isNullable: false,
            default: 'NOW()',
          },
        ],
      }),
      true,
    );

    // 4. Create indexes for domain_events

    // Unique constraint: aggregate_id + version (optimistic concurrency)
    await queryRunner.createIndex(
      'domain_events',
      new TableIndex({
        name: 'UQ_domain_events_aggregate_version',
        columnNames: ['aggregate_id', 'version'],
        isUnique: true,
      }),
    );

    // Unique constraint: idempotency_key (deduplication)
    await queryRunner.createIndex(
      'domain_events',
      new TableIndex({
        name: 'UQ_domain_events_idempotency_key',
        columnNames: ['idempotency_key'],
        isUnique: true,
        where: 'idempotency_key IS NOT NULL',
      }),
    );

    // Index: aggregate_id (load stream)
    await queryRunner.createIndex(
      'domain_events',
      new TableIndex({
        name: 'IDX_domain_events_aggregate_id',
        columnNames: ['aggregate_id'],
      }),
    );

    // Index: aggregate_type (global queries)
    await queryRunner.createIndex(
      'domain_events',
      new TableIndex({
        name: 'IDX_domain_events_aggregate_type',
        columnNames: ['aggregate_type'],
      }),
    );

    // Index: event_type (global queries)
    await queryRunner.createIndex(
      'domain_events',
      new TableIndex({
        name: 'IDX_domain_events_event_type',
        columnNames: ['event_type'],
      }),
    );

    // Index: timestamp (time-based queries)
    await queryRunner.createIndex(
      'domain_events',
      new TableIndex({
        name: 'IDX_domain_events_timestamp',
        columnNames: ['timestamp'],
      }),
    );

    // Index: global_sequence (subscriptions)
    await queryRunner.createIndex(
      'domain_events',
      new TableIndex({
        name: 'IDX_domain_events_global_sequence',
        columnNames: ['global_sequence'],
      }),
    );

    // 5. Create indexes for aggregate_snapshots

    // Composite index: aggregate_id + aggregate_type (load snapshot)
    await queryRunner.createIndex(
      'aggregate_snapshots',
      new TableIndex({
        name: 'IDX_snapshots_aggregate',
        columnNames: ['aggregate_id', 'aggregate_type'],
      }),
    );

    // Unique constraint: aggregate_id + version (one snapshot per version)
    await queryRunner.createIndex(
      'aggregate_snapshots',
      new TableIndex({
        name: 'UQ_snapshots_aggregate_version',
        columnNames: ['aggregate_id', 'version'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes for aggregate_snapshots
    await queryRunner.dropIndex(
      'aggregate_snapshots',
      'UQ_snapshots_aggregate_version',
    );
    await queryRunner.dropIndex(
      'aggregate_snapshots',
      'IDX_snapshots_aggregate',
    );

    // Drop indexes for domain_events
    await queryRunner.dropIndex(
      'domain_events',
      'IDX_domain_events_global_sequence',
    );
    await queryRunner.dropIndex('domain_events', 'IDX_domain_events_timestamp');
    await queryRunner.dropIndex(
      'domain_events',
      'IDX_domain_events_event_type',
    );
    await queryRunner.dropIndex(
      'domain_events',
      'IDX_domain_events_aggregate_type',
    );
    await queryRunner.dropIndex(
      'domain_events',
      'IDX_domain_events_aggregate_id',
    );
    await queryRunner.dropIndex(
      'domain_events',
      'UQ_domain_events_idempotency_key',
    );
    await queryRunner.dropIndex(
      'domain_events',
      'UQ_domain_events_aggregate_version',
    );

    // Drop tables in reverse order
    await queryRunner.dropTable('projection_positions');
    await queryRunner.dropTable('aggregate_snapshots');
    await queryRunner.dropTable('domain_events');
  }
}
