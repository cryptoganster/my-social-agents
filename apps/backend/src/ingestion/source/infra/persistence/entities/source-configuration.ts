import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * SourceConfiguration Database Entity
 *
 * TypeORM entity for persisting SourceConfiguration aggregates.
 * Maps the aggregate to a relational database schema.
 */
@Entity('source_configurations')
export class SourceConfigurationEntity {
  @PrimaryColumn('varchar', { length: 255 })
  sourceId!: string;

  @Column('varchar', { length: 50 })
  sourceType!: string;

  @Column('varchar', { length: 255 })
  name!: string;

  @Column('jsonb')
  config!: Record<string, unknown>;

  @Column('text', { nullable: true })
  credentials!: string | undefined;

  @Column('boolean', { default: true })
  isActive!: boolean;

  // Version for optimistic locking
  @Column('integer', { default: 0 })
  version!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
