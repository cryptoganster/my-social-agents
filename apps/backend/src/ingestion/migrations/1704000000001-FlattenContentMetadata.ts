import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * FlattenContentMetadata Migration
 *
 * Flattens the metadata JSONB column into individual columns for better query performance.
 * Adds: title, author, published_at, language, source_url
 *
 * The metadata JSONB column is kept for backward compatibility but individual columns
 * are added for frequently queried fields.
 */
export class FlattenContentMetadata1704000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add individual metadata columns
    await queryRunner.addColumn(
      'content_items',
      new TableColumn({
        name: 'title',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'content_items',
      new TableColumn({
        name: 'author',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'content_items',
      new TableColumn({
        name: 'published_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'content_items',
      new TableColumn({
        name: 'language',
        type: 'varchar',
        length: '10',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'content_items',
      new TableColumn({
        name: 'source_url',
        type: 'varchar',
        length: '1000',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'content_items',
      new TableColumn({
        name: 'updated_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP',
      }),
    );

    // Migrate existing data from metadata JSONB to individual columns
    await queryRunner.query(`
      UPDATE content_items
      SET
        title = metadata->>'title',
        author = metadata->>'author',
        published_at = (metadata->>'publishedAt')::timestamp,
        language = metadata->>'language',
        source_url = metadata->>'sourceUrl'
      WHERE metadata IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove individual metadata columns
    await queryRunner.dropColumn('content_items', 'updated_at');
    await queryRunner.dropColumn('content_items', 'source_url');
    await queryRunner.dropColumn('content_items', 'language');
    await queryRunner.dropColumn('content_items', 'published_at');
    await queryRunner.dropColumn('content_items', 'author');
    await queryRunner.dropColumn('content_items', 'title');
  }
}
