import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { JobScheduledEventHandler } from '../handler';
import { JobScheduledEvent } from '@/ingestion/job/domain/events';
import { ExecuteIngestionJobCommand } from '@/ingestion/job/app/commands/execute-job';

describe('JobScheduledEventHandler', () => {
  let handler: JobScheduledEventHandler;
  let commandBus: jest.Mocked<CommandBus>;

  beforeEach(async () => {
    const mockCommandBus = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobScheduledEventHandler,
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
      ],
    }).compile();

    handler = module.get<JobScheduledEventHandler>(JobScheduledEventHandler);
    commandBus = module.get(CommandBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should execute ExecuteJobCommand when JobScheduledEvent is received', async () => {
      // Arrange
      const event = new JobScheduledEvent(
        'job-123',
        'source-456',
        new Date('2024-01-15T10:00:00Z'),
      );

      commandBus.execute.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(ExecuteIngestionJobCommand),
      );

      const executedCommand = commandBus.execute.mock
        .calls[0][0] as ExecuteIngestionJobCommand;
      expect(executedCommand.jobId).toBe('job-123');
    });

    it('should log error and continue if command execution fails', async () => {
      // Arrange
      const event = new JobScheduledEvent(
        'job-123',
        'source-456',
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
        expect.stringContaining('Error handling JobScheduledEvent'),
        expect.any(String),
      );
    });

    it('should handle multiple events sequentially', async () => {
      // Arrange
      const event1 = new JobScheduledEvent(
        'job-1',
        'source-1',
        new Date('2024-01-15T10:00:00Z'),
      );
      const event2 = new JobScheduledEvent(
        'job-2',
        'source-2',
        new Date('2024-01-15T11:00:00Z'),
      );

      commandBus.execute.mockResolvedValue(undefined);

      // Act
      await handler.handle(event1);
      await handler.handle(event2);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledTimes(2);

      const firstCommand = commandBus.execute.mock
        .calls[0][0] as ExecuteIngestionJobCommand;
      const secondCommand = commandBus.execute.mock
        .calls[1][0] as ExecuteIngestionJobCommand;

      expect(firstCommand.jobId).toBe('job-1');
      expect(secondCommand.jobId).toBe('job-2');
    });
  });
});
