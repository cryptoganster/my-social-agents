/**
 * Chunk Entity
 *
 * Represents a semantically coherent fragment of content with enriched metadata.
 * This is an entity (not an aggregate) that belongs to the ContentRefinement aggregate.
 *
 * The name "Chunk" (not "RefinedChunk") follows DDD naming principles:
 * - Entity names should not describe transitory states ("refined" is a state)
 * - The bounded context path (@refinement/domain/entities/) provides the context
 * - This is the canonical chunk representation in the refinement domain
 *
 * Key characteristics:
 * - Has identity (id)
 * - Immutable once created (except for enrichment)
 * - Contains crypto-specific entities
 * - Has quality score
 * - Maintains position and linking information
 * - Accessed ONLY through ContentRefinement aggregate (no separate repository)
 *
 * Requirements: 2, 3, 4, 5, 7
 *
 * @see ContentRefinement - The aggregate root that owns this entity
 */

import { ChunkHash } from '@refinement/domain/value-objects/chunk-hash';
import { ChunkPosition } from '@refinement/domain/value-objects/chunk-position';
import { CryptoEntity } from '@refinement/domain/value-objects/crypto-entity';
import { TemporalContext } from '@refinement/domain/value-objects/temporal-context';
import { QualityScore } from '@refinement/domain/value-objects/quality-score';

export interface ChunkProps {
  id: string;
  contentId: string;
  content: string;
  position: ChunkPosition;
  hash: ChunkHash;
  entities: CryptoEntity[];
  temporalContext: TemporalContext | null;
  qualityScore: QualityScore;
  previousChunkId: string | null;
  nextChunkId: string | null;
}

export class Chunk {
  private readonly _id: string;
  private readonly _contentId: string;
  private readonly _content: string;
  private readonly _position: ChunkPosition;
  private readonly _hash: ChunkHash;
  private _entities: CryptoEntity[];
  private _temporalContext: TemporalContext | null;
  private _qualityScore: QualityScore;
  private _previousChunkId: string | null;
  private _nextChunkId: string | null;

  private constructor(props: ChunkProps) {
    this._id = props.id;
    this._contentId = props.contentId;
    this._content = props.content;
    this._position = props.position;
    this._hash = props.hash;
    this._entities = props.entities;
    this._temporalContext = props.temporalContext;
    this._qualityScore = props.qualityScore;
    this._previousChunkId = props.previousChunkId;
    this._nextChunkId = props.nextChunkId;

    this.validateInvariants();
  }

  /**
   * Creates a new Chunk
   * Requirements: 2, 7
   */
  static create(
    props: Omit<
      ChunkProps,
      | 'id'
      | 'entities'
      | 'temporalContext'
      | 'qualityScore'
      | 'previousChunkId'
      | 'nextChunkId'
    >,
  ): Chunk {
    return new Chunk({
      id: Chunk.generateId(),
      entities: [],
      temporalContext: null,
      qualityScore: QualityScore.create(0, 0, 0, 0, 0),
      previousChunkId: null,
      nextChunkId: null,
      ...props,
    });
  }

  /**
   * Reconstitutes a Chunk from persistence
   */
  static reconstitute(props: ChunkProps): Chunk {
    return new Chunk(props);
  }

  /**
   * Generates a unique chunk ID
   */
  private static generateId(): string {
    return `chunk_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Validates business invariants
   * Requirements: 2, 5, 7
   */
  private validateInvariants(): void {
    // Invariant 1: Content must be at least 50 tokens (approximate: 50 tokens ≈ 200 characters)
    const minCharacters = 200;
    if (this._content.length < minCharacters) {
      throw new Error(
        `Chunk content must be at least ${minCharacters} characters (approximately 50 tokens)`,
      );
    }

    // Invariant 2: Quality score must be between 0 and 1
    if (this._qualityScore.overall < 0 || this._qualityScore.overall > 1) {
      throw new Error('Quality score must be between 0 and 1');
    }

    // Invariant 3: Position must be valid
    if (this._position.startOffset >= this._position.endOffset) {
      throw new Error('Position start offset must be less than end offset');
    }

    if (this._position.index < 0) {
      throw new Error('Position index must be non-negative');
    }
  }

  /**
   * Enriches the chunk with extracted crypto entities
   * Requirements: 3
   */
  enrichWithEntities(entities: CryptoEntity[]): void {
    if (!entities || entities.length === 0) {
      throw new Error('Cannot enrich with empty entities array');
    }

    this._entities = [...entities];
  }

  /**
   * Sets the temporal context for the chunk
   * Requirements: 4
   */
  setTemporalContext(context: TemporalContext): void {
    if (!context) {
      throw new Error('Temporal context cannot be null');
    }

    this._temporalContext = context;
  }

  /**
   * Updates the quality score for the chunk
   * Requirements: 5
   */
  calculateQualityScore(qualityScore: QualityScore): void {
    if (!qualityScore) {
      throw new Error('Quality score cannot be null');
    }

    if (qualityScore.overall < 0 || qualityScore.overall > 1) {
      throw new Error('Quality score must be between 0 and 1');
    }

    this._qualityScore = qualityScore;
  }

  /**
   * Links this chunk to the previous chunk in sequence
   * Requirements: 7
   */
  linkToPrevious(previousId: string): void {
    if (!previousId || previousId.trim().length === 0) {
      throw new Error('Previous chunk ID cannot be empty');
    }

    this._previousChunkId = previousId;
  }

  /**
   * Links this chunk to the next chunk in sequence
   * Requirements: 7
   */
  linkToNext(nextId: string): void {
    if (!nextId || nextId.trim().length === 0) {
      throw new Error('Next chunk ID cannot be empty');
    }

    this._nextChunkId = nextId;
  }

  /**
   * Checks if this chunk has high quality (score > 0.7)
   * Requirements: 5
   */
  hasHighQuality(): boolean {
    return this._qualityScore.isHighQuality;
  }

  /**
   * Checks if this chunk has medium quality (0.5 <= score <= 0.7)
   * Requirements: 5
   */
  hasMediumQuality(): boolean {
    return this._qualityScore.isMediumQuality;
  }

  /**
   * Checks if this chunk has low quality (0.3 <= score < 0.5)
   * Requirements: 5
   */
  hasLowQuality(): boolean {
    return this._qualityScore.isLowQuality;
  }

  /**
   * Checks if this chunk should be rejected (score < 0.3)
   * Requirements: 5
   */
  shouldBeRejected(): boolean {
    return this._qualityScore.isRejected;
  }

  /**
   * Checks if this chunk has crypto entities
   * Requirements: 3
   */
  hasEntities(): boolean {
    return this._entities.length > 0;
  }

  /**
   * Checks if this chunk has temporal context
   * Requirements: 4
   */
  hasTemporalContext(): boolean {
    return this._temporalContext !== null;
  }

  /**
   * Checks if this chunk is linked to a previous chunk
   * Requirements: 7
   */
  hasPrevious(): boolean {
    return this._previousChunkId !== null;
  }

  /**
   * Checks if this chunk is linked to a next chunk
   * Requirements: 7
   */
  hasNext(): boolean {
    return this._nextChunkId !== null;
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get contentId(): string {
    return this._contentId;
  }

  get content(): string {
    return this._content;
  }

  get position(): ChunkPosition {
    return this._position;
  }

  get hash(): ChunkHash {
    return this._hash;
  }

  get entities(): ReadonlyArray<CryptoEntity> {
    return Object.freeze([...this._entities]);
  }

  get temporalContext(): TemporalContext | null {
    return this._temporalContext;
  }

  get qualityScore(): QualityScore {
    return this._qualityScore;
  }

  get previousChunkId(): string | null {
    return this._previousChunkId;
  }

  get nextChunkId(): string | null {
    return this._nextChunkId;
  }

  /**
   * Returns a plain object representation
   */
  toObject(): ChunkProps {
    return {
      id: this._id,
      contentId: this._contentId,
      content: this._content,
      position: this._position,
      hash: this._hash,
      entities: [...this._entities],
      temporalContext: this._temporalContext,
      qualityScore: this._qualityScore,
      previousChunkId: this._previousChunkId,
      nextChunkId: this._nextChunkId,
    };
  }
}
