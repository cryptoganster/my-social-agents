import * as fc from 'fast-check';
import { CircuitBreakerService } from '../circuit-breaker';
import { CircuitState } from '@/shared/interfaces';

describe('CircuitBreakerService', () => {
  describe('Unit Tests', () => {
    it('should start in CLOSED state', () => {
      const breaker = new CircuitBreakerService();
      const stats = breaker.getStats();

      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.failureCount).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.totalRejected).toBe(0);
    });

    it('should execute successful operations in CLOSED state', async () => {
      const breaker = new CircuitBreakerService();
      const operation = jest.fn().mockResolvedValue('success');

      const result = await breaker.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(breaker.getStats().state).toBe(CircuitState.CLOSED);
    });

    it('should transition to OPEN after failure threshold', async () => {
      const breaker = new CircuitBreakerService({
        failureThreshold: 3,
        failureWindowMs: 60000,
        resetTimeoutMs: 30000,
        successThreshold: 2,
      });

      const operation = jest.fn().mockRejectedValue(new Error('Failure'));

      // Execute 3 failures
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(operation);
        } catch {
          // Expected
        }
      }

      const stats = breaker.getStats();
      expect(stats.state).toBe(CircuitState.OPEN);
      expect(stats.failureCount).toBe(3);
      expect(stats.openedAt).toBeDefined();
    });

    it('should reject requests when OPEN', async () => {
      const breaker = new CircuitBreakerService({
        failureThreshold: 2,
        failureWindowMs: 60000,
        resetTimeoutMs: 30000,
        successThreshold: 2,
      });

      const operation = jest.fn().mockRejectedValue(new Error('Failure'));

      // Trigger circuit to open
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(operation);
        } catch {
          // Expected
        }
      }

      expect(breaker.getStats().state).toBe(CircuitState.OPEN);

      // Try to execute another operation
      const newOperation = jest.fn().mockResolvedValue('success');

      await expect(breaker.execute(newOperation)).rejects.toThrow(
        'Circuit breaker is OPEN',
      );

      // Operation should not have been called
      expect(newOperation).not.toHaveBeenCalled();

      // Rejected count should increase
      expect(breaker.getStats().totalRejected).toBe(1);
    });

    it('should transition to HALF_OPEN after reset timeout', async () => {
      const breaker = new CircuitBreakerService({
        failureThreshold: 2,
        failureWindowMs: 60000,
        resetTimeoutMs: 100, // Short timeout for testing
        successThreshold: 2,
      });

      const operation = jest.fn().mockRejectedValue(new Error('Failure'));

      // Trigger circuit to open
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(operation);
        } catch {
          // Expected
        }
      }

      expect(breaker.getStats().state).toBe(CircuitState.OPEN);

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Next operation should transition to HALF_OPEN
      const successOperation = jest.fn().mockResolvedValue('success');
      await breaker.execute(successOperation);

      expect(breaker.getStats().state).toBe(CircuitState.HALF_OPEN);
      expect(successOperation).toHaveBeenCalledTimes(1);
    });

    it('should transition to CLOSED after success threshold in HALF_OPEN', async () => {
      const breaker = new CircuitBreakerService({
        failureThreshold: 2,
        failureWindowMs: 60000,
        resetTimeoutMs: 100,
        successThreshold: 2,
      });

      const operation = jest.fn().mockRejectedValue(new Error('Failure'));

      // Trigger circuit to open
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(operation);
        } catch {
          // Expected
        }
      }

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Execute successful operations to reach success threshold
      const successOperation = jest.fn().mockResolvedValue('success');

      await breaker.execute(successOperation);
      expect(breaker.getStats().state).toBe(CircuitState.HALF_OPEN);

      await breaker.execute(successOperation);
      expect(breaker.getStats().state).toBe(CircuitState.CLOSED);
      expect(breaker.getStats().failureCount).toBe(0);
    });

    it('should reopen circuit on failure in HALF_OPEN state', async () => {
      const breaker = new CircuitBreakerService({
        failureThreshold: 2,
        failureWindowMs: 60000,
        resetTimeoutMs: 100,
        successThreshold: 2,
      });

      const operation = jest.fn().mockRejectedValue(new Error('Failure'));

      // Trigger circuit to open
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(operation);
        } catch {
          // Expected
        }
      }

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Execute one successful operation
      const successOperation = jest.fn().mockResolvedValue('success');
      await breaker.execute(successOperation);
      expect(breaker.getStats().state).toBe(CircuitState.HALF_OPEN);

      // Execute a failing operation
      const failOperation = jest.fn().mockRejectedValue(new Error('Failure'));
      try {
        await breaker.execute(failOperation);
      } catch {
        // Expected
      }

      // Circuit should be OPEN again
      expect(breaker.getStats().state).toBe(CircuitState.OPEN);
    });

    it('should reset circuit manually', async () => {
      const breaker = new CircuitBreakerService({
        failureThreshold: 2,
        failureWindowMs: 60000,
        resetTimeoutMs: 30000,
        successThreshold: 2,
      });

      const operation = jest.fn().mockRejectedValue(new Error('Failure'));

      // Trigger circuit to open
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(operation);
        } catch {
          // Expected
        }
      }

      expect(breaker.getStats().state).toBe(CircuitState.OPEN);

      // Manually reset
      breaker.reset();

      const stats = breaker.getStats();
      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.failureCount).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.openedAt).toBeUndefined();
    });

    it('should only count failures within time window', async () => {
      const breaker = new CircuitBreakerService({
        failureThreshold: 3,
        failureWindowMs: 200, // Short window for testing
        resetTimeoutMs: 30000,
        successThreshold: 2,
      });

      const operation = jest.fn().mockRejectedValue(new Error('Failure'));

      // First failure
      try {
        await breaker.execute(operation);
      } catch {
        // Expected
      }

      expect(breaker.getStats().failureCount).toBe(1);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 250));

      // Second failure (first one should be expired)
      try {
        await breaker.execute(operation);
      } catch {
        // Expected
      }

      // Should only count the recent failure
      expect(breaker.getStats().failureCount).toBe(1);
      expect(breaker.getStats().state).toBe(CircuitState.CLOSED);
    });

    it('should track total rejected requests', async () => {
      const breaker = new CircuitBreakerService({
        failureThreshold: 2,
        failureWindowMs: 60000,
        resetTimeoutMs: 30000,
        successThreshold: 2,
      });

      const operation = jest.fn().mockRejectedValue(new Error('Failure'));

      // Trigger circuit to open
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(operation);
        } catch {
          // Expected
        }
      }

      expect(breaker.getStats().state).toBe(CircuitState.OPEN);

      // Try multiple operations while open
      const successOperation = jest.fn().mockResolvedValue('success');

      for (let i = 0; i < 5; i++) {
        try {
          await breaker.execute(successOperation);
        } catch {
          // Expected
        }
      }

      expect(breaker.getStats().totalRejected).toBe(5);
    });
  });

  describe('Property-Based Tests', () => {
    // Feature: shared-resilience-services, Property 17: Circuit Breaker Activation
    // Validates: Requirements 6.4
    it('Property 17: Circuit opens after reaching failure threshold', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }), // failureThreshold
          fc.integer({ min: 1, max: 10 }), // number of failures to trigger
          async (failureThreshold: number, failuresToTrigger: number) => {
            const breaker = new CircuitBreakerService({
              failureThreshold,
              failureWindowMs: 60000,
              resetTimeoutMs: 30000,
              successThreshold: 2,
            });

            const operation = jest.fn().mockRejectedValue(new Error('Failure'));

            // Execute failures
            for (let i = 0; i < failuresToTrigger; i++) {
              try {
                await breaker.execute(operation);
              } catch {
                // Expected
              }
            }

            const stats = breaker.getStats();

            if (failuresToTrigger >= failureThreshold) {
              // Circuit should be OPEN
              expect(stats.state).toBe(CircuitState.OPEN);
              expect(stats.openedAt).toBeDefined();
            } else {
              // Circuit should still be CLOSED
              expect(stats.state).toBe(CircuitState.CLOSED);
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    it('Property 17: Circuit rejects all requests when OPEN', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }), // failureThreshold
          fc.integer({ min: 1, max: 10 }), // requests to reject
          async (failureThreshold: number, requestsToReject: number) => {
            const breaker = new CircuitBreakerService({
              failureThreshold,
              failureWindowMs: 60000,
              resetTimeoutMs: 30000,
              successThreshold: 2,
            });

            // Open the circuit
            const failOperation = jest
              .fn()
              .mockRejectedValue(new Error('Failure'));
            for (let i = 0; i < failureThreshold; i++) {
              try {
                await breaker.execute(failOperation);
              } catch {
                // Expected
              }
            }

            expect(breaker.getStats().state).toBe(CircuitState.OPEN);

            // Try to execute operations while open
            const successOperation = jest.fn().mockResolvedValue('success');
            let rejectedCount = 0;

            for (let i = 0; i < requestsToReject; i++) {
              try {
                await breaker.execute(successOperation);
              } catch {
                rejectedCount++;
              }
            }

            // All requests should be rejected
            expect(rejectedCount).toBe(requestsToReject);
            expect(successOperation).not.toHaveBeenCalled();
            expect(breaker.getStats().totalRejected).toBe(requestsToReject);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('Property 17: Circuit closes after success threshold in HALF_OPEN', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }), // successThreshold
          fc.integer({ min: 1, max: 10 }), // successful operations
          async (successThreshold: number, successfulOps: number) => {
            const breaker = new CircuitBreakerService({
              failureThreshold: 2,
              failureWindowMs: 60000,
              resetTimeoutMs: 50, // Short for testing
              successThreshold,
            });

            // Open the circuit
            const failOperation = jest
              .fn()
              .mockRejectedValue(new Error('Failure'));
            for (let i = 0; i < 2; i++) {
              try {
                await breaker.execute(failOperation);
              } catch {
                // Expected
              }
            }

            // Wait for reset timeout
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Execute successful operations
            const successOperation = jest.fn().mockResolvedValue('success');
            for (let i = 0; i < successfulOps; i++) {
              await breaker.execute(successOperation);
            }

            const stats = breaker.getStats();

            if (successfulOps >= successThreshold) {
              // Circuit should be CLOSED
              expect(stats.state).toBe(CircuitState.CLOSED);
              expect(stats.failureCount).toBe(0);
            } else {
              // Circuit should still be HALF_OPEN
              expect(stats.state).toBe(CircuitState.HALF_OPEN);
            }
          },
        ),
        { numRuns: 30 },
      );
    });

    it('Property 17: Any failure in HALF_OPEN reopens circuit', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }), // successes before failure (at least 1)
          async (successesBeforeFailure: number) => {
            const breaker = new CircuitBreakerService({
              failureThreshold: 2,
              failureWindowMs: 60000,
              resetTimeoutMs: 50,
              successThreshold: 10, // High threshold
            });

            // Open the circuit
            const failOperation = jest
              .fn()
              .mockRejectedValue(new Error('Failure'));
            for (let i = 0; i < 2; i++) {
              try {
                await breaker.execute(failOperation);
              } catch {
                // Expected
              }
            }

            // Wait for reset timeout
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Execute some successful operations (at least 1 to transition to HALF_OPEN)
            const successOperation = jest.fn().mockResolvedValue('success');
            for (let i = 0; i < successesBeforeFailure; i++) {
              await breaker.execute(successOperation);
            }

            expect(breaker.getStats().state).toBe(CircuitState.HALF_OPEN);

            // Execute a failing operation
            try {
              await breaker.execute(failOperation);
            } catch {
              // Expected
            }

            // Circuit should be OPEN again
            expect(breaker.getStats().state).toBe(CircuitState.OPEN);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('Property 17: Successful operations in CLOSED state do not affect circuit', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }), // number of successes
          async (numSuccesses: number) => {
            const breaker = new CircuitBreakerService({
              failureThreshold: 5,
              failureWindowMs: 60000,
              resetTimeoutMs: 30000,
              successThreshold: 2,
            });

            const operation = jest.fn().mockResolvedValue('success');

            // Execute many successful operations
            for (let i = 0; i < numSuccesses; i++) {
              await breaker.execute(operation);
            }

            const stats = breaker.getStats();

            // Circuit should remain CLOSED
            expect(stats.state).toBe(CircuitState.CLOSED);
            expect(stats.failureCount).toBe(0);
            expect(operation).toHaveBeenCalledTimes(numSuccesses);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('Property 17: Reset always returns circuit to CLOSED state', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }), // failures to trigger
          async (failures: number) => {
            const breaker = new CircuitBreakerService({
              failureThreshold: 2,
              failureWindowMs: 60000,
              resetTimeoutMs: 30000,
              successThreshold: 2,
            });

            // Execute failures
            const operation = jest.fn().mockRejectedValue(new Error('Failure'));
            for (let i = 0; i < failures; i++) {
              try {
                await breaker.execute(operation);
              } catch {
                // Expected
              }
            }

            // Reset the circuit
            breaker.reset();

            const stats = breaker.getStats();

            // Circuit should be CLOSED with clean state
            expect(stats.state).toBe(CircuitState.CLOSED);
            expect(stats.failureCount).toBe(0);
            expect(stats.successCount).toBe(0);
            expect(stats.openedAt).toBeUndefined();
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
