import { Test, TestingModule } from '@nestjs/testing';
import { SourceUnhealthyEventHandler } from '../handler';
import { SourceUnhealthyEvent } from '@/ingestion/source/domain/events';
import { SourceConfiguration } from '@/ingestion/source/domain/aggregates';
import {
  SourceType,
  SourceTypeEnum,
} from '@/ingestion/source/domain/value-objects';

describe('SourceUnhealthyEventHandler', () => {
  let handler: SourceUnhealthyEventHandler;
  let sourceFactory: any;
  let sourceWriteRepo: any;

  beforeEach(async () => {
    const mockSourceFactory = {
      load: jest.fn(),
    };

    const mockSourceWriteRepo = {
      save: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SourceUnhealthyEventHandler,
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

    handler = module.get<SourceUnhealthyEventHandler>(
      SourceUnhealthyEventHandler,
    );
    sourceFactory = mockSourceFactory;
    sourceWriteRepo = mockSourceWriteRepo;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should disable source when SourceUnhealthyEvent is received', async () => {
      // Arrange
      const event = new SourceUnhealthyEvent(
        'source-123',
        75.5, // 75.5% failure rate
        5, // 5 consecutive failures
        new Date('2024-01-15T10:00:00Z'),
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
      await handler.handle(event);

      // Assert
      expect(sourceFactory.load).toHaveBeenCalledWith('source-123');
      expect(disableSpy).toHaveBeenCalledWith(
        'Automatic disable due to health issues',
      );
      expect(sourceWriteRepo.save).toHaveBeenCalledWith(mockSource);
    });

    it('should log unhealthy source details when event is received', async () => {
      // Arrange
      const event = new SourceUnhealthyEvent(
        'source-123',
        80.0,
        3,
        new Date('2024-01-15T10:00:00Z'),
      );

      const mockSource = SourceConfiguration.create({
        sourceId: 'source-123',
        sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
        name: 'Test Web Source',
        config: { url: 'https://example.com' },
      });

      sourceFactory.load.mockResolvedValue(mockSource);
      sourceWriteRepo.save.mockResolvedValue(undefined);

      const loggerErrorSpy = jest.spyOn(handler['logger'], 'error');

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Source source-123 marked unhealthy'),
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('80.00% failure rate'),
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('3 consecutive failures'),
      );
    });

    it('should log warning when source is not found', async () => {
      // Arrange
      const event = new SourceUnhealthyEvent(
        'non-existent-source',
        90.0,
        10,
        new Date('2024-01-15T10:00:00Z'),
      );

      sourceFactory.load.mockResolvedValue(null);

      const loggerWarnSpy = jest.spyOn(handler['logger'], 'warn');

      // Act
      await handler.handle(event);

      // Assert
      expect(sourceFactory.load).toHaveBeenCalledWith('non-existent-source');
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Source non-existent-source not found'),
      );
      expect(sourceWriteRepo.save).not.toHaveBeenCalled();
    });

    it('should handle events with different failure metrics', async () => {
      // Arrange
      const event1 = new SourceUnhealthyEvent(
        'source-1',
        60.0,
        3,
        new Date('2024-01-15T10:00:00Z'),
      );

      const event2 = new SourceUnhealthyEvent(
        'source-2',
        95.5,
        15,
        new Date('2024-01-15T11:00:00Z'),
      );

      const mockSource1 = SourceConfiguration.create({
        sourceId: 'source-1',
        sourceType: SourceType.fromEnum(SourceTypeEnum.RSS),
        name: 'Source 1',
        config: { feedUrl: 'https://example1.com/feed' },
      });

      const mockSource2 = SourceConfiguration.create({
        sourceId: 'source-2',
        sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
        name: 'Source 2',
        config: { url: 'https://example2.com' },
      });

      sourceFactory.load
        .mockResolvedValueOnce(mockSource1)
        .mockResolvedValueOnce(mockSource2);
      sourceWriteRepo.save.mockResolvedValue(undefined);

      // Act
      await handler.handle(event1);
      await handler.handle(event2);

      // Assert
      expect(sourceFactory.load).toHaveBeenCalledTimes(2);
      expect(sourceFactory.load).toHaveBeenCalledWith('source-1');
      expect(sourceFactory.load).toHaveBeenCalledWith('source-2');
      expect(sourceWriteRepo.save).toHaveBeenCalledTimes(2);
    });

    it('should log error and continue if factory load fails', async () => {
      // Arrange
      const event = new SourceUnhealthyEvent(
        'source-123',
        75.0,
        5,
        new Date('2024-01-15T10:00:00Z'),
      );

      const error = new Error('Factory load failed');
      sourceFactory.load.mockRejectedValue(error);

      const loggerErrorSpy = jest.spyOn(handler['logger'], 'error');

      // Act
      await handler.handle(event);

      // Assert
      expect(sourceFactory.load).toHaveBeenCalledWith('source-123');
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error handling SourceUnhealthyEvent'),
        expect.any(String),
      );
      expect(sourceWriteRepo.save).not.toHaveBeenCalled();
    });

    it('should log error and continue if repository save fails', async () => {
      // Arrange
      const event = new SourceUnhealthyEvent(
        'source-123',
        80.0,
        4,
        new Date('2024-01-15T10:00:00Z'),
      );

      const mockSource = SourceConfiguration.create({
        sourceId: 'source-123',
        sourceType: SourceType.fromEnum(SourceTypeEnum.RSS),
        name: 'Test Source',
        config: { feedUrl: 'https://example.com/feed' },
      });

      sourceFactory.load.mockResolvedValue(mockSource);

      const error = new Error('Repository save failed');
      sourceWriteRepo.save.mockRejectedValue(error);

      const loggerErrorSpy = jest.spyOn(handler['logger'], 'error');

      // Act
      await handler.handle(event);

      // Assert
      expect(sourceFactory.load).toHaveBeenCalledWith('source-123');
      expect(sourceWriteRepo.save).toHaveBeenCalledWith(mockSource);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error handling SourceUnhealthyEvent'),
        expect.any(String),
      );
    });

    it('should log success message after disabling source', async () => {
      // Arrange
      const event = new SourceUnhealthyEvent(
        'source-123',
        70.0,
        3,
        new Date('2024-01-15T10:00:00Z'),
      );

      const mockSource = SourceConfiguration.create({
        sourceId: 'source-123',
        sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
        name: 'Test Source',
        config: { url: 'https://example.com' },
      });

      sourceFactory.load.mockResolvedValue(mockSource);
      sourceWriteRepo.save.mockResolvedValue(undefined);

      const loggerWarnSpy = jest.spyOn(handler['logger'], 'warn');

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Source source-123 has been automatically disabled',
        ),
      );
    });

    it('should handle multiple unhealthy events sequentially', async () => {
      // Arrange
      const event1 = new SourceUnhealthyEvent(
        'source-1',
        65.0,
        3,
        new Date('2024-01-15T10:00:00Z'),
      );
      const event2 = new SourceUnhealthyEvent(
        'source-2',
        85.0,
        7,
        new Date('2024-01-15T11:00:00Z'),
      );

      const mockSource1 = SourceConfiguration.create({
        sourceId: 'source-1',
        sourceType: SourceType.fromEnum(SourceTypeEnum.RSS),
        name: 'Source 1',
        config: { feedUrl: 'https://example1.com/feed' },
      });

      const mockSource2 = SourceConfiguration.create({
        sourceId: 'source-2',
        sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
        name: 'Source 2',
        config: { url: 'https://example2.com' },
      });

      sourceFactory.load
        .mockResolvedValueOnce(mockSource1)
        .mockResolvedValueOnce(mockSource2);
      sourceWriteRepo.save.mockResolvedValue(undefined);

      // Act
      await handler.handle(event1);
      await handler.handle(event2);

      // Assert
      expect(sourceFactory.load).toHaveBeenCalledTimes(2);
      expect(sourceWriteRepo.save).toHaveBeenCalledTimes(2);
      expect(sourceWriteRepo.save).toHaveBeenCalledWith(mockSource1);
      expect(sourceWriteRepo.save).toHaveBeenCalledWith(mockSource2);
    });
  });
});
