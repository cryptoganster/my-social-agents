/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SourceConfiguration,
  SourceConfigurationWriteRepository,
} from '@/ingestion/domain';
import { ConcurrencyException } from '@/shared/kernel';
import { SourceConfigurationEntity } from '../entities/source-configuration';

/**
 * TypeORM SourceConfigurationWriteRepository Implementation
 *
 * Implements write operations for SourceConfiguration aggregate using TypeORM and PostgreSQL.
 * Uses optimistic locking to prevent concurrent modifications.
 *
 * Requirements: 5.1, 5.3
 */
@Injectable()
export class TypeOrmSourceConfigurationWriteRepository implements SourceConfigurationWriteRepository {
  constructor(
    @InjectRepository(SourceConfigurationEntity)
    private readonly repository: Repository<SourceConfigurationEntity>,
  ) {}

  async save(config: SourceConfiguration): Promise<void> {
    const configData = config.toObject();
    const entity = this.toEntity(configData);

    // Check if this is a new aggregate (version = 0)
    if (configData.version === 0) {
      // Insert new record
      await this.repository.insert(entity as any);
      return;
    }

    // Update existing record with optimistic locking
    const result = await this.repository
      .createQueryBuilder()
      .update(SourceConfigurationEntity)
      .set({
        sourceType: entity.sourceType,
        name: entity.name,
        config: entity.config as any,
        credentials: entity.credentials,
        isActive: entity.isActive,
        version: configData.version,
        updatedAt: new Date(),
      })
      .where('sourceId = :id', { id: configData.sourceId })
      .andWhere('version = :oldVersion', {
        oldVersion: configData.version - 1,
      })
      .execute();

    // If no rows were affected, version mismatch occurred
    if (result.affected === 0) {
      throw new ConcurrencyException(
        `SourceConfiguration ${configData.sourceId} was modified by another transaction. ` +
          `Expected version ${configData.version - 1}, but it may have changed.`,
      );
    }
  }

  async delete(sourceId: string): Promise<void> {
    // Soft delete: mark as inactive
    await this.repository
      .createQueryBuilder()
      .update(SourceConfigurationEntity)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where('sourceId = :id', { id: sourceId })
      .execute();
  }

  private toEntity(configData: any): SourceConfigurationEntity {
    const entity = new SourceConfigurationEntity();
    entity.sourceId = configData.sourceId;
    entity.sourceType = configData.sourceType.toString();
    entity.name = configData.name;
    entity.config = configData.config;
    entity.credentials = configData.credentials;
    entity.isActive = configData.isActive;
    entity.version = configData.version;
    return entity;
  }
}
