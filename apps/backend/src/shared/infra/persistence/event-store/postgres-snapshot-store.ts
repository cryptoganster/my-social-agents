import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import {
  ISnapshotStore,
  Snapshot,
} from '@/shared/event-sourcing/snapshot-store';
import { AggregateSnapshotEntity } from './entities/aggregate-snapshot.entity';

/**
 * PostgreSQL implementation of ISnapshotStore
 *
 * Provides snapshot storage for aggregate state optimization:
 * - Saves snapshots at specific versions
 * - Loads the latest snapshot for an aggregate
 * - Cleans up old snapshots to manage storage
 *
 * Requirements: 3.1, 3.2, 3.5
 */
@Injectable()
export class PostgresSnapshotStore implements ISnapshotStore {
  private readonly logger = new Logger(PostgresSnapshotStore.name);

  constructor(
    @InjectRepository(AggregateSnapshotEntity)
    private readonly snapshotRepository: Repository<AggregateSnapshotEntity>,
  ) {}

  /**
   * Saves a snapshot of aggregate state
   *
   * @param snapshot - The snapshot to save
   *
   * Requirement: 3.1
   */
  async save<T>(snapshot: Snapshot<T>): Promise<void> {
    try {
      const entity = new AggregateSnapshotEntity();
      entity.aggregateId = snapshot.aggregateId;
      entity.aggregateType = snapshot.aggregateType;
      entity.version = snapshot.version;
      entity.state = snapshot.state as Record<string, unknown>;
      entity.createdAt = snapshot.createdAt;

      await this.snapshotRepository.save(entity);

      this.logger.debug(
        `Saved snapshot for ${snapshot.aggregateType} ${snapshot.aggregateId} at version ${snapshot.version}`,
      );
    } catch (error) {
      // Check for unique constraint violation (duplicate snapshot at same version)
      if (
        error instanceof Error &&
        error.message.includes('UQ_aggregate_snapshots_aggregate_version')
      ) {
        this.logger.warn(
          `Snapshot already exists for ${snapshot.aggregateType} ${snapshot.aggregateId} at version ${snapshot.version}`,
        );
        // Idempotent behavior: ignore duplicate
        return;
      }

      this.logger.error(
        `Failed to save snapshot for ${snapshot.aggregateType} ${snapshot.aggregateId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * Loads the latest snapshot for an aggregate
   *
   * @param aggregateId - ID of the aggregate
   * @param aggregateType - Type of the aggregate
   * @returns The latest snapshot, or null if none exists
   *
   * Requirement: 3.2
   */
  async load<T>(
    aggregateId: string,
    aggregateType: string,
  ): Promise<Snapshot<T> | null> {
    try {
      const entity = await this.snapshotRepository.findOne({
        where: {
          aggregateId,
          aggregateType,
        },
        order: {
          version: 'DESC', // Get the latest version
        },
      });

      if (!entity) {
        this.logger.debug(
          `No snapshot found for ${aggregateType} ${aggregateId}`,
        );
        return null;
      }

      this.logger.debug(
        `Loaded snapshot for ${aggregateType} ${aggregateId} at version ${entity.version}`,
      );

      return {
        aggregateId: entity.aggregateId,
        aggregateType: entity.aggregateType,
        version: entity.version,
        state: entity.state as T,
        createdAt: entity.createdAt,
      };
    } catch (error) {
      this.logger.error(
        `Failed to load snapshot for ${aggregateType} ${aggregateId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * Deletes old snapshots, keeping only the most recent ones
   *
   * @param aggregateId - ID of the aggregate
   * @param keepCount - Number of recent snapshots to keep
   *
   * Requirement: 3.5
   */
  async cleanup(aggregateId: string, keepCount: number): Promise<void> {
    try {
      // Find all snapshots for this aggregate, ordered by version descending
      const allSnapshots = await this.snapshotRepository.find({
        where: { aggregateId },
        order: { version: 'DESC' },
      });

      if (allSnapshots.length <= keepCount) {
        this.logger.debug(
          `No cleanup needed for aggregate ${aggregateId} (${allSnapshots.length} snapshots, keeping ${keepCount})`,
        );
        return;
      }

      // Get the version threshold (keep snapshots >= this version)
      const keepThresholdVersion = allSnapshots[keepCount - 1].version;

      // Delete snapshots older than the threshold
      const deleteResult = await this.snapshotRepository.delete({
        aggregateId,
        version: LessThan(keepThresholdVersion),
      });

      const deletedCount =
        typeof deleteResult.affected === 'number' ? deleteResult.affected : 0;

      this.logger.debug(
        `Cleaned up ${deletedCount} old snapshots for aggregate ${aggregateId} (kept ${keepCount} most recent)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to cleanup snapshots for aggregate ${aggregateId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
