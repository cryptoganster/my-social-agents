import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { ContentIngestedEventHandler } from '../handler';
import { ContentIngestedEvent } from '@/ingestion/content/domain/events';
import { UpdateJobMetricsCommand } from '@/ingestion/job/app/commands/update-job-metrics';

describe('ContentIngestedEventHandler', () => {
  let handler: ContentIngestedEventHandler;
  let commandBus: jest.Mocked<CommandBus>;

  beforeEach(async () => {
    const mockCommandBus = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentIngestedEventHandler,
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
      ],
    }).compile();

    handler = module.get<ContentIngestedEventHandler>(
      ContentIngestedEventHandler,
    );
    commandBus = module.get(CommandBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should execute UpdateJobMetricsCommand when ContentIngestedEvent is received', async () => {
      // Arrange
      const event = new ContentIngestedEvent(
        'content-123',
        'source-456',
        'job-789',
        'abc123def456',
        'Normalized content text',
        {
          title: 'Test Title',
          author: 'Test Author',
          publishedAt: new Date('2024-01-15T09:00:00Z'),
          language: 'en',
          sourceUrl: 'https://example.com/article',
        },
        ['BTC', 'ETH'],
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

    it('should increment itemsPersisted by 1', async () => {
      // Arrange
      const event = new ContentIngestedEvent(
        'content-123',
        'source-456',
        'job-789',
        'abc123def456',
        'Normalized content',
        { title: 'Test' },
        ['BTC'],
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
        itemsPersisted: 1,
      });
    });

    it('should use correct jobId from event', async () => {
      // Arrange
      const event = new ContentIngestedEvent(
        'content-999',
        'source-111',
        'job-specific-id',
        'hash123',
        'Content',
        {},
        [],
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
      const event = new ContentIngestedEvent(
        'content-123',
        'source-456',
        'job-789',
        'abc123def456',
        'Content',
        {},
        ['BTC'],
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
        expect.stringContaining('Error handling ContentIngestedEvent'),
        expect.any(String),
      );
    });

    it('should handle multiple events sequentially', async () => {
      // Arrange
      const event1 = new ContentIngestedEvent(
        'content-1',
        'source-1',
        'job-1',
        'hash1',
        'Content 1',
        {},
        ['BTC'],
        new Date('2024-01-15T10:00:00Z'),
      );
      const event2 = new ContentIngestedEvent(
        'content-2',
        'source-1',
        'job-1',
        'hash2',
        'Content 2',
        {},
        ['ETH'],
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
      expect(firstCommand.metricUpdate.itemsPersisted).toBe(1);

      expect(secondCommand.jobId).toBe('job-1');
      expect(secondCommand.metricUpdate.itemsPersisted).toBe(1);
    });
  });
});
