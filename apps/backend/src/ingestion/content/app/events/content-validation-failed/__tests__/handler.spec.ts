import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { ContentValidationFailedEventHandler } from '../handler';
import { ContentValidationFailedEvent } from '@/ingestion/content/domain/events';
import { UpdateJobMetricsCommand } from '@/ingestion/job/app/commands/update-job-metrics';

describe('ContentValidationFailedEventHandler', () => {
  let handler: ContentValidationFailedEventHandler;
  let commandBus: jest.Mocked<CommandBus>;

  beforeEach(async () => {
    const mockCommandBus = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentValidationFailedEventHandler,
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
      ],
    }).compile();

    handler = module.get<ContentValidationFailedEventHandler>(
      ContentValidationFailedEventHandler,
    );
    commandBus = module.get(CommandBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should execute UpdateJobMetricsCommand when ContentValidationFailedEvent is received', async () => {
      // Arrange
      const event = new ContentValidationFailedEvent(
        'job-123',
        'source-456',
        'Some invalid content',
        ['Content too short', 'Missing required field'],
        new Date('2024-01-15T10:00:00Z'),
      );

      commandBus.execute.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(UpdateJobMetricsCommand),
      );
    });

    it('should increment validationErrors by 1', async () => {
      // Arrange
      const event = new ContentValidationFailedEvent(
        'job-789',
        'source-101',
        'Invalid content',
        ['Validation error 1'],
        new Date('2024-01-15T10:00:00Z'),
      );

      commandBus.execute.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      const executedCommand = commandBus.execute.mock
        .calls[0][0] as UpdateJobMetricsCommand;
      expect(executedCommand.jobId).toBe('job-789');
      expect(executedCommand.metricUpdate).toEqual({
        validationErrors: 1,
      });
    });

    it('should log validation errors', async () => {
      // Arrange
      const event = new ContentValidationFailedEvent(
        'job-123',
        'source-456',
        'Bad content',
        ['Error 1', 'Error 2', 'Error 3'],
        new Date('2024-01-15T10:00:00Z'),
      );

      commandBus.execute.mockResolvedValue(undefined);

      const loggerWarnSpy = jest.spyOn(handler['logger'], 'warn');

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Content validation failed for job job-123'),
      );
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error 1, Error 2, Error 3'),
      );
    });

    it('should use correct jobId from event', async () => {
      // Arrange
      const event = new ContentValidationFailedEvent(
        'job-specific-id',
        'source-999',
        'Content',
        ['Error'],
        new Date('2024-01-15T11:00:00Z'),
      );

      commandBus.execute.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      const executedCommand = commandBus.execute.mock
        .calls[0][0] as UpdateJobMetricsCommand;
      expect(executedCommand.jobId).toBe('job-specific-id');
    });

    it('should log error and continue if command execution fails', async () => {
      // Arrange
      const event = new ContentValidationFailedEvent(
        'job-123',
        'source-456',
        'Content',
        ['Validation error'],
        new Date('2024-01-15T10:00:00Z'),
      );

      const error = new Error('Command execution failed');
      commandBus.execute.mockRejectedValue(error);

      const loggerErrorSpy = jest.spyOn(handler['logger'], 'error');

      // Act
      await handler.handle(event);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error handling ContentValidationFailedEvent'),
        expect.any(String),
      );
    });

    it('should handle multiple validation failures sequentially', async () => {
      // Arrange
      const event1 = new ContentValidationFailedEvent(
        'job-1',
        'source-1',
        'Content 1',
        ['Error A'],
        new Date('2024-01-15T10:00:00Z'),
      );
      const event2 = new ContentValidationFailedEvent(
        'job-1',
        'source-1',
        'Content 2',
        ['Error B', 'Error C'],
        new Date('2024-01-15T10:01:00Z'),
      );

      commandBus.execute.mockResolvedValue(undefined);

      // Act
      await handler.handle(event1);
      await handler.handle(event2);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledTimes(2);

      const firstCommand = commandBus.execute.mock
        .calls[0][0] as UpdateJobMetricsCommand;
      const secondCommand = commandBus.execute.mock
        .calls[1][0] as UpdateJobMetricsCommand;

      expect(firstCommand.jobId).toBe('job-1');
      expect(firstCommand.metricUpdate.validationErrors).toBe(1);

      expect(secondCommand.jobId).toBe('job-1');
      expect(secondCommand.metricUpdate.validationErrors).toBe(1);
    });

    it('should handle single validation error', async () => {
      // Arrange
      const event = new ContentValidationFailedEvent(
        'job-single',
        'source-single',
        'Content',
        ['Single error'],
        new Date('2024-01-15T10:00:00Z'),
      );

      commandBus.execute.mockResolvedValue(undefined);

      const loggerWarnSpy = jest.spyOn(handler['logger'], 'warn');

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Single error'),
      );
    });

    it('should handle empty validation errors array', async () => {
      // Arrange
      const event = new ContentValidationFailedEvent(
        'job-empty',
        'source-empty',
        'Content',
        [],
        new Date('2024-01-15T10:00:00Z'),
      );

      commandBus.execute.mockResolvedValue(undefined);

      const loggerWarnSpy = jest.spyOn(handler['logger'], 'warn');

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Content validation failed for job job-empty'),
      );
      expect(commandBus.execute).toHaveBeenCalledTimes(1);
    });
  });
});
