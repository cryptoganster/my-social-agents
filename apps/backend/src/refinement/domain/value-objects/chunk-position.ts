import { ValueObject } from '@/shared/kernel';

/**
 * Properties for ChunkPosition Value Object
 */
export interface ChunkPositionProps {
  index: number;
  startOffset: number;
  endOffset: number;
}

/**
 * ChunkPosition Value Object
 *
 * Represents the position of a chunk within the original content.
 * Immutable value object that captures both sequential ordering (index)
 * and character-level positioning (offsets).
 *
 * Position semantics:
 * - index: Sequential position in the chunk list (0-based)
 * - startOffset: Character position where chunk begins in original content
 * - endOffset: Character position where chunk ends in original content
 *
 * Invariants:
 * - index must be non-negative (>= 0)
 * - startOffset must be non-negative (>= 0)
 * - endOffset must be greater than startOffset (endOffset > startOffset)
 * - All values must be valid integers
 *
 * Requirements: Refinement 3.1, 3.2
 * Design: Value Objects section - ChunkPosition
 */
export class ChunkPosition extends ValueObject<ChunkPositionProps> {
  private constructor(props: ChunkPositionProps) {
    super(props);
    this.validate();
  }

  /**
   * Validates the chunk position properties
   *
   * Invariants:
   * - index >= 0
   * - startOffset >= 0
   * - endOffset > startOffset
   * - All values are valid integers
   */
  protected validate(): void {
    // Validate index
    if (
      typeof this.props.index !== 'number' ||
      !Number.isInteger(this.props.index) ||
      this.props.index < 0
    ) {
      throw new Error('Invalid index: must be a non-negative integer (>= 0)');
    }

    // Validate startOffset
    if (
      typeof this.props.startOffset !== 'number' ||
      !Number.isInteger(this.props.startOffset) ||
      this.props.startOffset < 0
    ) {
      throw new Error(
        'Invalid startOffset: must be a non-negative integer (>= 0)',
      );
    }

    // Validate endOffset
    if (
      typeof this.props.endOffset !== 'number' ||
      !Number.isInteger(this.props.endOffset) ||
      this.props.endOffset < 0
    ) {
      throw new Error(
        'Invalid endOffset: must be a non-negative integer (>= 0)',
      );
    }

    // Validate ordering: endOffset must be greater than startOffset
    if (this.props.endOffset <= this.props.startOffset) {
      throw new Error(
        'Invalid position: endOffset must be greater than startOffset',
      );
    }
  }

  /**
   * Creates a ChunkPosition from index and offsets
   *
   * @param index - Sequential position in chunk list (0-based)
   * @param startOffset - Character position where chunk begins
   * @param endOffset - Character position where chunk ends
   * @returns A new ChunkPosition instance
   * @throws Error if any value is invalid or ordering is incorrect
   */
  static create(
    index: number,
    startOffset: number,
    endOffset: number,
  ): ChunkPosition {
    return new ChunkPosition({ index, startOffset, endOffset });
  }

  /**
   * Gets the sequential index of this chunk
   */
  get index(): number {
    return this.props.index;
  }

  /**
   * Gets the start offset of this chunk
   */
  get startOffset(): number {
    return this.props.startOffset;
  }

  /**
   * Gets the end offset of this chunk
   */
  get endOffset(): number {
    return this.props.endOffset;
  }

  /**
   * Calculates the length of this chunk in characters
   */
  get length(): number {
    return this.props.endOffset - this.props.startOffset;
  }

  /**
   * Checks if this position comes before another position
   *
   * @param other - The position to compare with
   * @returns true if this position comes before the other
   */
  isBefore(other: ChunkPosition): boolean {
    return this.props.index < other.props.index;
  }

  /**
   * Checks if this position comes after another position
   *
   * @param other - The position to compare with
   * @returns true if this position comes after the other
   */
  isAfter(other: ChunkPosition): boolean {
    return this.props.index > other.props.index;
  }

  /**
   * Checks if this position is adjacent to another position
   * (i.e., this chunk's end is the next chunk's start)
   *
   * @param other - The position to check adjacency with
   * @returns true if positions are adjacent
   */
  isAdjacentTo(other: ChunkPosition): boolean {
    return (
      this.props.endOffset === other.props.startOffset ||
      other.props.endOffset === this.props.startOffset
    );
  }

  /**
   * Returns a string representation of the position
   */
  toString(): string {
    return `ChunkPosition(index=${this.props.index}, start=${this.props.startOffset}, end=${this.props.endOffset}, length=${this.length})`;
  }
}
