/**
 * ConcurrencyException
 *
 * Thrown when optimistic locking detects a concurrent modification.
 * Used by both state-based and event-sourced repositories.
 *
 * ## Usage
 *
 * ```typescript
 * // In repository implementation
 * if (currentVersion !== expectedVersion) {
 *   throw new ConcurrencyException(
 *     `Aggregate ${aggregateId} was modified. ` +
 *     `Expected version ${expectedVersion}, found ${currentVersion}.`
 *   );
 * }
 *
 * // In command handler
 * try {
 *   await this.repository.save(aggregate);
 * } catch (error) {
 *   if (error instanceof ConcurrencyException) {
 *     // Retry logic or return conflict response
 *   }
 *   throw error;
 * }
 * ```
 *
 * Requirements: 1.5, 1.6
 */
export class ConcurrencyException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConcurrencyException';
    Object.setPrototypeOf(this, ConcurrencyException.prototype);
  }
}
