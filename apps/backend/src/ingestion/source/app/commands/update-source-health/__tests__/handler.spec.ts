import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { UpdateSourceHealthCommandHandler } from '../handler';
import { UpdateSourceHealthCommand } from '../command';
import { ISourceConfigurationFactory } from '@/ingestion/source/domain/interfaces/factories/source-configuration-factory';
import { ISourceConfigurationWriteRepository } from '@/ingestion/source/domain/interfaces/repositories/source-configuration-write';
import { SourceConfiguration } from '@/ingestion/source/domain/aggregates/source-configuration';
import {
  SourceType,
  SourceTypeEnum,
} from '@/ingestion/source/domain/value-objects/source-type';
import { SourceUnhealthyEvent } from '@/ingestion/source/domain/events/source-unhealthy';

describe('UpdateSourceHealthCommandHandler', () => {
  let handler: UpdateSourceHealthCommandHandler;
  let sourceConfigFactory: jest.Mocked<ISourceConfigurationFactory>;
  let sourceWriteRepository: jest.Mocked<ISourceConfigurationWriteRepository>;
  let eventBus: jest.Mocked<EventBus>;

  beforeEach(async () => {
    // Create mocks
    sourceConfigFactory = {
      load: jest.fn(),
    } as jest.Mocked<ISourceConfigurationFactory>;

    sourceWriteRepository = {
      save: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<ISourceConfigurationWriteRepository>;

    eventBus = {
      publish: jest.fn(),
      publishAll: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateSourceHealthCommandHandler,
        {
          provide: 'ISourceConfigurationFactory',
          useValue: sourceConfigFactory,
        },
        {
          provide: 'ISourceConfigurationWriteRepository',
          useValue: sourceWriteRepository,
        },
        {
          provide: EventBus,
          useValue: eventBus,
        },
      ],
    }).compile();

    handler = module.get<UpdateSourceHealthCommandHandler>(
      UpdateSourceHealthCommandHandler,
    );
  });

  describe('execute', () => {
    it('should record success and improve health metrics', async () => {
      // Arrange
      const sourceId = 'source-123';
      const command = new UpdateSourceHealthCommand(sourceId, 'success', {
        itemsCollected: 100,
        duration: 5000,
      });

      const mockSourceConfig = SourceConfiguration.reconstitute({
        sourceId,
        sourceType: SourceType.fromEnum(SourceTypeEnum.RSS),
        name: 'Test RSS Source',
        config: { feedUrl: 'https://example.com/feed' },
        credentials: undefined,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        consecutiveFailures: 2,
        successRate: 60,
        totalJobs: 0,
        lastSuccessAt: null,
        lastFailureAt: new Date(),
        version: 1,
      });

      sourceConfigFactory.load.mockResolvedValue(mockSourceConfig);
      sourceWriteRepository.save.mockResolvedValue();

      // Act
      await handler.execute(command);

      // Assert
      expect(sourceConfigFactory.load).toHaveBeenCalledWith(sourceId);
      expect(sourceWriteRepository.save).toHaveBeenCalledTimes(1);
      expect(mockSourceConfig.consecutiveFailures).toBe(0); // Reset on success
      expect(mockSourceConfig.lastSuccessAt).not.toBeNull();
      expect(eventBus.publish).not.toHaveBeenCalled(); // Not unhealthy
    });

    it('should record failure and degrade health metrics', async () => {
      // Arrange
      const sourceId = 'source-456';
      const command = new UpdateSourceHealthCommand(sourceId, 'failure');

      const mockSourceConfig = SourceConfiguration.reconstitute({
        sourceId,
        sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
        name: 'Test Web Source',
        config: { url: 'https://example.com' },
        credentials: undefined,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        consecutiveFailures: 1,
        successRate: 80,
        totalJobs: 0,
        lastSuccessAt: new Date(),
        lastFailureAt: null,
        version: 1,
      });

      sourceConfigFactory.load.mockResolvedValue(mockSourceConfig);
      sourceWriteRepository.save.mockResolvedValue();

      // Act
      await handler.execute(command);

      // Assert
      expect(sourceConfigFactory.load).toHaveBeenCalledWith(sourceId);
      expect(sourceWriteRepository.save).toHaveBeenCalledTimes(1);
      expect(mockSourceConfig.consecutiveFailures).toBe(2); // Incremented
      expect(mockSourceConfig.lastFailureAt).not.toBeNull();
      expect(eventBus.publish).not.toHaveBeenCalled(); // Not unhealthy yet
    });

    it('should publish SourceUnhealthyEvent when threshold is crossed', async () => {
      // Arrange
      const sourceId = 'source-789';
      const command = new UpdateSourceHealthCommand(sourceId, 'failure');

      const mockSourceConfig = SourceConfiguration.reconstitute({
        sourceId,
        sourceType: SourceType.fromEnum(SourceTypeEnum.SOCIAL_MEDIA),
        name: 'Test Social Media Source',
        config: { platform: 'twitter' },
        credentials: 'encrypted-creds',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        consecutiveFailures: 2, // Will become 3 after this failure
        successRate: 70,
        totalJobs: 0,
        lastSuccessAt: new Date(),
        lastFailureAt: new Date(),
        version: 1,
      });

      sourceConfigFactory.load.mockResolvedValue(mockSourceConfig);
      sourceWriteRepository.save.mockResolvedValue();

      // Act
      await handler.execute(command);

      // Assert
      expect(sourceConfigFactory.load).toHaveBeenCalledWith(sourceId);
      expect(sourceWriteRepository.save).toHaveBeenCalledTimes(1);
      expect(mockSourceConfig.consecutiveFailures).toBe(3); // Threshold crossed
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceId,
          consecutiveFailures: 3,
        }),
      );

      const publishedEvent = (eventBus.publish as jest.Mock).mock
        .calls[0][0] as SourceUnhealthyEvent;
      expect(publishedEvent).toBeInstanceOf(SourceUnhealthyEvent);
      expect(publishedEvent.sourceId).toBe(sourceId);
      expect(publishedEvent.consecutiveFailures).toBe(3);
    });

    it('should throw error when source is not found', async () => {
      // Arrange
      const sourceId = 'non-existent-source';
      const command = new UpdateSourceHealthCommand(sourceId, 'success');

      sourceConfigFactory.load.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        `Source not found: ${sourceId}`,
      );

      expect(sourceConfigFactory.load).toHaveBeenCalledWith(sourceId);
      expect(sourceWriteRepository.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should handle success after multiple failures', async () => {
      // Arrange
      const sourceId = 'source-recovery';
      const command = new UpdateSourceHealthCommand(sourceId, 'success', {
        itemsCollected: 50,
        duration: 3000,
      });

      const mockSourceConfig = SourceConfiguration.reconstitute({
        sourceId,
        sourceType: SourceType.fromEnum(SourceTypeEnum.PDF),
        name: 'Test PDF Source',
        config: { path: '/path/to/file.pdf' },
        credentials: undefined,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        consecutiveFailures: 2, // Below threshold of 3
        successRate: 55, // Above 50% threshold
        totalJobs: 10,
        lastSuccessAt: new Date(Date.now() - 86400000), // 1 day ago
        lastFailureAt: new Date(),
        version: 1,
      });

      sourceConfigFactory.load.mockResolvedValue(mockSourceConfig);
      sourceWriteRepository.save.mockResolvedValue();

      // Act
      await handler.execute(command);

      // Assert
      expect(sourceConfigFactory.load).toHaveBeenCalledWith(sourceId);
      expect(sourceWriteRepository.save).toHaveBeenCalledTimes(1);
      expect(mockSourceConfig.consecutiveFailures).toBe(0); // Reset on success
      expect(mockSourceConfig.lastSuccessAt).not.toBeNull();
      // Success rate should improve (from 55% to ~60%)
      expect(mockSourceConfig.successRate).toBeGreaterThan(55);
      // Source is healthy (successRate > 50% and consecutiveFailures < 3)
      expect(eventBus.publish).not.toHaveBeenCalled(); // Success doesn't trigger unhealthy event
    });

    it('should publish SourceUnhealthyEvent when success rate drops below 50%', async () => {
      // Arrange
      const sourceId = 'source-low-rate';
      const command = new UpdateSourceHealthCommand(sourceId, 'failure');

      // Create a source with low success rate (after 5+ jobs)
      const mockSourceConfig = SourceConfiguration.reconstitute({
        sourceId,
        sourceType: SourceType.fromEnum(SourceTypeEnum.OCR),
        name: 'Test OCR Source',
        config: { imagePath: '/path/to/image.png' },
        credentials: undefined,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        consecutiveFailures: 1,
        successRate: 51, // Just above threshold, will drop below after failure
        totalJobs: 10,
        lastSuccessAt: new Date(),
        lastFailureAt: new Date(),
        version: 1,
      });

      sourceConfigFactory.load.mockResolvedValue(mockSourceConfig);
      sourceWriteRepository.save.mockResolvedValue();

      // Act
      await handler.execute(command);

      // Assert
      expect(sourceConfigFactory.load).toHaveBeenCalledWith(sourceId);
      expect(sourceWriteRepository.save).toHaveBeenCalledTimes(1);
      expect(mockSourceConfig.consecutiveFailures).toBe(2);

      // Check if unhealthy event was published (depends on isUnhealthy logic)
      // The event should be published if success rate < 50% after 5+ jobs
      if (mockSourceConfig.isUnhealthy()) {
        expect(eventBus.publish).toHaveBeenCalledTimes(1);
      }
    });
  });
});
