import { Test, TestingModule } from '@nestjs/testing';
import { DisableSourceHandler } from '../handler';
import { DisableSourceCommand } from '../command';
import { SourceConfiguration } from '@/ingestion/source/domain/aggregates';
import {
  SourceType,
  SourceTypeEnum,
} from '@/ingestion/source/domain/value-objects';

describe('DisableSourceHandler', () => {
  let handler: DisableSourceHandler;
  let sourceFactory: jest.Mocked<any>;
  let sourceWriteRepo: jest.Mocked<any>;

  beforeEach(async () => {
    const mockSourceFactory = {
      load: jest.fn(),
    };

    const mockSourceWriteRepo = {
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisableSourceHandler,
        {
          provide: 'ISourceConfigurationFactory',
          useValue: mockSourceFactory,
        },
        {
          provide: 'ISourceConfigurationWriteRepository',
          useValue: mockSourceWriteRepo,
        },
      ],
    }).compile();

    handler = module.get<DisableSourceHandler>(DisableSourceHandler);
    sourceFactory = mockSourceFactory;
    sourceWriteRepo = mockSourceWriteRepo;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should disable source and return success result', async () => {
      // Arrange
      const command = new DisableSourceCommand(
        'source-123',
        'Automatic disable due to health issues',
      );

      const mockSource = SourceConfiguration.create({
        sourceId: 'source-123',
        sourceType: SourceType.fromEnum(SourceTypeEnum.RSS),
        name: 'Test RSS Feed',
        config: { feedUrl: 'https://example.com/feed' },
      });

      sourceFactory.load.mockResolvedValue(mockSource);
      sourceWriteRepo.save.mockResolvedValue(undefined);

      const disableSpy = jest.spyOn(mockSource, 'disable');

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Source disabled successfully');
      expect(result.sourceId).toBe('source-123');
      expect(sourceFactory.load).toHaveBeenCalledWith('source-123');
      expect(disableSpy).toHaveBeenCalledWith(
        'Automatic disable due to health issues',
      );
      expect(sourceWriteRepo.save).toHaveBeenCalledWith(mockSource);
    });

    it('should return not found result when source does not exist', async () => {
      // Arrange
      const command = new DisableSourceCommand(
        'non-existent-source',
        'Test reason',
      );

      sourceFactory.load.mockResolvedValue(null);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Source non-existent-source not found');
      expect(sourceWriteRepo.save).not.toHaveBeenCalled();
    });

    it('should return already disabled result when source is inactive', async () => {
      // Arrange
      const command = new DisableSourceCommand('source-123', 'Test reason');

      const mockSource = SourceConfiguration.create({
        sourceId: 'source-123',
        sourceType: SourceType.fromEnum(SourceTypeEnum.RSS),
        name: 'Test RSS Feed',
        config: { feedUrl: 'https://example.com/feed' },
        isActive: false,
      });

      sourceFactory.load.mockResolvedValue(mockSource);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Source source-123 is already disabled');
      expect(sourceWriteRepo.save).not.toHaveBeenCalled();
    });

    it('should retry on concurrency conflict', async () => {
      // Arrange
      const command = new DisableSourceCommand('source-123', 'Test reason');

      // Create fresh source for each load call
      const createMockSource = () =>
        SourceConfiguration.create({
          sourceId: 'source-123',
          sourceType: SourceType.fromEnum(SourceTypeEnum.RSS),
          name: 'Test RSS Feed',
          config: { feedUrl: 'https://example.com/feed' },
        });

      sourceFactory.load
        .mockResolvedValueOnce(createMockSource())
        .mockResolvedValueOnce(createMockSource());

      sourceWriteRepo.save
        .mockRejectedValueOnce(new Error('was modified by another transaction'))
        .mockResolvedValueOnce(undefined);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(sourceFactory.load).toHaveBeenCalledTimes(2);
      expect(sourceWriteRepo.save).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries on persistent concurrency conflict', async () => {
      // Arrange
      const command = new DisableSourceCommand('source-123', 'Test reason');

      // Create fresh source for each load call
      const createMockSource = () =>
        SourceConfiguration.create({
          sourceId: 'source-123',
          sourceType: SourceType.fromEnum(SourceTypeEnum.RSS),
          name: 'Test RSS Feed',
          config: { feedUrl: 'https://example.com/feed' },
        });

      sourceFactory.load
        .mockResolvedValueOnce(createMockSource())
        .mockResolvedValueOnce(createMockSource())
        .mockResolvedValueOnce(createMockSource());

      sourceWriteRepo.save.mockRejectedValue(
        new Error('was modified by another transaction'),
      );

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'Failed to disable source source-123 after 3 attempts',
      );
      expect(sourceFactory.load).toHaveBeenCalledTimes(3);
    });

    it('should throw immediately on non-concurrency errors', async () => {
      // Arrange
      const command = new DisableSourceCommand('source-123', 'Test reason');

      const mockSource = SourceConfiguration.create({
        sourceId: 'source-123',
        sourceType: SourceType.fromEnum(SourceTypeEnum.RSS),
        name: 'Test RSS Feed',
        config: { feedUrl: 'https://example.com/feed' },
      });

      sourceFactory.load.mockResolvedValue(mockSource);
      sourceWriteRepo.save.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Database error');
      expect(sourceFactory.load).toHaveBeenCalledTimes(1);
    });
  });
});
