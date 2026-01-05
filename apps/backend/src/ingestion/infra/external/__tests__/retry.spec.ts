import * as fc from 'fast-check';
import { RetryService } from '../retry';

describe('RetryService', () => {
  let service: RetryService;

  beforeEach(() => {
    service = new RetryService();
  });

  describe('Unit Tests', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await service.execute(operation);

      expect(result.success).toBe(true);
      expect(result.value).toBe('success');
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const result = await service.execute(operation, {
        maxAttempts: 5,
        initialDelayMs: 10,
        useJitter: false,
      });

      expect(result.success).toBe(true);
      expect(result.value).toBe('success');
      expect(result.attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'));

      const result = await service.execute(operation, {
        maxAttempts: 3,
        initialDelayMs: 10,
        useJitter: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Always fails');
      expect(result.attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should calculate exponential backoff correctly', () => {
      const options = {
        initialDelayMs: 1000,
        backoffMultiplier: 2,
        maxDelayMs: 60000,
        useJitter: false,
      };

      expect(service.calculateDelay(0, options)).toBe(1000); // 1000 * 2^0
      expect(service.calculateDelay(1, options)).toBe(2000); // 1000 * 2^1
      expect(service.calculateDelay(2, options)).toBe(4000); // 1000 * 2^2
      expect(service.calculateDelay(3, options)).toBe(8000); // 1000 * 2^3
      expect(service.calculateDelay(4, options)).toBe(16000); // 1000 * 2^4
    });

    it('should cap delay at maxDelayMs', () => {
      const options = {
        initialDelayMs: 1000,
        backoffMultiplier: 2,
        maxDelayMs: 5000,
        useJitter: false,
      };

      expect(service.calculateDelay(0, options)).toBe(1000);
      expect(service.calculateDelay(1, options)).toBe(2000);
      expect(service.calculateDelay(2, options)).toBe(4000);
      expect(service.calculateDelay(3, options)).toBe(5000); // Capped
      expect(service.calculateDelay(4, options)).toBe(5000); // Capped
    });

    it('should add jitter when enabled', () => {
      const options = {
        initialDelayMs: 1000,
        backoffMultiplier: 2,
        maxDelayMs: 60000,
        useJitter: true,
      };

      // With jitter, delay should be between 0 and calculated delay
      const delay1 = service.calculateDelay(0, options);
      expect(delay1).toBeGreaterThanOrEqual(0);
      expect(delay1).toBeLessThanOrEqual(1000);

      const delay2 = service.calculateDelay(1, options);
      expect(delay2).toBeGreaterThanOrEqual(0);
      expect(delay2).toBeLessThanOrEqual(2000);
    });

    it('should track total time spent', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValue('success');

      const result = await service.execute(operation, {
        maxAttempts: 3,
        initialDelayMs: 50,
        useJitter: false,
      });

      expect(result.success).toBe(true);
      expect(result.totalTimeMs).toBeGreaterThan(50); // At least one retry delay
    });

    it('should use default options when not provided', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await service.execute(operation);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(1);
    });

    it('should handle non-Error exceptions', async () => {
      const operation = jest.fn().mockRejectedValue('string error');

      const result = await service.execute(operation, {
        maxAttempts: 2,
        initialDelayMs: 10,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('string error');
    });
  });

  describe('Property-Based Tests', () => {
    // Feature: content-ingestion, Property 15: Exponential Backoff Retry
    // Validates: Requirements 6.1, 10.3
    it('Property 15: Exponential Backoff - delays increase exponentially', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 5000 }), // initialDelayMs
          fc.integer({ min: 2, max: 5 }), // backoffMultiplier
          fc.integer({ min: 0, max: 10 }), // attempt
          (initialDelayMs, backoffMultiplier, attempt) => {
            const expectedDelay =
              initialDelayMs * Math.pow(backoffMultiplier, attempt);

            const options = {
              initialDelayMs,
              backoffMultiplier,
              maxDelayMs: expectedDelay * 10, // High enough to not interfere
              useJitter: false,
            };

            const delay = service.calculateDelay(attempt, options);

            expect(delay).toBe(expectedDelay);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('Property 15: Exponential Backoff - delay never exceeds maxDelayMs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 5000 }), // initialDelayMs
          fc.integer({ min: 2, max: 5 }), // backoffMultiplier
          fc.integer({ min: 1000, max: 10000 }), // maxDelayMs
          fc.integer({ min: 0, max: 20 }), // attempt
          (initialDelayMs, backoffMultiplier, maxDelayMs, attempt) => {
            const options = {
              initialDelayMs,
              backoffMultiplier,
              maxDelayMs,
              useJitter: false,
            };

            const delay = service.calculateDelay(attempt, options);

            expect(delay).toBeLessThanOrEqual(maxDelayMs);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('Property 15: Exponential Backoff - jitter produces values in valid range', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 5000 }), // initialDelayMs
          fc.integer({ min: 2, max: 5 }), // backoffMultiplier
          fc.integer({ min: 0, max: 10 }), // attempt
          (initialDelayMs, backoffMultiplier, attempt) => {
            const options = {
              initialDelayMs,
              backoffMultiplier,
              maxDelayMs: 1000000,
              useJitter: true,
            };

            const delay = service.calculateDelay(attempt, options);
            const maxPossibleDelay = Math.min(
              initialDelayMs * Math.pow(backoffMultiplier, attempt),
              options.maxDelayMs,
            );

            expect(delay).toBeGreaterThanOrEqual(0);
            expect(delay).toBeLessThanOrEqual(maxPossibleDelay);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('Property 15: Exponential Backoff - successful operations always return success', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.anything(), // return value
          fc.integer({ min: 1, max: 10 }), // maxAttempts
          async (returnValue: unknown, maxAttempts: number) => {
            const operation = jest.fn().mockResolvedValue(returnValue);

            const result = await service.execute(operation, {
              maxAttempts,
              initialDelayMs: 1,
              useJitter: false,
            });

            expect(result.success).toBe(true);
            expect(result.value).toBe(returnValue);
            expect(result.attempts).toBe(1);
            expect(operation).toHaveBeenCalledTimes(1);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('Property 15: Exponential Backoff - operations that always fail exhaust retries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string(), // error message
          fc.integer({ min: 1, max: 5 }), // maxAttempts
          async (errorMessage: string, maxAttempts: number) => {
            const operation = jest
              .fn()
              .mockRejectedValue(new Error(errorMessage));

            const result = await service.execute(operation, {
              maxAttempts,
              initialDelayMs: 1,
              useJitter: false,
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeInstanceOf(Error);
            expect(result.error?.message).toBe(errorMessage);
            expect(result.attempts).toBe(maxAttempts);
            expect(operation).toHaveBeenCalledTimes(maxAttempts);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('Property 15: Exponential Backoff - eventual success uses correct number of attempts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }), // failures before success
          fc.integer({ min: 1, max: 10 }), // maxAttempts
          async (failuresBeforeSuccess: number, maxAttempts: number) => {
            // Skip if we don't have enough attempts
            if (failuresBeforeSuccess >= maxAttempts) {
              return;
            }

            const operation = jest.fn();

            // Add failures
            for (let i = 0; i < failuresBeforeSuccess; i++) {
              operation.mockRejectedValueOnce(new Error(`Fail ${i}`));
            }

            // Then success
            operation.mockResolvedValue('success');

            const result = await service.execute(operation, {
              maxAttempts,
              initialDelayMs: 1,
              useJitter: false,
            });

            expect(result.success).toBe(true);
            expect(result.value).toBe('success');
            expect(result.attempts).toBe(failuresBeforeSuccess + 1);
            expect(operation).toHaveBeenCalledTimes(failuresBeforeSuccess + 1);
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
