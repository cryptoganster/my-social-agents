import { ValueObject } from '@/shared/kernel';

/**
 * Properties for RefinementStatus Value Object
 */
export interface RefinementStatusProps {
  value: 'pending' | 'processing' | 'completed' | 'failed' | 'rejected';
}

/**
 * RefinementStatus Value Object
 *
 * Represents the current state of a content refinement process.
 * Immutable value object that captures the lifecycle state.
 *
 * Status values:
 * - pending: Refinement has been scheduled but not started
 * - processing: Refinement is currently in progress
 * - completed: Refinement finished successfully
 * - failed: Refinement encountered an error
 * - rejected: Content was rejected due to low quality
 *
 * Terminal states (no further transitions):
 * - completed
 * - failed
 * - rejected
 *
 * Requirements: Refinement 1.1, 1.2, 1.3, 1.4, 5.5
 * Design: Value Objects section - RefinementStatus
 */
export class RefinementStatus extends ValueObject<RefinementStatusProps> {
  private constructor(props: RefinementStatusProps) {
    super(props);
    this.validate();
  }

  /**
   * Validates the status value
   *
   * Invariants:
   * - Status must be one of the allowed values
   */
  protected validate(): void {
    const validStatuses = [
      'pending',
      'processing',
      'completed',
      'failed',
      'rejected',
    ];

    if (!validStatuses.includes(this.props.value)) {
      throw new Error(
        `Invalid status: must be one of ${validStatuses.join(', ')}`,
      );
    }
  }

  /**
   * Creates a RefinementStatus with 'pending' state
   *
   * @returns A new RefinementStatus instance with pending state
   */
  static pending(): RefinementStatus {
    return new RefinementStatus({ value: 'pending' });
  }

  /**
   * Creates a RefinementStatus with 'processing' state
   *
   * @returns A new RefinementStatus instance with processing state
   */
  static processing(): RefinementStatus {
    return new RefinementStatus({ value: 'processing' });
  }

  /**
   * Creates a RefinementStatus with 'completed' state
   *
   * @returns A new RefinementStatus instance with completed state
   */
  static completed(): RefinementStatus {
    return new RefinementStatus({ value: 'completed' });
  }

  /**
   * Creates a RefinementStatus with 'failed' state
   *
   * @returns A new RefinementStatus instance with failed state
   */
  static failed(): RefinementStatus {
    return new RefinementStatus({ value: 'failed' });
  }

  /**
   * Creates a RefinementStatus with 'rejected' state
   *
   * @returns A new RefinementStatus instance with rejected state
   */
  static rejected(): RefinementStatus {
    return new RefinementStatus({ value: 'rejected' });
  }

  /**
   * Gets the status value
   */
  get value(): string {
    return this.props.value;
  }

  /**
   * Checks if status is 'pending'
   */
  get isPending(): boolean {
    return this.props.value === 'pending';
  }

  /**
   * Checks if status is 'processing'
   */
  get isProcessing(): boolean {
    return this.props.value === 'processing';
  }

  /**
   * Checks if status is 'completed'
   */
  get isCompleted(): boolean {
    return this.props.value === 'completed';
  }

  /**
   * Checks if status is 'failed'
   */
  get isFailed(): boolean {
    return this.props.value === 'failed';
  }

  /**
   * Checks if status is 'rejected'
   */
  get isRejected(): boolean {
    return this.props.value === 'rejected';
  }

  /**
   * Checks if status is terminal (no further transitions possible)
   * Terminal states: completed, failed, rejected
   */
  get isTerminal(): boolean {
    return (
      this.props.value === 'completed' ||
      this.props.value === 'failed' ||
      this.props.value === 'rejected'
    );
  }

  /**
   * Checks if status allows starting refinement
   * Only 'pending' status allows starting
   */
  get canStart(): boolean {
    return this.props.value === 'pending';
  }

  /**
   * Checks if status allows completion
   * Only 'processing' status allows completion
   */
  get canComplete(): boolean {
    return this.props.value === 'processing';
  }

  /**
   * Checks if status allows failure
   * Only 'processing' status allows failure
   */
  get canFail(): boolean {
    return this.props.value === 'processing';
  }

  /**
   * Checks if status allows rejection
   * Only 'processing' status allows rejection
   */
  get canReject(): boolean {
    return this.props.value === 'processing';
  }

  /**
   * Returns a string representation of the status
   */
  toString(): string {
    return this.props.value;
  }
}
