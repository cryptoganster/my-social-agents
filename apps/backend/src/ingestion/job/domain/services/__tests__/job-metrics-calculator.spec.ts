import { JobMetricsCalculator, MetricUpdate } from '../job-metrics-calculator';
import { JobMetrics } from '@/ingestion/job/domain/value-objects/job-metrics';

describe('JobMetricsCalculator', () => {
  let calculator: JobMetricsCalculator;

  beforeEach(() => {
    calculator = new JobMetricsCalculator();
  });

  describe('calculateSuccessRate', () => {
    it('should return 100 when no items collected', () => {
      // Arrange
      const metrics = JobMetrics.empty();

      // Act
      const rate = calculator.calculateSuccessRate(metrics);

      // Assert
      expect(rate).toBe(100);
    });

    it('should return 100 when all items successful', () => {
      // Arrange
      const metrics = JobMetrics.create({
        itemsCollected: 10,
        duplicatesDetected: 0,
        errorsEncountered: 0,
        bytesProcessed: 1000,
        durationMs: 5000,
      });

      // Act
      const rate = calculator.calculateSuccessRate(metrics);

      // Assert
      expect(rate).toBe(100);
    });

    it('should return 50 when half items have errors', () => {
      // Arrange
      const metrics = JobMetrics.create({
        itemsCollected: 10,
        duplicatesDetected: 0,
        errorsEncountered: 5,
        bytesProcessed: 1000,
        durationMs: 5000,
      });

      // Act
      const rate = calculator.calculateSuccessRate(metrics);

      // Assert
      expect(rate).toBe(50);
    });

    it('should return 0 when all items have errors', () => {
      // Arrange
      const metrics = JobMetrics.create({
        itemsCollected: 10,
        duplicatesDetected: 0,
        errorsEncountered: 10,
        bytesProcessed: 1000,
        durationMs: 5000,
      });

      // Act
      const rate = calculator.calculateSuccessRate(metrics);

      // Assert
      expect(rate).toBe(0);
    });

    it('should handle fractional success rates', () => {
      // Arrange
      const metrics = JobMetrics.create({
        itemsCollected: 3,
        duplicatesDetected: 0,
        errorsEncountered: 1,
        bytesProcessed: 1000,
        durationMs: 5000,
      });

      // Act
      const rate = calculator.calculateSuccessRate(metrics);

      // Assert
      expect(rate).toBeCloseTo(66.67, 1);
    });
  });

  describe('calculateDuration', () => {
    it('should calculate duration correctly', () => {
      // Arrange
      const startedAt = new Date('2024-01-01T10:00:00Z');
      const completedAt = new Date('2024-01-01T10:05:00Z');

      // Act
      const duration = calculator.calculateDuration(startedAt, completedAt);

      // Assert
      expect(duration).toBe(5 * 60 * 1000); // 5 minutes in milliseconds
    });

    it('should return 0 for same timestamps', () => {
      // Arrange
      const timestamp = new Date('2024-01-01T10:00:00Z');

      // Act
      const duration = calculator.calculateDuration(timestamp, timestamp);

      // Assert
      expect(duration).toBe(0);
    });

    it('should throw error when completedAt is before startedAt', () => {
      // Arrange
      const startedAt = new Date('2024-01-01T10:05:00Z');
      const completedAt = new Date('2024-01-01T10:00:00Z');

      // Act & Assert
      expect(() =>
        calculator.calculateDuration(startedAt, completedAt),
      ).toThrow('Invalid duration: completedAt must be after startedAt');
    });

    it('should handle millisecond precision', () => {
      // Arrange
      const startedAt = new Date('2024-01-01T10:00:00.000Z');
      const completedAt = new Date('2024-01-01T10:00:00.500Z');

      // Act
      const duration = calculator.calculateDuration(startedAt, completedAt);

      // Assert
      expect(duration).toBe(500);
    });
  });

  describe('aggregateMetrics', () => {
    it('should aggregate empty array to zero metrics', () => {
      // Arrange
      const updates: MetricUpdate[] = [];

      // Act
      const result = calculator.aggregateMetrics(updates);

      // Assert
      expect(result.itemsCollected).toBe(0);
      expect(result.duplicatesDetected).toBe(0);
      expect(result.errorsEncountered).toBe(0);
      expect(result.bytesProcessed).toBe(0);
    });

    it('should aggregate single update', () => {
      // Arrange
      const updates: MetricUpdate[] = [
        {
          itemsCollected: 10,
          duplicatesDetected: 2,
          errorsEncountered: 1,
          bytesProcessed: 1000,
        },
      ];

      // Act
      const result = calculator.aggregateMetrics(updates);

      // Assert
      expect(result.itemsCollected).toBe(10);
      expect(result.duplicatesDetected).toBe(2);
      expect(result.errorsEncountered).toBe(1);
      expect(result.bytesProcessed).toBe(1000);
    });

    it('should aggregate multiple updates', () => {
      // Arrange
      const updates: MetricUpdate[] = [
        {
          itemsCollected: 10,
          duplicatesDetected: 2,
          errorsEncountered: 1,
          bytesProcessed: 1000,
        },
        {
          itemsCollected: 5,
          duplicatesDetected: 1,
          errorsEncountered: 0,
          bytesProcessed: 500,
        },
        {
          itemsCollected: 3,
          duplicatesDetected: 0,
          errorsEncountered: 1,
          bytesProcessed: 300,
        },
      ];

      // Act
      const result = calculator.aggregateMetrics(updates);

      // Assert
      expect(result.itemsCollected).toBe(18);
      expect(result.duplicatesDetected).toBe(3);
      expect(result.errorsEncountered).toBe(2);
      expect(result.bytesProcessed).toBe(1800);
    });

    it('should handle partial updates', () => {
      // Arrange
      const updates: MetricUpdate[] = [
        {
          itemsCollected: 10,
        },
        {
          duplicatesDetected: 2,
        },
        {
          errorsEncountered: 1,
          bytesProcessed: 500,
        },
      ];

      // Act
      const result = calculator.aggregateMetrics(updates);

      // Assert
      expect(result.itemsCollected).toBe(10);
      expect(result.duplicatesDetected).toBe(2);
      expect(result.errorsEncountered).toBe(1);
      expect(result.bytesProcessed).toBe(500);
    });

    it('should set durationMs to 0', () => {
      // Arrange
      const updates: MetricUpdate[] = [
        {
          itemsCollected: 10,
        },
      ];

      // Act
      const result = calculator.aggregateMetrics(updates);

      // Assert
      expect(result.durationMs).toBe(0);
    });
  });

  describe('calculateItemsPersisted', () => {
    it('should calculate items persisted correctly', () => {
      // Arrange
      const metrics = JobMetrics.create({
        itemsCollected: 10,
        duplicatesDetected: 2,
        errorsEncountered: 1,
        bytesProcessed: 1000,
        durationMs: 5000,
      });

      // Act
      const persisted = calculator.calculateItemsPersisted(metrics);

      // Assert
      expect(persisted).toBe(7); // 10 - 2 - 1
    });

    it('should return 0 when all items are duplicates or errors', () => {
      // Arrange
      const metrics = JobMetrics.create({
        itemsCollected: 10,
        duplicatesDetected: 5,
        errorsEncountered: 5,
        bytesProcessed: 1000,
        durationMs: 5000,
      });

      // Act
      const persisted = calculator.calculateItemsPersisted(metrics);

      // Assert
      expect(persisted).toBe(0);
    });

    it('should return all items when no duplicates or errors', () => {
      // Arrange
      const metrics = JobMetrics.create({
        itemsCollected: 10,
        duplicatesDetected: 0,
        errorsEncountered: 0,
        bytesProcessed: 1000,
        durationMs: 5000,
      });

      // Act
      const persisted = calculator.calculateItemsPersisted(metrics);

      // Assert
      expect(persisted).toBe(10);
    });
  });

  describe('calculateThroughput', () => {
    it('should calculate throughput correctly', () => {
      // Arrange
      const metrics = JobMetrics.create({
        itemsCollected: 10,
        duplicatesDetected: 0,
        errorsEncountered: 0,
        bytesProcessed: 5000,
        durationMs: 1000, // 1 second
      });

      // Act
      const throughput = calculator.calculateThroughput(metrics);

      // Assert
      expect(throughput).toBe(5000); // 5000 bytes per second
    });

    it('should return 0 when duration is 0', () => {
      // Arrange
      const metrics = JobMetrics.create({
        itemsCollected: 10,
        duplicatesDetected: 0,
        errorsEncountered: 0,
        bytesProcessed: 5000,
        durationMs: 0,
      });

      // Act
      const throughput = calculator.calculateThroughput(metrics);

      // Assert
      expect(throughput).toBe(0);
    });

    it('should handle fractional throughput', () => {
      // Arrange
      const metrics = JobMetrics.create({
        itemsCollected: 10,
        duplicatesDetected: 0,
        errorsEncountered: 0,
        bytesProcessed: 1500,
        durationMs: 2000, // 2 seconds
      });

      // Act
      const throughput = calculator.calculateThroughput(metrics);

      // Assert
      expect(throughput).toBe(750); // 750 bytes per second
    });
  });
});
