/**
 * IngestionStatus Value Object
 *
 * Enumeration of ingestion job states with state machine validation.
 * Enforces valid state transitions for job lifecycle management.
 *
 * Requirements: 4.4
 */
export enum IngestionStatusEnum {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
}

export class IngestionStatus {
  private readonly status: IngestionStatusEnum;

  private constructor(status: IngestionStatusEnum) {
    this.status = status;
  }

  /**
   * Creates an IngestionStatus from a string value
   */
  static fromString(value: string): IngestionStatus {
    const upperValue = value.toUpperCase();
    if (
      !Object.values(IngestionStatusEnum).includes(
        upperValue as IngestionStatusEnum,
      )
    ) {
      throw new Error(
        `Invalid ingestion status: ${value}. Must be one of: ${Object.values(IngestionStatusEnum).join(', ')}`,
      );
    }
    return new IngestionStatus(upperValue as IngestionStatusEnum);
  }

  /**
   * Creates an IngestionStatus from enum value
   */
  static fromEnum(status: IngestionStatusEnum): IngestionStatus {
    return new IngestionStatus(status);
  }

  /**
   * Creates a PENDING status
   */
  static pending(): IngestionStatus {
    return new IngestionStatus(IngestionStatusEnum.PENDING);
  }

  /**
   * Creates a RUNNING status
   */
  static running(): IngestionStatus {
    return new IngestionStatus(IngestionStatusEnum.RUNNING);
  }

  /**
   * Creates a COMPLETED status
   */
  static completed(): IngestionStatus {
    return new IngestionStatus(IngestionStatusEnum.COMPLETED);
  }

  /**
   * Creates a FAILED status
   */
  static failed(): IngestionStatus {
    return new IngestionStatus(IngestionStatusEnum.FAILED);
  }

  /**
   * Creates a RETRYING status
   */
  static retrying(): IngestionStatus {
    return new IngestionStatus(IngestionStatusEnum.RETRYING);
  }

  /**
   * Validates if transition to new status is allowed
   * State machine rules:
   * - PENDING -> RUNNING, FAILED
   * - RUNNING -> COMPLETED, FAILED, RETRYING
   * - COMPLETED -> (terminal state)
   * - FAILED -> RETRYING, PENDING
   * - RETRYING -> RUNNING, FAILED
   */
  canTransitionTo(newStatus: IngestionStatus): boolean {
    const validTransitions: Record<IngestionStatusEnum, IngestionStatusEnum[]> =
      {
        [IngestionStatusEnum.PENDING]: [
          IngestionStatusEnum.RUNNING,
          IngestionStatusEnum.FAILED,
        ],
        [IngestionStatusEnum.RUNNING]: [
          IngestionStatusEnum.COMPLETED,
          IngestionStatusEnum.FAILED,
          IngestionStatusEnum.RETRYING,
        ],
        [IngestionStatusEnum.COMPLETED]: [], // Terminal state
        [IngestionStatusEnum.FAILED]: [
          IngestionStatusEnum.RETRYING,
          IngestionStatusEnum.PENDING,
        ],
        [IngestionStatusEnum.RETRYING]: [
          IngestionStatusEnum.RUNNING,
          IngestionStatusEnum.FAILED,
        ],
      };

    return validTransitions[this.status].includes(newStatus.status);
  }

  /**
   * Checks if this is a terminal state
   */
  isTerminal(): boolean {
    return this.status === IngestionStatusEnum.COMPLETED;
  }

  /**
   * Checks if this is a failure state
   */
  isFailed(): boolean {
    return this.status === IngestionStatusEnum.FAILED;
  }

  /**
   * Returns the enum value
   */
  getValue(): IngestionStatusEnum {
    return this.status;
  }

  /**
   * Returns the string representation
   */
  toString(): string {
    return this.status;
  }

  /**
   * Checks equality with another IngestionStatus
   */
  equals(other: IngestionStatus): boolean {
    return this.status === other.status;
  }
}
