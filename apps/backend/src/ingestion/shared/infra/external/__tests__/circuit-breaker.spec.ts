import * as fc from 'fast-check';
import { CircuitBreakerService } from '../circuit-breaker';
import { CircuitState } from '@/ingestion/shared/interfaces/external';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;

  beforeEach(() => {
    service = new CircuitBreakerService({
      failureThreshold: 3,
      failureWindowMs: 1000,
      resetTimeoutMs: 100,
      successThreshold: 2,
    });
  });

  describe('Unit Tests', () => {
    it('should start in CLOSED state', () => {
      const stats = service.getStats();

      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.failureCount).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.totalRejected).toBe(0);
    });

    it('should allow successful operations in CLOSED state', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await service.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);

      const stats = service.getStats();
      expect(stats.state).toBe(CircuitState.CLOSED);
    });

    it('should open circuit after failure threshold', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('fail'));

      // Fail 3 times (threshold)
      for (let i = 0; i < 3; i++) {
        await expect(service.execute(operation)).rejects.toThrow('fail');
      }

      const stats = service.getStats();
      expect(stats.state).toBe(CircuitState.OPEN);
      expect(stats.failureCount).toBe(3);
      expect(stats.openedAt).toBeInstanceOf(Date);
    });

    it('should reject requests when circuit is OPEN', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('fail'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(service.execute(operation)).rejects.toThrow();
      }

      // Try to execute - should be rejected without calling operation
      await expect(service.execute(operation)).rejects.toThrow(
        'Circuit breaker is OPEN',
      );

      // Operation should not have been called the 4th time
      expect(operation).toHaveBeenCalledTimes(3);

      const stats = service.getStats();
      expect(stats.totalRejected).toBe(1);
    });

    it('should transition to HALF_OPEN after reset timeout', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('fail'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(service.execute(operation)).rejects.toThrow();
      }

      expect(service.getStats().state).toBe(CircuitState.OPEN);

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Next request should transition to HALF_OPEN
      operation.mockResolvedValue('success');
      await service.execute(operation);

      const stats = service.getStats();
      expect(stats.state).toBe(CircuitState.HALF_OPEN);
      expect(stats.successCount).toBe(1);
    });

    it('should close circuit after success threshold in HALF_OPEN', async () => {
      const operation = jest.fn();

      // Open the circuit
      operation.mockRejectedValue(new Error('fail'));
      for (let i = 0; i < 3; i++) {
        await expect(service.execute(operation)).rejects.toThrow();
      }

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Succeed twice (success threshold)
      operation.mockResolvedValue('success');
      await service.execute(operation); // HALF_OPEN, success 1
      await service.execute(operation); // HALF_OPEN, success 2 → CLOSED

      const stats = service.getStats();
      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.failureCount).toBe(0);
    });

    it('should reopen circuit on failure in HALF_OPEN state', async () => {
      const operation = jest.fn();

      // Open the circuit
      operation.mockRejectedValue(new Error('fail'));
      for (let i = 0; i < 3; i++) {
        await expect(service.execute(operation)).rejects.toThrow();
      }

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Fail in HALF_OPEN state
      await expect(service.execute(operation)).rejects.toThrow();

      const stats = service.getStats();
      expect(stats.state).toBe(CircuitState.OPEN);
    });

    it('should manually reset circuit', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('fail'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(service.execute(operation)).rejects.toThrow();
      }

      expect(service.getStats().state).toBe(CircuitState.OPEN);

      // Manual reset
      service.reset();

      const stats = service.getStats();
      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.failureCount).toBe(0);
      expect(stats.openedAt).toBeUndefined();
    });

    it('should clean up old failures outside window', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('fail'));

      // Fail twice
      await expect(service.execute(operation)).rejects.toThrow();
      await expect(service.execute(operation)).rejects.toThrow();

      expect(service.getStats().failureCount).toBe(2);

      // Wait for failure window to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Fail once more - old failures should be cleaned up
      await expect(service.execute(operation)).rejects.toThrow();

      const stats = service.getStats();
      expect(stats.failureCount).toBe(1); // Only the recent failure
      expect(stats.state).toBe(CircuitState.CLOSED); // Not enough to open
    });
  });

  describe('Property-Based Tests', () => {
    // Feature: content-ingestion, Property 17: Circuit Breaker Activation
    // Validates: Requirements 6.4
    it('Property 17: Circuit Breaker - opens after failure threshold', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }), // failureThreshold
          async (failureThreshold) => {
            const cb = new CircuitBreakerService({
              failureThreshold,
              failureWindowMs: 10000,
              resetTimeoutMs: 1000,
              successThreshold: 2,
            });

            const operation = jest.fn().mockRejectedValue(new Error('fail'));

            // Fail exactly threshold times
            for (let i = 0; i < failureThreshold; i++) {
              await expect(cb.execute(operation)).rejects.toThrow();
            }

            // Circuit should be open
            const stats = cb.getStats();
            expect(stats.state).toBe(CircuitState.OPEN);
            expect(stats.failureCount).toBe(failureThreshold);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('Property 17: Circuit Breaker - rejects requests when open', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }), // failureThreshold
          fc.integer({ min: 1, max: 10 }), // rejectedRequests
          async (failureThreshold, rejectedRequests) => {
            const cb = new CircuitBreakerService({
              failureThreshold,
              failureWindowMs: 10000,
              resetTimeoutMs: 10000, // Long timeout to keep circuit open
              successThreshold: 2,
            });

            const operation = jest.fn().mockRejectedValue(new Error('fail'));

            // Open the circuit
            for (let i = 0; i < failureThreshold; i++) {
              await expect(cb.execute(operation)).rejects.toThrow();
            }

            // Try to execute more requests - should be rejected
            for (let i = 0; i < rejectedRequests; i++) {
              await expect(cb.execute(operation)).rejects.toThrow(
                'Circuit breaker is OPEN',
              );
            }

            const stats = cb.getStats();
            expect(stats.totalRejected).toBe(rejectedRequests);
            expect(operation).toHaveBeenCalledTimes(failureThreshold); // Not called for rejected requests
          },
        ),
        { numRuns: 50 },
      );
    });

    it('Property 17: Circuit Breaker - closes after success threshold in half-open', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }), // failureThreshold
          fc.integer({ min: 1, max: 5 }), // successThreshold
          async (failureThreshold, successThreshold) => {
            const cb = new CircuitBreakerService({
              failureThreshold,
              failureWindowMs: 10000,
              resetTimeoutMs: 10, // Short timeout for quick transition
              successThreshold,
            });

            const operation = jest.fn();

            // Open the circuit
            operation.mockRejectedValue(new Error('fail'));
            for (let i = 0; i < failureThreshold; i++) {
              await expect(cb.execute(operation)).rejects.toThrow();
            }

            // Wait for reset timeout
            await new Promise<void>((resolve) => setTimeout(resolve, 50));

            // Succeed exactly successThreshold times
            operation.mockResolvedValue('success');
            for (let i = 0; i < successThreshold; i++) {
              await cb.execute(operation);
            }

            // Circuit should be closed
            const stats = cb.getStats();
            expect(stats.state).toBe(CircuitState.CLOSED);
            expect(stats.failureCount).toBe(0);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('Property 17: Circuit Breaker - reopens on failure in half-open', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }), // failureThreshold
          async (failureThreshold) => {
            const cb = new CircuitBreakerService({
              failureThreshold,
              failureWindowMs: 10000,
              resetTimeoutMs: 10,
              successThreshold: 2,
            });

            const operation = jest.fn();

            // Open the circuit
            operation.mockRejectedValue(new Error('fail'));
            for (let i = 0; i < failureThreshold; i++) {
              await expect(cb.execute(operation)).rejects.toThrow();
            }

            // Wait for reset timeout
            await new Promise<void>((resolve) => setTimeout(resolve, 50));

            // Fail in HALF_OPEN state
            await expect(cb.execute(operation)).rejects.toThrow();

            // Circuit should be open again
            const stats = cb.getStats();
            expect(stats.state).toBe(CircuitState.OPEN);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('Property 17: Circuit Breaker - successful operations never open circuit', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }), // number of successful operations
          async (numOperations) => {
            const cb = new CircuitBreakerService({
              failureThreshold: 5,
              failureWindowMs: 10000,
              resetTimeoutMs: 1000,
              successThreshold: 2,
            });

            const operation = jest.fn().mockResolvedValue('success');

            // Execute many successful operations
            for (let i = 0; i < numOperations; i++) {
              await cb.execute(operation);
            }

            // Circuit should remain closed
            const stats = cb.getStats();
            expect(stats.state).toBe(CircuitState.CLOSED);
            expect(stats.failureCount).toBe(0);
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
