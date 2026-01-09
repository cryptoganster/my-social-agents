import { AggregateRoot, AggregateVersion } from '@/shared/kernel';
import { Chunk } from '@refinement/domain/entities/chunk';
import { RefinementStatus } from '@refinement/domain/value-objects/refinement-status';
import { RefinementError } from '@refinement/domain/value-objects/refinement-error';
import { ChunkHash } from '@refinement/domain/value-objects/chunk-hash';
import { ContentRefinementStarted } from '@refinement/domain/events/content-refinement-started';
import { ChunkAdded } from '@refinement/domain/events/chunk-added';
import { RefinementCompleted } from '@refinement/domain/events/refinement-completed';
import { RefinementFailed } from '@refinement/domain/events/refinement-failed';
import { ContentRejected } from '@refinement/domain/events/content-rejected';

/**
 * Properties for ContentRefinement Aggregate
 */
export interface ContentRefinementProps {
  contentItemId: string;
  chunks: Chunk[];
  status: RefinementStatus;
  error: RefinementError | null;
  startedAt: Date | null;
  completedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
}

/**
 * ContentRefinement Aggregate Root
 *
 * Represents the active process of refining content with lifecycle management.
 * This is the aggregate root that owns Chunk entities.
 *
 * Lifecycle states:
 * - pending → processing → completed
 * - pending → processing → failed
 * - pending → processing → rejected
 *
 * Key responsibilities:
 * - Manage refinement lifecycle (pending → processing → completed/failed/rejected)
 * - Enforce business invariants (max chunks, unique hashes, etc.)
 * - Coordinate chunk creation and validation
 * - Publish domain events for state transitions
 *
 * Invariants:
 * 1. Must have at least one chunk when status is "completed"
 * 2. Cannot have more than 100 chunks
 * 3. All chunks must have unique hashes within this refinement
 * 4. Status transitions must follow valid paths
 * 5. Version must increment on every state change
 *
 * Requirements: Refinement 1, 2, 5, 8, 9, 10
 * Design: Aggregates section - ContentRefinement
 *
 * @see Chunk - The entity owned by this aggregate
 */
export class ContentRefinement extends AggregateRoot<string> {
  private readonly _contentItemId: string;
  private _chunks: Chunk[];
  private _status: RefinementStatus;
  private _error: RefinementError | null;
  private _startedAt: Date | null;
  private _completedAt: Date | null;
  private _rejectedAt: Date | null;
  private _rejectionReason: string | null;

  /**
   * Private constructor - use factory methods instead
   */
  private constructor(
    id: string,
    version: AggregateVersion,
    props: ContentRefinementProps,
  ) {
    super(id, version);
    this._contentItemId = props.contentItemId;
    this._chunks = [...props.chunks]; // Copy array
    this._status = props.status;
    this._error = props.error;
    this._startedAt = props.startedAt;
    this._completedAt = props.completedAt;
    this._rejectedAt = props.rejectedAt;
    this._rejectionReason = props.rejectionReason;

    this.validateInvariants();
  }

  /**
   * Creates a new ContentRefinement in PENDING state
   *
   * @param id - Unique identifier for this refinement
   * @param contentItemId - ID of the content item being refined
   * @returns A new ContentRefinement instance
   *
   * Requirements: Refinement 1.1
   */
  static create(id: string, contentItemId: string): ContentRefinement {
    return new ContentRefinement(id, AggregateVersion.initial(), {
      contentItemId,
      chunks: [],
      status: RefinementStatus.pending(),
      error: null,
      startedAt: null,
      completedAt: null,
      rejectedAt: null,
      rejectionReason: null,
    });
  }

  /**
   * Reconstitutes a ContentRefinement from persistence
   *
   * @param id - Aggregate ID
   * @param version - Current version number
   * @param props - Aggregate properties
   * @returns Reconstituted ContentRefinement instance
   */
  static reconstitute(
    id: string,
    version: number,
    props: ContentRefinementProps,
  ): ContentRefinement {
    return new ContentRefinement(
      id,
      AggregateVersion.fromNumber(version),
      props,
    );
  }

  /**
   * Validates business invariants
   *
   * Invariants:
   * 1. contentItemId must be non-empty
   * 2. Cannot have more than 100 chunks
   * 3. All chunk hashes must be unique
   * 4. If status is completed, must have at least one chunk
   *
   * Requirements: Refinement 2.4, 8.1
   */
  private validateInvariants(): void {
    // Invariant 1: contentItemId must be non-empty
    if (!this._contentItemId || this._contentItemId.trim().length === 0) {
      throw new Error('Content item ID cannot be empty');
    }

    // Invariant 2: Cannot have more than 100 chunks
    if (this._chunks.length > 100) {
      throw new Error(
        `Cannot have more than 100 chunks (found ${this._chunks.length})`,
      );
    }

    // Invariant 3: All chunk hashes must be unique
    const hashes = this._chunks.map((c) => c.hash.value);
    const uniqueHashes = new Set(hashes);
    if (hashes.length !== uniqueHashes.size) {
      throw new Error('All chunk hashes must be unique within refinement');
    }

    // Invariant 4: If completed, must have at least one chunk
    if (this._status.isCompleted && this._chunks.length === 0) {
      throw new Error('Completed refinement must have at least one chunk');
    }
  }

  /**
   * Starts the refinement process
   *
   * Transitions: pending → processing
   *
   * @throws Error if status is not pending
   *
   * Requirements: Refinement 1.3
   */
  start(): void {
    if (!this._status.canStart) {
      throw new Error(`Cannot start refinement in ${this._status.value} state`);
    }

    this._status = RefinementStatus.processing();
    this._startedAt = new Date();
    this.incrementVersion();

    // Publish domain event
    this.apply(new ContentRefinementStarted(this.id, this._contentItemId));
  }

  /**
   * Adds a chunk to the refinement
   *
   * @param chunk - The chunk to add
   * @throws Error if refinement is not processing
   * @throws Error if adding would exceed 100 chunks
   * @throws Error if chunk hash already exists
   *
   * Requirements: Refinement 2, 8
   */
  addChunk(chunk: Chunk): void {
    if (!this._status.isProcessing) {
      throw new Error(
        `Cannot add chunk when refinement is ${this._status.value}`,
      );
    }

    // Check max chunks limit
    if (this._chunks.length >= 100) {
      throw new Error('Cannot add more than 100 chunks to refinement');
    }

    // Check for duplicate hash
    const isDuplicate = this._chunks.some((c) => c.hash.equals(chunk.hash));
    if (isDuplicate) {
      throw new Error(
        `Chunk with hash ${chunk.hash.value} already exists in refinement`,
      );
    }

    this._chunks.push(chunk);
    this.incrementVersion();

    // Publish domain event
    this.apply(
      new ChunkAdded(this.id, chunk.id, chunk.hash.value, chunk.position.index),
    );
  }

  /**
   * Completes the refinement process
   *
   * Transitions: processing → completed
   *
   * @throws Error if status is not processing
   * @throws Error if no chunks have been added
   *
   * Requirements: Refinement 9
   */
  complete(): void {
    if (!this._status.canComplete) {
      throw new Error(
        `Cannot complete refinement in ${this._status.value} state`,
      );
    }

    if (this._chunks.length === 0) {
      throw new Error('Cannot complete refinement with zero chunks');
    }

    this._status = RefinementStatus.completed();
    this._completedAt = new Date();
    this.incrementVersion();

    // Publish domain event
    const duration = this.getDuration() || 0;
    this.apply(
      new RefinementCompleted(
        this.id,
        this._contentItemId,
        this._chunks.length,
        duration,
      ),
    );
  }

  /**
   * Marks the refinement as failed
   *
   * Transitions: processing → failed
   *
   * @param error - The error that caused the failure
   * @throws Error if status is not processing
   *
   * Requirements: Refinement 10
   */
  fail(error: RefinementError): void {
    if (!this._status.canFail) {
      throw new Error(`Cannot fail refinement in ${this._status.value} state`);
    }

    this._status = RefinementStatus.failed();
    this._error = error;
    this._completedAt = new Date();
    this.incrementVersion();

    // Publish domain event
    this.apply(
      new RefinementFailed(
        this.id,
        this._contentItemId,
        error.code,
        error.message,
      ),
    );
  }

  /**
   * Rejects the refinement (e.g., due to low quality)
   *
   * Transitions: processing → rejected
   *
   * @param reason - The reason for rejection
   * @throws Error if status is not processing
   * @throws Error if reason is empty
   *
   * Requirements: Refinement 1.4, 5, 6
   */
  reject(reason: string): void {
    if (!this._status.canReject) {
      throw new Error(
        `Cannot reject refinement in ${this._status.value} state`,
      );
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error('Rejection reason cannot be empty');
    }

    this._status = RefinementStatus.rejected();
    this._rejectionReason = reason;
    this._rejectedAt = new Date();
    this.incrementVersion();

    // Publish domain event
    this.apply(new ContentRejected(this.id, this._contentItemId, reason));
  }

  /**
   * Checks if a chunk with the given hash already exists
   *
   * @param hash - The chunk hash to check
   * @returns true if a chunk with this hash exists
   *
   * Requirements: Refinement 8
   */
  hasChunkWithHash(hash: ChunkHash): boolean {
    return this._chunks.some((c) => c.hash.equals(hash));
  }

  /**
   * Gets the refinement duration in milliseconds
   *
   * @returns Duration in milliseconds, or null if not completed
   */
  getDuration(): number | null {
    if (!this._startedAt) {
      return null;
    }

    const endTime = this._completedAt || this._rejectedAt || new Date();
    return endTime.getTime() - this._startedAt.getTime();
  }

  // Getters

  get contentItemId(): string {
    return this._contentItemId;
  }

  get chunks(): ReadonlyArray<Chunk> {
    return Object.freeze([...this._chunks]);
  }

  get status(): RefinementStatus {
    return this._status;
  }

  get error(): RefinementError | null {
    return this._error;
  }

  get startedAt(): Date | null {
    return this._startedAt;
  }

  get completedAt(): Date | null {
    return this._completedAt;
  }

  get rejectedAt(): Date | null {
    return this._rejectedAt;
  }

  get rejectionReason(): string | null {
    return this._rejectionReason;
  }

  get chunkCount(): number {
    return this._chunks.length;
  }

  get isCompleted(): boolean {
    return this._status.isCompleted;
  }

  get isFailed(): boolean {
    return this._status.isFailed;
  }

  get isRejected(): boolean {
    return this._status.isRejected;
  }

  get isPending(): boolean {
    return this._status.isPending;
  }

  get isProcessing(): boolean {
    return this._status.isProcessing;
  }

  /**
   * Returns a plain object representation for persistence
   */
  toObject(): ContentRefinementProps {
    return {
      contentItemId: this._contentItemId,
      chunks: [...this._chunks],
      status: this._status,
      error: this._error,
      startedAt: this._startedAt,
      completedAt: this._completedAt,
      rejectedAt: this._rejectedAt,
      rejectionReason: this._rejectionReason,
    };
  }
}
