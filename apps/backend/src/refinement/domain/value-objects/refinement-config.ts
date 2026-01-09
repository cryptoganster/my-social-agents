import { ValueObject } from '@/shared/kernel/value-object';

/**
 * ChunkingStrategy
 *
 * Defines the algorithm used for splitting content into chunks.
 *
 * - SEMANTIC: Uses RecursiveCharacterTextSplitter for general text (preserves meaning)
 * - MARKDOWN: Uses MarkdownTextSplitter for markdown content (preserves structure)
 * - SENTENCE: Uses sentence boundaries for splitting (preserves complete thoughts)
 *
 * Requirements: Refinement 2
 */
export enum ChunkingStrategy {
  SEMANTIC = 'semantic',
  MARKDOWN = 'markdown',
  SENTENCE = 'sentence',
}

/**
 * ExtractionMethod
 *
 * Defines the method used for extracting crypto entities from content.
 *
 * - REGEX: Fast, deterministic pattern matching for known entities
 * - LLM: AI-powered extraction for complex cases (slower but more accurate)
 * - HYBRID: Combines regex (fast) with LLM fallback (accurate)
 *
 * Requirements: Refinement 3
 */
export enum ExtractionMethod {
  REGEX = 'regex',
  LLM = 'llm',
  HYBRID = 'hybrid',
}

/**
 * RefinementConfigProps
 *
 * Properties for RefinementConfig Value Object.
 */
export interface RefinementConfigProps {
  chunkSize: number;
  chunkOverlap: number;
  qualityThreshold: number;
  chunkingStrategy: ChunkingStrategy;
  extractionMethod: ExtractionMethod;
}

/**
 * RefinementConfig
 *
 * Domain Value Object representing configuration parameters for the refinement process.
 * Encodes business rules for how content should be refined.
 *
 * ## Business Rules (Invariants)
 * - Chunk size must be between 500 and 1000 tokens
 * - Chunk overlap must be between 100 and 200 tokens
 * - Quality threshold must be between 0.0 and 1.0
 * - Chunking strategy must be valid enum value
 * - Extraction method must be valid enum value
 *
 * ## Why Domain Layer?
 * This is a Value Object in the domain layer because:
 * 1. It encodes business rules (valid ranges for parameters)
 * 2. It represents domain concepts (chunking strategy, extraction method)
 * 3. It enforces invariants through validation
 * 4. It's used by domain services (SemanticChunker, CryptoEntityExtractor, ContentQualityAnalyzer)
 * 5. It's immutable and self-validating (Value Object characteristics)
 *
 * ## Usage Example
 * ```typescript
 * // Use default configuration
 * const config = RefinementConfig.default();
 *
 * // Create custom configuration
 * const customConfig = RefinementConfig.create({
 *   chunkSize: 1000,
 *   qualityThreshold: 0.5,
 * });
 *
 * // Use in domain services
 * const chunks = await semanticChunker.chunk(content, config);
 * ```
 *
 * Requirements: Refinement 1, 2, 3, 5, 11, 13
 * Design: Domain Layer - Value Objects
 */
export class RefinementConfig extends ValueObject<RefinementConfigProps> {
  /**
   * Default values for refinement configuration.
   * These represent the optimal balance between quality and performance.
   */
  private static readonly DEFAULTS = {
    chunkSize: 800,
    chunkOverlap: 150,
    qualityThreshold: 0.3,
    chunkingStrategy: ChunkingStrategy.SEMANTIC,
    extractionMethod: ExtractionMethod.HYBRID,
  };

  /**
   * Valid ranges for configuration parameters.
   * These encode business rules from requirements.
   */
  private static readonly RANGES = {
    chunkSize: { min: 500, max: 1000 },
    chunkOverlap: { min: 100, max: 200 },
    qualityThreshold: { min: 0.0, max: 1.0 },
  };

  /**
   * Private constructor enforces use of static factory methods.
   * Validates all business rules upon construction.
   *
   * @param props - Configuration properties
   */
  private constructor(props: RefinementConfigProps) {
    super(props);
    this.validate();
  }

  /**
   * Validates all configuration invariants.
   * Throws descriptive errors for invalid values.
   *
   * Requirements: Refinement 13
   */
  protected validate(): void {
    // Validate chunk size
    if (
      this.props.chunkSize < RefinementConfig.RANGES.chunkSize.min ||
      this.props.chunkSize > RefinementConfig.RANGES.chunkSize.max
    ) {
      throw new Error(
        `Chunk size must be between ${RefinementConfig.RANGES.chunkSize.min} and ${RefinementConfig.RANGES.chunkSize.max} tokens`,
      );
    }

    // Validate chunk overlap
    if (
      this.props.chunkOverlap < RefinementConfig.RANGES.chunkOverlap.min ||
      this.props.chunkOverlap > RefinementConfig.RANGES.chunkOverlap.max
    ) {
      throw new Error(
        `Chunk overlap must be between ${RefinementConfig.RANGES.chunkOverlap.min} and ${RefinementConfig.RANGES.chunkOverlap.max} tokens`,
      );
    }

    // Validate quality threshold
    if (
      this.props.qualityThreshold <
        RefinementConfig.RANGES.qualityThreshold.min ||
      this.props.qualityThreshold > RefinementConfig.RANGES.qualityThreshold.max
    ) {
      throw new Error(
        `Quality threshold must be between ${RefinementConfig.RANGES.qualityThreshold.min} and ${RefinementConfig.RANGES.qualityThreshold.max}`,
      );
    }

    // Validate chunking strategy (enum validation)
    if (
      !Object.values(ChunkingStrategy).includes(this.props.chunkingStrategy)
    ) {
      throw new Error(
        `Invalid chunking strategy: ${this.props.chunkingStrategy}`,
      );
    }

    // Validate extraction method (enum validation)
    if (
      !Object.values(ExtractionMethod).includes(this.props.extractionMethod)
    ) {
      throw new Error(
        `Invalid extraction method: ${this.props.extractionMethod}`,
      );
    }
  }

  /**
   * Creates a RefinementConfig with custom values.
   * Applies defaults for any omitted properties.
   *
   * @param props - Partial configuration properties
   * @returns New RefinementConfig instance
   * @throws Error if any value violates business rules
   *
   * @example
   * ```typescript
   * // Custom chunk size
   * const config = RefinementConfig.create({ chunkSize: 1000 });
   *
   * // Multiple custom values
   * const config = RefinementConfig.create({
   *   chunkSize: 900,
   *   qualityThreshold: 0.5,
   *   extractionMethod: ExtractionMethod.LLM,
   * });
   * ```
   */
  static create(props: Partial<RefinementConfigProps>): RefinementConfig {
    return new RefinementConfig({
      chunkSize: props.chunkSize ?? RefinementConfig.DEFAULTS.chunkSize,
      chunkOverlap:
        props.chunkOverlap ?? RefinementConfig.DEFAULTS.chunkOverlap,
      qualityThreshold:
        props.qualityThreshold ?? RefinementConfig.DEFAULTS.qualityThreshold,
      chunkingStrategy:
        props.chunkingStrategy ?? RefinementConfig.DEFAULTS.chunkingStrategy,
      extractionMethod:
        props.extractionMethod ?? RefinementConfig.DEFAULTS.extractionMethod,
    });
  }

  /**
   * Creates a RefinementConfig with all default values.
   * Represents the optimal balance between quality and performance.
   *
   * @returns New RefinementConfig with default values
   *
   * @example
   * ```typescript
   * const config = RefinementConfig.default();
   * // chunkSize: 800, chunkOverlap: 150, qualityThreshold: 0.3,
   * // chunkingStrategy: SEMANTIC, extractionMethod: HYBRID
   * ```
   */
  static default(): RefinementConfig {
    return new RefinementConfig(RefinementConfig.DEFAULTS);
  }

  /**
   * Gets the target chunk size in tokens.
   * Range: 500-1000 tokens
   */
  get chunkSize(): number {
    return this.props.chunkSize;
  }

  /**
   * Gets the overlap between chunks in tokens.
   * Range: 100-200 tokens
   */
  get chunkOverlap(): number {
    return this.props.chunkOverlap;
  }

  /**
   * Gets the minimum quality score threshold.
   * Chunks below this score are rejected.
   * Range: 0.0-1.0
   */
  get qualityThreshold(): number {
    return this.props.qualityThreshold;
  }

  /**
   * Gets the chunking strategy to use.
   * Determines how content is split into chunks.
   */
  get chunkingStrategy(): ChunkingStrategy {
    return this.props.chunkingStrategy;
  }

  /**
   * Gets the entity extraction method.
   * Determines how crypto entities are extracted from chunks.
   */
  get extractionMethod(): ExtractionMethod {
    return this.props.extractionMethod;
  }
}
