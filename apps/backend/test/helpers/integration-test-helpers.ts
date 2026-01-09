/**
 * Integration Test Helpers
 *
 * Utilities for handling common integration test scenarios:
 * - Event synchronization
 * - Retry logic for concurrency conflicts
 * - Async operation waiting
 */

import { CommandBus, QueryBus } from '@nestjs/cqrs';

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
 */
export async function pollUntil<TResult>(
  queryBus: QueryBus,
  query: any,
  condition: (result: TResult | null) => boolean,
  options: {
    interval?: number;
    timeout?: number;
    errorMessage?: string;
  } = {},
): Promise<TResult | null> {
  const { interval = 100, timeout = 5000, errorMessage } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = (await queryBus.execute(query)) as TResult | null;

    if (condition(result)) {
      return result;
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(
    errorMessage ||
      `Timeout after ${timeout}ms waiting for condition to be met`,
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
