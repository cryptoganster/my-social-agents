import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration: Create aggregate_snapshots table
 *
 * Creates the table for storing aggregate snapshots to optimize
 * aggregate reconstitution by reducing event replay.
 *
 * Requirements: 3.1, 3.2, 3.5
 */
export class CreateSnapshotTable1705000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create aggregate_snapshots table
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
          },
          {
            name: 'state',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'NOW()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create unique constraint on aggregate_id + version
    await queryRunner.createIndex(
      'aggregate_snapshots',
      new TableIndex({
        name: 'UQ_aggregate_snapshots_aggregate_version',
        columnNames: ['aggregate_id', 'version'],
        isUnique: true,
      }),
    );

    // Create index on aggregate_id + aggregate_type for efficient lookups
    await queryRunner.createIndex(
      'aggregate_snapshots',
      new TableIndex({
        name: 'IDX_aggregate_snapshots_aggregate',
        columnNames: ['aggregate_id', 'aggregate_type'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('aggregate_snapshots', true);
  }
}
