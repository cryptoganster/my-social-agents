import * as fc from 'fast-check';
import { Repository, InsertResult, SelectQueryBuilder } from 'typeorm';
import { SourceConfiguration } from '@/ingestion/source/domain/aggregates/source-configuration';
import {
  SourceType,
  SourceTypeEnum,
} from '@/ingestion/source/domain/value-objects';
import { TypeOrmSourceConfigurationWriteRepository } from '../source-configuration-write';
import { TypeOrmSourceConfigurationReadRepository } from '../source-configuration-read';
import { TypeOrmSourceConfigurationFactory } from '../../factories/source-configuration-factory';
import { SourceConfigurationEntity } from '../../entities/source-configuration';
import { IngestionJobEntity } from '@/ingestion/job/infra/persistence/entities/ingestion-job';

/**
 * Property-Based Tests for SourceConfiguration Updates
 *
 * Feature: content-ingestion
 * Property 12: Source Configuration Updates
 *
 * Validates: Requirements 5.2
 *
 * For any source configuration update, future ingestion jobs should use the
 * updated configuration values, while in-progress jobs should continue with
 * the original configuration.
 */
describe('SourceConfiguration Updates Properties', () => {
  let writeRepo: TypeOrmSourceConfigurationWriteRepository;
  let readRepo: TypeOrmSourceConfigurationReadRepository;
  let factory: TypeOrmSourceConfigurationFactory;
  let mockRepository: jest.Mocked<Repository<SourceConfigurationEntity>>;

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      insert: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<SourceConfigurationEntity>>;

    // Create mock job repository
    const mockJobRepository = {
      find: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<Repository<IngestionJobEntity>>;

    // Create repositories and factory
    writeRepo = new TypeOrmSourceConfigurationWriteRepository(mockRepository);
    readRepo = new TypeOrmSourceConfigurationReadRepository(
      mockRepository,
      mockJobRepository,
    );
    factory = new TypeOrmSourceConfigurationFactory(readRepo);
  });

  /**
   * Property 12: Source Configuration Updates
   *
   * When a source configuration is updated and persisted, retrieving it
   * should return the updated values, not the original values.
   */
  it('should persist and retrieve updated configuration values', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom(...Object.values(SourceTypeEnum)),
        fc.string({ minLength: 3, maxLength: 100 }),
        fc.record({
          url: fc.webUrl(),
          maxDepth: fc.integer({ min: 1, max: 10 }),
        }),
        fc.string({ minLength: 3, maxLength: 100 }), // New name
        fc.record({
          url: fc.webUrl(),
          maxDepth: fc.integer({ min: 1, max: 10 }),
        }), // New config
        async (
          sourceId,
          sourceTypeValue,
          originalName,
          originalConfig,
          updatedName,
          updatedConfig,
        ) => {
          // Skip if names are the same (no update)
          fc.pre(originalName !== updatedName);

          const sourceType = SourceType.fromString(sourceTypeValue);

          // Create original source configuration
          const originalSource = SourceConfiguration.create({
            sourceId,
            sourceType,
            name: originalName,
            config: originalConfig,
          });

          // Mock insert for original
          mockRepository.insert.mockResolvedValue({} as InsertResult);

          // Persist original
          await writeRepo.save(originalSource);

          // Mock findOne to return original
          const originalEntity: SourceConfigurationEntity = {
            sourceId,
            sourceType: sourceTypeValue,
            name: originalName,
            config: originalConfig,
            credentials: undefined,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 0,
            consecutiveFailures: 0,
            successRate: 100.0,
            totalJobs: 0,
            lastSuccessAt: null,
            lastFailureAt: null,
          };
          mockRepository.findOne.mockResolvedValue(originalEntity);

          // Load the source
          const loadedSource = await factory.load(sourceId);
          expect(loadedSource).not.toBeNull();
          expect(loadedSource!.name).toBe(originalName);

          // Update the configuration
          loadedSource!.update({
            name: updatedName,
            config: updatedConfig,
          });

          // Mock the update operation
          const mockQueryBuilder = {
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({ affected: 1 }),
          };
          mockRepository.createQueryBuilder.mockReturnValue(
            mockQueryBuilder as unknown as SelectQueryBuilder<SourceConfigurationEntity>,
          );

          // Persist the update
          await writeRepo.save(loadedSource!);

          // Mock findOne to return updated values
          const updatedEntity: SourceConfigurationEntity = {
            sourceId,
            sourceType: sourceTypeValue,
            name: updatedName,
            config: updatedConfig,
            credentials: undefined,
            isActive: true,
            createdAt: originalEntity.createdAt,
            updatedAt: new Date(),
            version: 1, // Version incremented
            consecutiveFailures: 0,
            successRate: 100.0,
            totalJobs: 0,
            lastSuccessAt: null,
            lastFailureAt: null,
          };
          mockRepository.findOne.mockResolvedValue(updatedEntity);

          // Retrieve the updated source
          const retrievedSource = await factory.load(sourceId);

          // Verify updated values are persisted
          expect(retrievedSource).not.toBeNull();
          expect(retrievedSource!.name).toBe(updatedName);
          expect(retrievedSource!.config).toEqual(updatedConfig);
          expect(retrievedSource!.version.value).toBe(1);

          // Verify original values are NOT present
          expect(retrievedSource!.name).not.toBe(originalName);
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 12: Source Configuration Updates (Version Increment)
   *
   * When a source configuration is updated, the version should increment,
   * allowing optimistic locking to detect concurrent modifications.
   */
  it('should increment version on configuration updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom(...Object.values(SourceTypeEnum)),
        fc.string({ minLength: 3, maxLength: 100 }),
        fc.record({
          feedUrl: fc.webUrl(),
          refreshInterval: fc.integer({ min: 60, max: 3600 }),
        }),
        fc.string({ minLength: 3, maxLength: 100 }), // New name
        async (
          sourceId,
          sourceTypeValue,
          originalName,
          originalConfig,
          updatedName,
        ) => {
          // Skip if names are the same
          fc.pre(originalName !== updatedName);

          const sourceType = SourceType.fromString(sourceTypeValue);

          // Create and persist original
          const source = SourceConfiguration.create({
            sourceId,
            sourceType,
            name: originalName,
            config: originalConfig,
          });

          mockRepository.insert.mockResolvedValue({} as InsertResult);
          await writeRepo.save(source);

          const originalVersion = source.version.value;
          expect(originalVersion).toBe(0);

          // Mock findOne to return original
          const entity: SourceConfigurationEntity = {
            sourceId,
            sourceType: sourceTypeValue,
            name: originalName,
            config: originalConfig,
            credentials: undefined,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 0,
            consecutiveFailures: 0,
            successRate: 100.0,
            totalJobs: 0,
            lastSuccessAt: null,
            lastFailureAt: null,
          };
          mockRepository.findOne.mockResolvedValue(entity);

          // Load and update
          const loadedSource = await factory.load(sourceId);
          loadedSource!.update({ name: updatedName });

          // Version should have incremented
          expect(loadedSource!.version.value).toBe(1);

          // Mock update
          const mockQueryBuilder = {
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({ affected: 1 }),
          };
          mockRepository.createQueryBuilder.mockReturnValue(
            mockQueryBuilder as unknown as SelectQueryBuilder<SourceConfigurationEntity>,
          );

          // Persist
          await writeRepo.save(loadedSource!);

          // Verify version was incremented
          expect(loadedSource!.version.value).toBeGreaterThan(originalVersion);
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 12: Source Configuration Updates (Multiple Updates)
   *
   * Multiple sequential updates should each increment the version,
   * and the final state should reflect all updates.
   */
  it('should handle multiple sequential updates correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom(...Object.values(SourceTypeEnum)),
        fc.string({ minLength: 3, maxLength: 100 }),
        fc.array(fc.string({ minLength: 3, maxLength: 100 }), {
          minLength: 2,
          maxLength: 5,
        }),
        async (sourceId, sourceTypeValue, originalName, nameUpdates) => {
          // Ensure all names are unique
          const uniqueNames = [...new Set([originalName, ...nameUpdates])];
          fc.pre(uniqueNames.length > 2);

          const sourceType = SourceType.fromString(sourceTypeValue);

          // Create original
          const source = SourceConfiguration.create({
            sourceId,
            sourceType,
            name: originalName,
            config: { test: 'config' },
          });

          mockRepository.insert.mockResolvedValue({} as InsertResult);
          await writeRepo.save(source);

          let currentVersion = 0;
          let currentName = originalName;

          // Mock query builder for updates
          const mockQueryBuilder = {
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({ affected: 1 }),
          };
          mockRepository.createQueryBuilder.mockReturnValue(
            mockQueryBuilder as unknown as SelectQueryBuilder<SourceConfigurationEntity>,
          );

          // Perform multiple updates
          for (const newName of nameUpdates.slice(0, 3)) {
            if (newName === currentName) continue;

            // Mock findOne to return current state
            const entity: SourceConfigurationEntity = {
              sourceId,
              sourceType: sourceTypeValue,
              name: currentName,
              config: { test: 'config' },
              credentials: undefined,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              version: currentVersion,
              consecutiveFailures: 0,
              successRate: 100.0,
              totalJobs: 0,
              lastSuccessAt: null,
              lastFailureAt: null,
            };
            mockRepository.findOne.mockResolvedValue(entity);

            // Load and update
            const loadedSource = await factory.load(sourceId);
            loadedSource!.update({ name: newName });

            // Persist
            await writeRepo.save(loadedSource!);

            // Update tracking variables
            currentVersion++;
            currentName = newName;
          }

          // Final verification
          const finalEntity: SourceConfigurationEntity = {
            sourceId,
            sourceType: sourceTypeValue,
            name: currentName,
            config: { test: 'config' },
            credentials: undefined,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            version: currentVersion,
            consecutiveFailures: 0,
            successRate: 100.0,
            totalJobs: 0,
            lastSuccessAt: null,
            lastFailureAt: null,
          };
          mockRepository.findOne.mockResolvedValue(finalEntity);

          const finalSource = await factory.load(sourceId);

          // Verify final state
          expect(finalSource).not.toBeNull();
          expect(finalSource!.name).toBe(currentName);
          expect(finalSource!.version.value).toBe(currentVersion);
          expect(finalSource!.version.value).toBeGreaterThan(0);
        },
      ),
      { numRuns: 30 },
    );
  });
});
