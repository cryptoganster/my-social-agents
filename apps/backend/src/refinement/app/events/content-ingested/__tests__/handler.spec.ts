import { CommandBus } from '@nestjs/cqrs';
import { TriggerRefinementOnContentIngested } from '../handler';
import { ContentIngested } from '@/ingestion/content/domain/events/content-ingested';
import { RefineContentCommand } from '@refinement/app/commands/refine-content/command';
import { RefinementConfig } from '@refinement/domain/value-objects/refinement-config';

describe('TriggerRefinementOnContentIngested', () => {
  let handler: TriggerRefinementOnContentIngested;
  let mockCommandBus: jest.Mocked<CommandBus>;

  beforeEach(async () => {
    // Create mock CommandBus
    mockCommandBus = {
      execute: jest.fn(),
    } as any;

    // Create handler with mocked dependencies
    handler = new TriggerRefinementOnContentIngested(mockCommandBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should trigger RefineContentCommand when event is received', async () => {
      // Arrange
      const event = new ContentIngested(
        'content-123',
        'source-456',
        'job-789',
        'abc123def456',
        'Normalized content text',
        { title: 'Test Article' },
        ['BTC', 'ETH'],
        new Date('2025-01-09T10:00:00Z'),
        new Date('2025-01-09T10:00:01Z'),
      );

      mockCommandBus.execute.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        expect.any(RefineContentCommand),
      );

      const command = mockCommandBus.execute.mock
        .calls[0][0] as RefineContentCommand;
      expect(command.contentItemId).toBe('content-123');
      expect(command.config).toBeInstanceOf(RefinementConfig);
    });

    it('should use default RefinementConfig', async () => {
      // Arrange
      const event = new ContentIngested(
        'content-123',
        'source-456',
        'job-789',
        'abc123def456',
        'Content',
        {},
        ['BTC'],
        new Date(),
        new Date(),
      );

      mockCommandBus.execute.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      const command = mockCommandBus.execute.mock
        .calls[0][0] as RefineContentCommand;
      expect(command.config).toBeInstanceOf(RefinementConfig);
      expect(command.config).toBeDefined();
      if (command.config) {
        expect(command.config.chunkSize).toBe(800);
        expect(command.config.chunkOverlap).toBe(150);
        expect(command.config.qualityThreshold).toBe(0.3);
      }
    });

    it('should handle errors gracefully without rethrowing', async () => {
      // Arrange
      const event = new ContentIngested(
        'content-123',
        'source-456',
        'job-789',
        'abc123def456',
        'Content',
        {},
        ['BTC'],
        new Date(),
        new Date(),
      );

      const error = new Error('Command execution failed');
      mockCommandBus.execute.mockRejectedValue(error);

      // Act & Assert - Should not throw
      await expect(handler.handle(event)).resolves.not.toThrow();

      // Verify command was attempted
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
    });

    it('should handle non-Error exceptions gracefully', async () => {
      // Arrange
      const event = new ContentIngested(
        'content-123',
        'source-456',
        'job-789',
        'abc123def456',
        'Content',
        {},
        ['BTC'],
        new Date(),
        new Date(),
      );

      mockCommandBus.execute.mockRejectedValue('String error');

      // Act & Assert - Should not throw
      await expect(handler.handle(event)).resolves.not.toThrow();

      // Verify command was attempted
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
    });

    it('should log debug message when processing event', async () => {
      // Arrange
      const event = new ContentIngested(
        'content-123',
        'source-456',
        'job-789',
        'abc123def456',
        'Content',
        {},
        ['BTC'],
        new Date(),
        new Date(),
      );

      mockCommandBus.execute.mockResolvedValue(undefined);

      // Spy on logger
      const loggerDebugSpy = jest.spyOn(handler['logger'], 'debug');

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        'Processing ContentIngested: content-123',
      );
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        'Refinement triggered for content: content-123',
      );
    });

    it('should log error message when command fails', async () => {
      // Arrange
      const event = new ContentIngested(
        'content-123',
        'source-456',
        'job-789',
        'abc123def456',
        'Content',
        {},
        ['BTC'],
        new Date(),
        new Date(),
      );

      const error = new Error('Command failed');
      mockCommandBus.execute.mockRejectedValue(error);

      // Spy on logger
      const loggerErrorSpy = jest.spyOn(handler['logger'], 'error');

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error processing ContentIngested for content-123: Command failed',
        error.stack,
      );
    });

    it('should handle multiple events sequentially', async () => {
      // Arrange
      const event1 = new ContentIngested(
        'content-1',
        'source-1',
        'job-1',
        'hash-1',
        'Content 1',
        {},
        ['BTC'],
        new Date(),
        new Date(),
      );
      const event2 = new ContentIngested(
        'content-2',
        'source-2',
        'job-2',
        'hash-2',
        'Content 2',
        {},
        ['ETH'],
        new Date(),
        new Date(),
      );
      const event3 = new ContentIngested(
        'content-3',
        'source-3',
        'job-3',
        'hash-3',
        'Content 3',
        {},
        ['SOL'],
        new Date(),
        new Date(),
      );

      mockCommandBus.execute.mockResolvedValue(undefined);

      // Act
      await handler.handle(event1);
      await handler.handle(event2);
      await handler.handle(event3);

      // Assert
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(3);

      const commands = mockCommandBus.execute.mock.calls.map(
        (call) => call[0] as RefineContentCommand,
      );
      expect(commands[0].contentItemId).toBe('content-1');
      expect(commands[1].contentItemId).toBe('content-2');
      expect(commands[2].contentItemId).toBe('content-3');
    });

    it('should continue processing after one event fails', async () => {
      // Arrange
      const event1 = new ContentIngested(
        'content-1',
        'source-1',
        'job-1',
        'hash-1',
        'Content 1',
        {},
        ['BTC'],
        new Date(),
        new Date(),
      );
      const event2 = new ContentIngested(
        'content-2',
        'source-2',
        'job-2',
        'hash-2',
        'Content 2',
        {},
        ['ETH'],
        new Date(),
        new Date(),
      );

      mockCommandBus.execute
        .mockRejectedValueOnce(new Error('First failed'))
        .mockResolvedValueOnce(undefined);

      // Act
      await handler.handle(event1); // Should not throw
      await handler.handle(event2); // Should succeed

      // Assert
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('error isolation', () => {
    it('should implement error isolation pattern', async () => {
      // Arrange
      const event = new ContentIngested(
        'content-123',
        'source-456',
        'job-789',
        'abc123def456',
        'Content',
        {},
        ['BTC'],
        new Date(),
        new Date(),
      );

      mockCommandBus.execute.mockRejectedValue(new Error('Fatal error'));

      // Act - Error should be caught and logged, not rethrown
      let errorThrown = false;
      try {
        await handler.handle(event);
      } catch (error) {
        errorThrown = true;
      }

      // Assert
      expect(errorThrown).toBe(false);
    });
  });

  describe('minimal dependencies', () => {
    it('should only depend on CommandBus', () => {
      // Arrange & Act
      const handler = new TriggerRefinementOnContentIngested(mockCommandBus);

      // Assert - Handler should only have CommandBus as dependency
      expect(handler['commandBus']).toBe(mockCommandBus);
    });
  });
});
