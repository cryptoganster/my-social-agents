import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { StartJobOnJobScheduled } from '../start-job-on-job-scheduled';
import { JobScheduled } from '@/ingestion/job/domain/events';
import { StartJobCommand } from '@/ingestion/job/app/commands/start-job';

describe('StartJobOnJobScheduled', () => {
  let handler: StartJobOnJobScheduled;
  let commandBus: jest.Mocked<CommandBus>;

  beforeEach(async () => {
    const mockCommandBus = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StartJobOnJobScheduled,
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
      ],
    }).compile();

    handler = module.get<StartJobOnJobScheduled>(StartJobOnJobScheduled);
    commandBus = module.get(CommandBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should execute StartJobCommand when JobScheduled is received', async () => {
      // Arrange
      const event = new JobScheduled(
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
        expect.any(StartJobCommand),
      );

      const executedCommand = commandBus.execute.mock
        .calls[0][0] as StartJobCommand;
      expect(executedCommand.jobId).toBe('job-123');
    });

    it('should log error and continue if command execution fails', async () => {
      // Arrange
      const event = new JobScheduled(
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
        expect.stringContaining('Error handling JobScheduled'),
        expect.any(String),
      );
    });

    it('should handle multiple events sequentially', async () => {
      // Arrange
      const event1 = new JobScheduled(
        'job-1',
        'source-1',
        new Date('2024-01-15T10:00:00Z'),
      );
      const event2 = new JobScheduled(
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
        .calls[0][0] as StartJobCommand;
      const secondCommand = commandBus.execute.mock
        .calls[1][0] as StartJobCommand;

      expect(firstCommand.jobId).toBe('job-1');
      expect(secondCommand.jobId).toBe('job-2');
    });
  });
});
