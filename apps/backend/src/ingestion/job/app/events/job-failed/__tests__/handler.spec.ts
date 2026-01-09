import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { JobFailedEventHandler } from '../handler';
import { JobFailedEvent } from '@/ingestion/job/domain/events';
import { UpdateSourceHealthCommand } from '@/ingestion/source/app/commands/update-source-health';

describe('JobFailedEventHandler', () => {
  let handler: JobFailedEventHandler;
  let commandBus: jest.Mocked<CommandBus>;

  beforeEach(async () => {
    const mockCommandBus = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobFailedEventHandler,
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
      ],
    }).compile();

    handler = module.get<JobFailedEventHandler>(JobFailedEventHandler);
    commandBus = module.get(CommandBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should execute UpdateSourceHealthCommand with failure outcome when JobFailedEvent is received', async () => {
      // Arrange
      const event = new JobFailedEvent(
        'job-123',
        'source-456',
        {
          message: 'Network timeout',
          type: 'NetworkError',
          stack: 'Error: Network timeout\n    at ...',
        },
        new Date('2024-01-15T10:05:00Z'),
      );

      commandBus.execute.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(UpdateSourceHealthCommand),
      );

      const executedCommand = commandBus.execute.mock
        .calls[0][0] as UpdateSourceHealthCommand;
      expect(executedCommand.sourceId).toBe('source-456');
      expect(executedCommand.jobOutcome).toBe('failure');
      expect(executedCommand.metrics).toBeUndefined();
    });

    it('should log error details when JobFailedEvent is received', async () => {
      // Arrange
      const event = new JobFailedEvent(
        'job-123',
        'source-456',
        {
          message: 'Network timeout',
          type: 'NetworkError',
          stack: 'Error: Network timeout\n    at ...',
        },
        new Date('2024-01-15T10:05:00Z'),
      );

      commandBus.execute.mockResolvedValue(undefined);

      const loggerErrorSpy = jest.spyOn(handler['logger'], 'error');

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Job job-123 failed'),
        expect.stringContaining('Error: Network timeout'),
      );
    });

    it('should handle events with different error types', async () => {
      // Arrange
      const event1 = new JobFailedEvent(
        'job-1',
        'source-1',
        {
          message: 'Connection refused',
          type: 'ConnectionError',
        },
        new Date('2024-01-15T10:00:00Z'),
      );

      const event2 = new JobFailedEvent(
        'job-2',
        'source-2',
        {
          message: 'Invalid credentials',
          type: 'AuthenticationError',
          stack: 'Error: Invalid credentials\n    at ...',
        },
        new Date('2024-01-15T11:00:00Z'),
      );

      commandBus.execute.mockResolvedValue(undefined);

      // Act
      await handler.handle(event1);
      await handler.handle(event2);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledTimes(2);

      const firstCommand = commandBus.execute.mock
        .calls[0][0] as UpdateSourceHealthCommand;
      const secondCommand = commandBus.execute.mock
        .calls[1][0] as UpdateSourceHealthCommand;

      expect(firstCommand.sourceId).toBe('source-1');
      expect(firstCommand.jobOutcome).toBe('failure');

      expect(secondCommand.sourceId).toBe('source-2');
      expect(secondCommand.jobOutcome).toBe('failure');
    });

    it('should log error and continue if command execution fails', async () => {
      // Arrange
      const event = new JobFailedEvent(
        'job-123',
        'source-456',
        {
          message: 'Network timeout',
          type: 'NetworkError',
        },
        new Date('2024-01-15T10:05:00Z'),
      );

      const error = new Error('Command execution failed');
      commandBus.execute.mockRejectedValue(error);

      const loggerErrorSpy = jest.spyOn(handler['logger'], 'error');

      // Act
      await handler.handle(event);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error handling JobFailedEvent'),
        expect.any(String),
      );
    });

    it('should handle multiple failed events sequentially', async () => {
      // Arrange
      const event1 = new JobFailedEvent(
        'job-1',
        'source-1',
        {
          message: 'Error 1',
          type: 'Error',
        },
        new Date('2024-01-15T10:00:00Z'),
      );
      const event2 = new JobFailedEvent(
        'job-2',
        'source-2',
        {
          message: 'Error 2',
          type: 'Error',
        },
        new Date('2024-01-15T11:00:00Z'),
      );

      commandBus.execute.mockResolvedValue(undefined);

      // Act
      await handler.handle(event1);
      await handler.handle(event2);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledTimes(2);

      const firstCommand = commandBus.execute.mock
        .calls[0][0] as UpdateSourceHealthCommand;
      const secondCommand = commandBus.execute.mock
        .calls[1][0] as UpdateSourceHealthCommand;

      expect(firstCommand.sourceId).toBe('source-1');
      expect(secondCommand.sourceId).toBe('source-2');
    });
  });
});
