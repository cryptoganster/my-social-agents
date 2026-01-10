import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { IncrementJobMetricsOnContentIngested } from '../increment-job-metrics-on-content-ingested';
import { ContentIngested } from '@/ingestion/content/domain/events';
import { UpdateJobMetricsCommand } from '@/ingestion/job/app/commands/update-job-metrics';

/**
 * Integration Test: IncrementJobMetricsOnContentIngested
 *
 * Tests the event handler that increments job metrics
 * when ContentIngested event is received.
 *
 * Metrics Handler: ContentIngested → UpdateJobMetricsCommand (itemsPersisted +1)
 *
 * Requirements: 2.1, 2.2, 3.5, 3.6
 */
describe('IncrementJobMetricsOnContentIngested - Integration Tests', () => {
  let handler: IncrementJobMetricsOnContentIngested;
  let mockCommandBus: jest.Mocked<CommandBus>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockCommandBus = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CommandBus>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncrementJobMetricsOnContentIngested,
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
      ],
    }).compile();

    handler = module.get<IncrementJobMetricsOnContentIngested>(
      IncrementJobMetricsOnContentIngested,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Metrics Update', () => {
    it('should trigger UpdateJobMetricsCommand when ContentIngested is received', async () => {
      // Arrange
      const collectedAt = new Date('2024-01-15T08:00:00Z');
      const persistedAt = new Date('2024-01-15T08:00:04Z');
      const event = new ContentIngested(
        'content-123',
        'source-456',
        'job-789',
        'abc123def456...',
        'Normalized content about Bitcoin',
        {
          title: 'Bitcoin News',
          author: 'John Doe',
          publishedAt: new Date('2024-01-15'),
          language: 'en',
          sourceUrl: 'https://example.com/btc',
        },
        ['BTC', 'ETH'],
        collectedAt,
        persistedAt,
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        expect.any(UpdateJobMetricsCommand),
      );

      const command = mockCommandBus.execute.mock
        .calls[0][0] as UpdateJobMetricsCommand;
      expect(command.jobId).toBe('job-789');
      expect(command.metricUpdate).toEqual({ itemsPersisted: 1 });
    });

    it('should increment itemsPersisted by 1 for each event', async () => {
      // Arrange
      const event = new ContentIngested(
        'content-single',
        'source-single',
        'job-single',
        'hash-single',
        'Single content item',
        { title: 'Single Item' },
        ['BTC'],
        new Date(),
        new Date(),
      );

      // Act
      await handler.handle(event);

      // Assert
      const command = mockCommandBus.execute.mock
        .calls[0][0] as UpdateJobMetricsCommand;
      expect(command.metricUpdate.itemsPersisted).toBe(1);
    });

    it('should handle multiple events for the same job', async () => {
      // Arrange
      const jobId = 'job-multi';
      const events = [
        new ContentIngested(
          'content-1',
          'source-1',
          jobId,
          'hash-1',
          'Content 1',
          { title: 'Item 1' },
          ['BTC'],
          new Date(),
          new Date(),
        ),
        new ContentIngested(
          'content-2',
          'source-2',
          jobId,
          'hash-2',
          'Content 2',
          { title: 'Item 2' },
          ['ETH'],
          new Date(),
          new Date(),
        ),
        new ContentIngested(
          'content-3',
          'source-3',
          jobId,
          'hash-3',
          'Content 3',
          { title: 'Item 3' },
          ['SOL'],
          new Date(),
          new Date(),
        ),
      ];

      // Act
      for (const event of events) {
        await handler.handle(event);
      }

      // Assert
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(3);

      // Each call should increment by 1
      for (let i = 0; i < 3; i++) {
        const command = mockCommandBus.execute.mock.calls[
          i
        ][0] as UpdateJobMetricsCommand;
        expect(command.jobId).toBe(jobId);
        expect(command.metricUpdate.itemsPersisted).toBe(1);
      }
    });

    it('should handle events from different jobs', async () => {
      // Arrange
      const event1 = new ContentIngested(
        'content-a',
        'source-a',
        'job-A',
        'hash-a',
        'Content A',
        { title: 'Item A' },
        ['BTC'],
        new Date(),
        new Date(),
      );

      const event2 = new ContentIngested(
        'content-b',
        'source-b',
        'job-B',
        'hash-b',
        'Content B',
        { title: 'Item B' },
        ['ETH'],
        new Date(),
        new Date(),
      );

      // Act
      await handler.handle(event1);
      await handler.handle(event2);

      // Assert
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(2);

      const command1 = mockCommandBus.execute.mock
        .calls[0][0] as UpdateJobMetricsCommand;
      expect(command1.jobId).toBe('job-A');

      const command2 = mockCommandBus.execute.mock
        .calls[1][0] as UpdateJobMetricsCommand;
      expect(command2.jobId).toBe('job-B');
    });
  });

  describe('Error Isolation', () => {
    it('should not throw when command execution fails', async () => {
      // Arrange
      const event = new ContentIngested(
        'content-error',
        'source-error',
        'job-error',
        'hash-error',
        'Content for error test',
        { title: 'Error Test' },
        [],
        new Date(),
        new Date(),
      );

      mockCommandBus.execute.mockRejectedValue(
        new Error('Metrics update failed'),
      );

      // Act & Assert - should not throw
      await expect(handler.handle(event)).resolves.not.toThrow();
    });

    it('should log error when command execution fails', async () => {
      // Arrange
      const event = new ContentIngested(
        'content-log-error',
        'source-log-error',
        'job-log-error',
        'hash-log-error',
        'Content for log error test',
        { title: 'Log Error Test' },
        [],
        new Date(),
        new Date(),
      );

      const loggerSpy = jest.spyOn(handler['logger'], 'error');
      mockCommandBus.execute.mockRejectedValue(new Error('Database error'));

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error incrementing job metrics'),
        expect.any(String),
      );
    });

    it('should continue processing other events after error', async () => {
      // Arrange
      const event1 = new ContentIngested(
        'content-fail',
        'source-fail',
        'job-fail',
        'hash-fail',
        'Failing content',
        { title: 'Fail' },
        [],
        new Date(),
        new Date(),
      );

      const event2 = new ContentIngested(
        'content-success',
        'source-success',
        'job-success',
        'hash-success',
        'Successful content',
        { title: 'Success' },
        [],
        new Date(),
        new Date(),
      );

      mockCommandBus.execute
        .mockRejectedValueOnce(new Error('First fails'))
        .mockResolvedValueOnce(undefined);

      // Act
      await handler.handle(event1);
      await handler.handle(event2);

      // Assert
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('Logging', () => {
    it('should log debug message when incrementing metrics', async () => {
      // Arrange
      const event = new ContentIngested(
        'content-log',
        'source-log',
        'job-log',
        'hash-log',
        'Content for logging',
        { title: 'Log Test' },
        ['BTC'],
        new Date(),
        new Date(),
      );

      const loggerSpy = jest.spyOn(handler['logger'], 'debug');

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Incrementing job metrics for job: job-log'),
      );
    });
  });
});
