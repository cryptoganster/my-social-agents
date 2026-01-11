import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { RecordValidationErrorInJobMetricsOnContentValidationFailed } from '../record-validation-error-in-job-metrics-on-content-validation-failed';
import { ContentValidationFailed } from '@/ingestion/content/domain/events';
import { UpdateJobMetricsCommand } from '@/ingestion/job/app/commands/update-job-metrics';

/**
 * Integration Test: RecordValidationErrorInJobMetricsOnContentValidationFailed
 *
 * Tests the event handler that records validation errors in job metrics
 * when ContentValidationFailed event is received.
 *
 * Metrics Handler: ContentValidationFailed → UpdateJobMetricsCommand (validationErrors +1)
 *
 * Requirements: 2.3, 9.2, 9.3, 9.4
 */
describe('RecordValidationErrorInJobMetricsOnContentValidationFailed - Integration Tests', () => {
  let handler: RecordValidationErrorInJobMetricsOnContentValidationFailed;
  let mockCommandBus: jest.Mocked<CommandBus>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockCommandBus = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CommandBus>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordValidationErrorInJobMetricsOnContentValidationFailed,
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
      ],
    }).compile();

    handler =
      module.get<RecordValidationErrorInJobMetricsOnContentValidationFailed>(
        RecordValidationErrorInJobMetricsOnContentValidationFailed,
      );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Error Recording', () => {
    it('should trigger UpdateJobMetricsCommand when ContentValidationFailed is received', async () => {
      // Arrange
      const validatedAt = new Date('2024-01-15T08:00:02Z');
      const event = new ContentValidationFailed(
        'job-123',
        'source-456',
        'Content that failed validation...',
        ['Content too short', 'Missing required metadata'],
        validatedAt,
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
      expect(command.jobId).toBe('job-123');
      expect(command.metricUpdate).toEqual({ validationErrors: 1 });
    });

    it('should increment validationErrors by 1 for each event', async () => {
      // Arrange
      const event = new ContentValidationFailed(
        'job-single-error',
        'source-single-error',
        'Single failing content',
        ['Single error'],
        new Date(),
      );

      // Act
      await handler.handle(event);

      // Assert
      const command = mockCommandBus.execute.mock
        .calls[0][0] as UpdateJobMetricsCommand;
      expect(command.metricUpdate.validationErrors).toBe(1);
    });

    it('should handle multiple validation failures for the same job', async () => {
      // Arrange
      const jobId = 'job-multi-errors';
      const events = [
        new ContentValidationFailed(
          jobId,
          'source-1',
          'Failing content 1',
          ['Error 1'],
          new Date(),
        ),
        new ContentValidationFailed(
          jobId,
          'source-2',
          'Failing content 2',
          ['Error 2'],
          new Date(),
        ),
        new ContentValidationFailed(
          jobId,
          'source-3',
          'Failing content 3',
          ['Error 3'],
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
        expect(command.metricUpdate.validationErrors).toBe(1);
      }
    });

    it('should handle events from different jobs', async () => {
      // Arrange
      const event1 = new ContentValidationFailed(
        'job-A',
        'source-a',
        'Failing content A',
        ['Error A'],
        new Date(),
      );

      const event2 = new ContentValidationFailed(
        'job-B',
        'source-b',
        'Failing content B',
        ['Error B'],
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

  describe('Different Validation Error Types', () => {
    it('should handle single validation error', async () => {
      // Arrange
      const event = new ContentValidationFailed(
        'job-single',
        'source-single',
        'Short content',
        ['Content too short'],
        new Date(),
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple validation errors in single event', async () => {
      // Arrange
      const event = new ContentValidationFailed(
        'job-multi-errors',
        'source-multi-errors',
        'Content with many issues',
        [
          'Content too short',
          'Missing title',
          'Invalid language',
          'No crypto mentions',
          'Low quality score',
        ],
        new Date(),
      );

      // Act
      await handler.handle(event);

      // Assert
      // Still only increments by 1 (per event, not per error)
      const command = mockCommandBus.execute.mock
        .calls[0][0] as UpdateJobMetricsCommand;
      expect(command.metricUpdate.validationErrors).toBe(1);
    });

    it('should handle empty validation errors array', async () => {
      // Arrange
      const event = new ContentValidationFailed(
        'job-empty-errors',
        'source-empty-errors',
        'Content with no specific errors',
        [], // Empty errors array
        new Date(),
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
      const command = mockCommandBus.execute.mock
        .calls[0][0] as UpdateJobMetricsCommand;
      expect(command.metricUpdate.validationErrors).toBe(1);
    });
  });

  describe('Error Isolation', () => {
    it('should not throw when command execution fails', async () => {
      // Arrange
      const event = new ContentValidationFailed(
        'job-error',
        'source-error',
        'Content for error test',
        ['Test error'],
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
      const event = new ContentValidationFailed(
        'job-log-error',
        'source-log-error',
        'Content for log error test',
        ['Log error test'],
        new Date(),
      );

      const loggerSpy = jest.spyOn(handler['logger'], 'error');
      mockCommandBus.execute.mockRejectedValue(new Error('Database error'));

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error recording validation error'),
        expect.any(String),
      );
    });

    it('should continue processing other events after error', async () => {
      // Arrange
      const event1 = new ContentValidationFailed(
        'job-fail',
        'source-fail',
        'Failing event',
        ['Fail'],
        new Date(),
      );

      const event2 = new ContentValidationFailed(
        'job-success',
        'source-success',
        'Successful event',
        ['Success'],
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
    it('should log warning message when recording validation error', async () => {
      // Arrange
      const event = new ContentValidationFailed(
        'job-warn',
        'source-warn',
        'Content for warning',
        ['Error 1', 'Error 2'],
        new Date(),
      );

      const loggerSpy = jest.spyOn(handler['logger'], 'warn');

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Recording validation error for job job-warn'),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error 1, Error 2'),
      );
    });

    it('should log debug message after successful recording', async () => {
      // Arrange
      const event = new ContentValidationFailed(
        'job-debug',
        'source-debug',
        'Content for debug',
        ['Debug error'],
        new Date(),
      );

      const loggerSpy = jest.spyOn(handler['logger'], 'debug');

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Validation error recorded for job: job-debug'),
      );
    });
  });
});
