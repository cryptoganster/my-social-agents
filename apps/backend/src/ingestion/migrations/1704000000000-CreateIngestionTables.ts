import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * CreateIngestionTables Migration
 *
 * Creates all tables for the Content Ingestion bounded context:
 * - source_configurations (source sub-context)
 * - ingestion_jobs (job sub-context)
 * - content_items (content sub-context)
 * - error_records (shared sub-context)
 *
 * All aggregate tables include version columns for optimistic locking.
 * Indexes are added for content_hash and foreign keys for performance.
 *
 * Requirements: 10.1, 10.5
 */
export class CreateIngestionTables1704000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create source_configurations table (source sub-context)
    await queryRunner.createTable(
      new Table({
        name: 'source_configurations',
        columns: [
          {
            name: 'source_id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'version',
            type: 'int',
            default: 0,
            comment: 'Optimistic locking version',
          },
          {
            name: 'source_type',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'config',
            type: 'jsonb',
            comment: 'Source-specific configuration',
          },
          {
            name: 'encrypted_credentials',
            type: 'text',
            isNullable: true,
            comment: 'AES-256 encrypted credentials',
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // 2. Create ingestion_jobs table (job sub-context)
    await queryRunner.createTable(
      new Table({
        name: 'ingestion_jobs',
        columns: [
          {
            name: 'job_id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'version',
            type: 'int',
            default: 0,
            comment: 'Optimistic locking version',
          },
          {
            name: 'source_id',
            type: 'uuid',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            comment: 'PENDING, RUNNING, COMPLETED, FAILED, RETRYING',
          },
          {
            name: 'scheduled_at',
            type: 'timestamp',
          },
          {
            name: 'executed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'items_collected',
            type: 'int',
            default: 0,
          },
          {
            name: 'duplicates_detected',
            type: 'int',
            default: 0,
          },
          {
            name: 'errors_encountered',
            type: 'int',
            default: 0,
          },
          {
            name: 'bytes_processed',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'duration_ms',
            type: 'int',
            default: 0,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // 3. Create content_items table (content sub-context)
    await queryRunner.createTable(
      new Table({
        name: 'content_items',
        columns: [
          {
            name: 'content_id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'version',
            type: 'int',
            default: 0,
            comment: 'Optimistic locking version',
          },
          {
            name: 'source_id',
            type: 'uuid',
          },
          {
            name: 'content_hash',
            type: 'varchar',
            length: '64',
            comment: 'SHA-256 hash for duplicate detection',
          },
          {
            name: 'raw_content',
            type: 'text',
          },
          {
            name: 'normalized_content',
            type: 'text',
          },
          {
            name: 'metadata',
            type: 'jsonb',
            comment:
              'ContentMetadata (title, author, publishedAt, language, sourceUrl)',
          },
          {
            name: 'asset_tags',
            type: 'jsonb',
            comment: 'Array of AssetTag objects (symbol, confidence)',
          },
          {
            name: 'collected_at',
            type: 'timestamp',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // 4. Create error_records table (shared sub-context)
    await queryRunner.createTable(
      new Table({
        name: 'error_records',
        columns: [
          {
            name: 'error_id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'job_id',
            type: 'uuid',
          },
          {
            name: 'timestamp',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'error_type',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'message',
            type: 'text',
          },
          {
            name: 'stack_trace',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'retry_count',
            type: 'int',
            default: 0,
          },
        ],
      }),
      true,
    );

    // 5. Create indexes for performance

    // Index on content_hash for duplicate detection
    await queryRunner.createIndex(
      'content_items',
      new TableIndex({
        name: 'IDX_content_items_content_hash',
        columnNames: ['content_hash'],
      }),
    );

    // Index on source_id for content queries
    await queryRunner.createIndex(
      'content_items',
      new TableIndex({
        name: 'IDX_content_items_source_id',
        columnNames: ['source_id'],
      }),
    );

    // Index on job status for job queries
    await queryRunner.createIndex(
      'ingestion_jobs',
      new TableIndex({
        name: 'IDX_ingestion_jobs_status',
        columnNames: ['status'],
      }),
    );

    // Index on scheduled_at for job scheduling
    await queryRunner.createIndex(
      'ingestion_jobs',
      new TableIndex({
        name: 'IDX_ingestion_jobs_scheduled_at',
        columnNames: ['scheduled_at'],
      }),
    );

    // Index on source_id for job queries
    await queryRunner.createIndex(
      'ingestion_jobs',
      new TableIndex({
        name: 'IDX_ingestion_jobs_source_id',
        columnNames: ['source_id'],
      }),
    );

    // Index on job_id for error queries
    await queryRunner.createIndex(
      'error_records',
      new TableIndex({
        name: 'IDX_error_records_job_id',
        columnNames: ['job_id'],
      }),
    );

    // 6. Create foreign keys for referential integrity

    // ingestion_jobs.source_id → source_configurations.source_id
    await queryRunner.createForeignKey(
      'ingestion_jobs',
      new TableForeignKey({
        name: 'FK_ingestion_jobs_source_id',
        columnNames: ['source_id'],
        referencedTableName: 'source_configurations',
        referencedColumnNames: ['source_id'],
        onDelete: 'RESTRICT', // Prevent deletion of source if jobs exist
        onUpdate: 'CASCADE',
      }),
    );

    // content_items.source_id → source_configurations.source_id
    await queryRunner.createForeignKey(
      'content_items',
      new TableForeignKey({
        name: 'FK_content_items_source_id',
        columnNames: ['source_id'],
        referencedTableName: 'source_configurations',
        referencedColumnNames: ['source_id'],
        onDelete: 'RESTRICT', // Prevent deletion of source if content exists
        onUpdate: 'CASCADE',
      }),
    );

    // error_records.job_id → ingestion_jobs.job_id
    await queryRunner.createForeignKey(
      'error_records',
      new TableForeignKey({
        name: 'FK_error_records_job_id',
        columnNames: ['job_id'],
        referencedTableName: 'ingestion_jobs',
        referencedColumnNames: ['job_id'],
        onDelete: 'CASCADE', // Delete errors when job is deleted
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    await queryRunner.dropForeignKey(
      'error_records',
      'FK_error_records_job_id',
    );
    await queryRunner.dropForeignKey(
      'content_items',
      'FK_content_items_source_id',
    );
    await queryRunner.dropForeignKey(
      'ingestion_jobs',
      'FK_ingestion_jobs_source_id',
    );

    // Drop indexes
    await queryRunner.dropIndex('error_records', 'IDX_error_records_job_id');
    await queryRunner.dropIndex(
      'ingestion_jobs',
      'IDX_ingestion_jobs_source_id',
    );
    await queryRunner.dropIndex(
      'ingestion_jobs',
      'IDX_ingestion_jobs_scheduled_at',
    );
    await queryRunner.dropIndex('ingestion_jobs', 'IDX_ingestion_jobs_status');
    await queryRunner.dropIndex('content_items', 'IDX_content_items_source_id');
    await queryRunner.dropIndex(
      'content_items',
      'IDX_content_items_content_hash',
    );

    // Drop tables in reverse order
    await queryRunner.dropTable('error_records');
    await queryRunner.dropTable('content_items');
    await queryRunner.dropTable('ingestion_jobs');
    await queryRunner.dropTable('source_configurations');
  }
}
