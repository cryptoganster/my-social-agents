/**
 * Integration Test Helpers
 *
 * Utilities for handling common integration test scenarios:
 * - Event synchronization
 * - Retry logic for concurrency conflicts
 * - Async operation waiting
 * - Deterministic test execution for event-driven architecture
 *
 * Key Principles for Robust Async Tests:
 * 1. Use event-based waiting instead of fixed timeouts
 * 2. Implement exponential backoff for retries
 * 3. Use deterministic conditions instead of time-based polling
 * 4. Isolate test state between runs
 */

import { CommandBus, QueryBus, EventBus } from '@nestjs/cqrs';

/**
 * Waits for events to be processed
 * Useful after publishing events to ensure handlers have completed
 */
export async function waitForEvents(ms: number = 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executes a command with retry logic for concurrency conflicts
 * Automatically retries on optimistic locking failures
 */
export async function executeWithRetry<TResult>(
  commandBus: CommandBus,
  command: any,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {},
): Promise<TResult> {
  const { maxRetries = 3, retryDelay = 100, onRetry } = options;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await commandBus.execute(command);
    } catch (error) {
      lastError = error as Error;

      // Check if it's a concurrency error
      const isConcurrencyError =
        error instanceof Error &&
        (error.message.includes('was modified by another transaction') ||
          error.message.includes('ConcurrencyException') ||
          error.message.includes('version mismatch'));

      if (!isConcurrencyError || attempt === maxRetries) {
        throw error;
      }

      // Notify about retry
      if (onRetry) {
        onRetry(attempt, error);
      }

      // Wait before retrying with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
    }
  }

  throw lastError || new Error('Command execution failed');
}

/**
 * Executes a query with retry logic
 * Useful for eventually consistent read models
 */
export async function queryWithRetry<TResult>(
  queryBus: QueryBus,
  query: any,
  predicate: (result: TResult | null) => boolean,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    timeout?: number;
  } = {},
): Promise<TResult | null> {
  const { maxRetries = 10, retryDelay = 100, timeout = 5000 } = options;
  const startTime = Date.now();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Check timeout
    if (Date.now() - startTime > timeout) {
      throw new Error(
        `Query timeout after ${timeout}ms. Predicate never satisfied.`,
      );
    }

    try {
      const result = (await queryBus.execute(query)) as TResult | null;

      if (predicate(result)) {
        return result;
      }

      // Wait before retrying
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    } catch (error) {
      // If it's the last attempt, throw
      if (attempt === maxRetries) {
        throw error;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  return null;
}

/**
 * Polls a query until a condition is met
 * Useful for waiting for async operations to complete
 *
 * Uses exponential backoff to reduce flakiness and improve performance:
 * - Starts with short intervals for fast operations
 * - Increases interval for slower operations
 * - Caps at maxInterval to prevent excessive waiting
 */
export async function pollUntil<TResult>(
  queryBus: QueryBus,
  query: any,
  condition: (result: TResult | null) => boolean,
  options: {
    interval?: number;
    maxInterval?: number;
    timeout?: number;
    errorMessage?: string;
    backoffMultiplier?: number;
  } = {},
): Promise<TResult | null> {
  const {
    interval = 50, // Start with shorter interval
    maxInterval = 500, // Cap interval growth
    timeout = 10000, // Increased default timeout
    errorMessage,
    backoffMultiplier = 1.5, // Exponential backoff
  } = options;
  const startTime = Date.now();
  let currentInterval = interval;
  let lastResult: TResult | null = null;

  while (Date.now() - startTime < timeout) {
    try {
      lastResult = (await queryBus.execute(query)) as TResult | null;

      if (condition(lastResult)) {
        return lastResult;
      }
    } catch (error) {
      // Log but continue polling - transient errors are expected
      if (Date.now() - startTime > timeout * 0.8) {
        // Only log near timeout to reduce noise
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.warn(`Poll query error (near timeout): ${errorMessage}`);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, currentInterval));
    // Exponential backoff with cap
    currentInterval = Math.min(
      currentInterval * backoffMultiplier,
      maxInterval,
    );
  }

  // Provide detailed error message for debugging
  const elapsed = Date.now() - startTime;
  const lastResultStr = lastResult
    ? JSON.stringify(lastResult, null, 2).substring(0, 500)
    : 'null';
  throw new Error(
    errorMessage ||
      `Timeout after ${elapsed}ms waiting for condition to be met. Last result: ${lastResultStr}`,
  );
}

/**
 * Executes multiple commands sequentially with retry logic
 * Ensures commands are executed one at a time to avoid concurrency conflicts
 */
export async function executeSequentially<TResult>(
  commandBus: CommandBus,
  commands: any[],
  options: {
    maxRetries?: number;
    retryDelay?: number;
    waitBetween?: number;
  } = {},
): Promise<TResult[]> {
  const { waitBetween = 100 } = options;
  const results: TResult[] = [];

  for (const command of commands) {
    const result = await executeWithRetry<TResult>(
      commandBus,
      command,
      options,
    );
    results.push(result);

    // Wait between commands to avoid race conditions
    if (waitBetween > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitBetween));
    }
  }

  return results;
}

/**
 * Waits for a specific number of events to be processed
 * Useful when you know how many events should be published
 */
export async function waitForEventCount(
  expectedCount: number,
  checkFn: () => Promise<number>,
  options: {
    interval?: number;
    timeout?: number;
  } = {},
): Promise<void> {
  const { interval = 100, timeout = 5000 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const currentCount = await checkFn();

    if (currentCount >= expectedCount) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(
    `Timeout after ${timeout}ms waiting for ${expectedCount} events`,
  );
}

/**
 * Creates a fresh job for testing
 * Ensures each test gets a new job to avoid state conflicts
 */
export function createFreshJobId(): string {
  return `test-job-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Creates a fresh source ID for testing
 */
export function createFreshSourceId(): string {
  return `test-source-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Retries an async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    shouldRetry?: (error: Error) => boolean;
  } = {},
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 100,
    maxDelay = 2000,
    backoffMultiplier = 2,
    shouldRetry = () => true,
  } = options;

  let lastError: Error | undefined;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries || !shouldRetry(error as Error)) {
        throw error;
      }

      // Wait with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError || new Error('Operation failed');
}

/**
 * Checks if an error is a concurrency conflict
 */
export function isConcurrencyError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes('was modified by another transaction') ||
      error.message.includes('ConcurrencyException') ||
      error.message.includes('version mismatch') ||
      error.message.includes('optimistic lock'))
  );
}

/**
 * Checks if an error is a state transition error
 */
export function isStateTransitionError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes('Cannot start job in') ||
      error.message.includes('Cannot fail job in') ||
      error.message.includes('Cannot complete job in'))
  );
}

/**
 * Waits for a job to reach a terminal state (COMPLETED or FAILED)
 * Uses exponential backoff and provides detailed error information
 *
 * This is the recommended way to wait for job completion in tests
 * as it handles the event-driven nature of job execution.
 */
export async function waitForJobCompletion<TResult extends { status: string }>(
  queryBus: QueryBus,
  query: unknown,
  options: {
    timeout?: number;
    initialInterval?: number;
    maxInterval?: number;
  } = {},
): Promise<TResult> {
  const { timeout = 15000, initialInterval = 50, maxInterval = 500 } = options;

  const result = await pollUntil<TResult>(
    queryBus,
    query,
    (job: TResult | null): boolean =>
      job !== null && ['COMPLETED', 'FAILED'].includes(job.status),
    {
      interval: initialInterval,
      maxInterval,
      timeout,
      errorMessage: `Job did not reach terminal state within ${timeout}ms`,
    },
  );

  if (!result) {
    throw new Error('Job not found');
  }

  return result;
}

/**
 * Creates a deferred promise that can be resolved/rejected externally
 * Useful for event-based waiting patterns
 */
export function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/**
 * Waits for an event to be published on the event bus
 * More deterministic than polling for state changes
 */
export async function waitForEvent<TEvent>(
  eventBus: EventBus,
  eventType: new (...args: unknown[]) => TEvent,
  predicate: (event: TEvent) => boolean,
  options: { timeout?: number } = {},
): Promise<TEvent> {
  const { timeout = 10000 } = options;
  const deferred = createDeferred<TEvent>();

  // Store original publish to restore later
  const originalPublish = eventBus.publish.bind(eventBus);
  let resolved = false;

  // Intercept event publishing
  const interceptor = async (event: unknown): Promise<void> => {
    if (!resolved && event instanceof eventType && predicate(event)) {
      resolved = true;
      deferred.resolve(event);
    }
    await originalPublish(event as Parameters<typeof originalPublish>[0]);
  };

  jest.spyOn(eventBus, 'publish').mockImplementation(interceptor);

  // Set timeout
  const timeoutId = setTimeout(() => {
    if (!resolved) {
      resolved = true;
      deferred.reject(
        new Error(`Timeout waiting for ${eventType.name} after ${timeout}ms`),
      );
    }
  }, timeout);

  try {
    return await deferred.promise;
  } finally {
    clearTimeout(timeoutId);
    jest.restoreAllMocks();
  }
}
