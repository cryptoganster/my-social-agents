import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { JobCompletedEventHandler } from '../handler';
import { JobCompletedEvent } from '@/ingestion/job/domain/events';
import { UpdateSourceHealthCommand } from '@/ingestion/source/app/commands/update-source-health';

describe('JobCompletedEventHandler', () => {
  let handler: JobCompletedEventHandler;
  let commandBus: jest.Mocked<CommandBus>;

  beforeEach(async () => {
    const mockCommandBus = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobCompletedEventHandler,
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
      ],
    }).compile();

    handler = module.get<JobCompletedEventHandler>(JobCompletedEventHandler);
    commandBus = module.get(CommandBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should execute UpdateSourceHealthCommand with success outcome when JobCompletedEvent is received', async () => {
      // Arrange
      const event = new JobCompletedEvent(
        'job-123',
        'source-456',
        {
          itemsCollected: 50,
          itemsPersisted: 45,
          duplicatesDetected: 3,
          validationErrors: 2,
          duration: 5000,
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
      expect(executedCommand.jobOutcome).toBe('success');
      expect(executedCommand.metrics).toEqual({
        itemsCollected: 50,
        duration: 5000,
      });
    });

    it('should pass correct metrics to UpdateSourceHealthCommand', async () => {
      // Arrange
      const event = new JobCompletedEvent(
        'job-789',
        'source-101',
        {
          itemsCollected: 100,
          itemsPersisted: 95,
          duplicatesDetected: 5,
          validationErrors: 0,
          duration: 10000,
        },
        new Date('2024-01-15T11:00:00Z'),
      );

      commandBus.execute.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      const executedCommand = commandBus.execute.mock
        .calls[0][0] as UpdateSourceHealthCommand;
      expect(executedCommand.metrics).toEqual({
        itemsCollected: 100,
        duration: 10000,
      });
    });

    it('should log error and continue if command execution fails', async () => {
      // Arrange
      const event = new JobCompletedEvent(
        'job-123',
        'source-456',
        {
          itemsCollected: 50,
          itemsPersisted: 45,
          duplicatesDetected: 3,
          validationErrors: 2,
          duration: 5000,
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
        expect.stringContaining('Error handling JobCompletedEvent'),
        expect.any(String),
      );
    });

    it('should handle multiple events sequentially', async () => {
      // Arrange
      const event1 = new JobCompletedEvent(
        'job-1',
        'source-1',
        {
          itemsCollected: 10,
          itemsPersisted: 10,
          duplicatesDetected: 0,
          validationErrors: 0,
          duration: 1000,
        },
        new Date('2024-01-15T10:00:00Z'),
      );
      const event2 = new JobCompletedEvent(
        'job-2',
        'source-2',
        {
          itemsCollected: 20,
          itemsPersisted: 18,
          duplicatesDetected: 2,
          validationErrors: 0,
          duration: 2000,
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
      expect(firstCommand.jobOutcome).toBe('success');
      expect(firstCommand.metrics?.itemsCollected).toBe(10);

      expect(secondCommand.sourceId).toBe('source-2');
      expect(secondCommand.jobOutcome).toBe('success');
      expect(secondCommand.metrics?.itemsCollected).toBe(20);
    });
  });
});
