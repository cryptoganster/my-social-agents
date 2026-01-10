import { Test, TestingModule } from '@nestjs/testing';
import { LogHealthMetricsOnSourceUnhealthy } from '../log-health-metrics-on-source-unhealthy';
import { SourceUnhealthyEvent } from '@/ingestion/source/domain/events';

describe('LogHealthMetricsOnSourceUnhealthy', () => {
  let handler: LogHealthMetricsOnSourceUnhealthy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogHealthMetricsOnSourceUnhealthy],
    }).compile();

    handler = module.get<LogHealthMetricsOnSourceUnhealthy>(
      LogHealthMetricsOnSourceUnhealthy,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should log structured health metrics', () => {
      // Arrange
      const event = new SourceUnhealthyEvent(
        'source-123',
        75.5,
        5,
        new Date('2024-01-15T10:00:00Z'),
      );

      const loggerErrorSpy = jest.spyOn(handler['logger'], 'error');

      // Act
      handler.handle(event);

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Source unhealthy: source-123'),
      );
    });

    it('should include failure rate in log message', () => {
      // Arrange
      const event = new SourceUnhealthyEvent(
        'source-123',
        80.25,
        3,
        new Date('2024-01-15T10:00:00Z'),
      );

      const loggerErrorSpy = jest.spyOn(handler['logger'], 'error');

      // Act
      handler.handle(event);

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('failureRate=80.25%'),
      );
    });

    it('should include consecutive failures in log message', () => {
      // Arrange
      const event = new SourceUnhealthyEvent(
        'source-123',
        70.0,
        7,
        new Date('2024-01-15T10:00:00Z'),
      );

      const loggerErrorSpy = jest.spyOn(handler['logger'], 'error');

      // Act
      handler.handle(event);

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('consecutiveFailures=7'),
      );
    });

    it('should include detection timestamp in log message', () => {
      // Arrange
      const detectedAt = new Date('2024-01-15T10:00:00Z');
      const event = new SourceUnhealthyEvent('source-123', 70.0, 3, detectedAt);

      const loggerErrorSpy = jest.spyOn(handler['logger'], 'error');

      // Act
      handler.handle(event);

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('detectedAt=2024-01-15T10:00:00.000Z'),
      );
    });
  });
});
