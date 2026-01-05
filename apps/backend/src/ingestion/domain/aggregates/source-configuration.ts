import { SourceType, SourceTypeEnum } from '../value-objects/source-type';
import { AggregateRoot, AggregateVersion } from '@/shared/kernel';

/**
 * SourceConfiguration Aggregate Root
 *
 * Represents a configured content source with its settings and credentials.
 * Manages its own lifecycle and enforces configuration validation rules.
 * Uses optimistic locking to prevent concurrent modifications.
 *
 * Requirements: 5.1, 5.2, 5.3
 */

export interface SourceConfigurationProps {
  sourceId: string;
  sourceType: SourceType;
  name: string;
  config: Record<string, unknown>;
  credentials?: string; // Encrypted credentials
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SourceConfigurationValidationResult {
  isValid: boolean;
  errors: string[];
}

export class SourceConfiguration extends AggregateRoot<string> {
  private _sourceType: SourceType;
  private _name: string;
  private _config: Record<string, unknown>;
  private _credentials?: string;
  private _isActive: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(
    id: string,
    version: AggregateVersion,
    props: Omit<SourceConfigurationProps, 'sourceId'>,
  ) {
    super(id, version);
    this._sourceType = props.sourceType;
    this._name = props.name;
    this._config = props.config;
    this._credentials = props.credentials;
    this._isActive = props.isActive;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  /**
   * Creates a new SourceConfiguration
   * New aggregates start at version 0
   */
  static create(
    props: Omit<
      SourceConfigurationProps,
      'createdAt' | 'updatedAt' | 'isActive'
    > & { isActive?: boolean },
  ): SourceConfiguration {
    const now = new Date();
    return new SourceConfiguration(props.sourceId, AggregateVersion.initial(), {
      sourceType: props.sourceType,
      name: props.name,
      config: props.config,
      credentials: props.credentials,
      isActive: props.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitutes a SourceConfiguration from persistence
   * Loads existing version from database
   */
  static reconstitute(
    props: SourceConfigurationProps & { version: number },
  ): SourceConfiguration {
    return new SourceConfiguration(
      props.sourceId,
      AggregateVersion.fromNumber(props.version),
      {
        sourceType: props.sourceType,
        name: props.name,
        config: props.config,
        credentials: props.credentials,
        isActive: props.isActive,
        createdAt: props.createdAt,
        updatedAt: props.updatedAt,
      },
    );
  }

  /**
   * Updates the source configuration
   * Requirements: 5.2
   */
  update(
    updates: Partial<
      Pick<
        SourceConfigurationProps,
        'name' | 'config' | 'credentials' | 'sourceType'
      >
    >,
  ): void {
    let hasChanges = false;

    if (updates.name !== undefined && updates.name !== this._name) {
      this._name = updates.name;
      hasChanges = true;
    }
    if (updates.config !== undefined) {
      this._config = updates.config;
      hasChanges = true;
    }
    if (updates.credentials !== undefined) {
      this._credentials = updates.credentials;
      hasChanges = true;
    }
    if (
      updates.sourceType !== undefined &&
      !updates.sourceType.equals(this._sourceType)
    ) {
      this._sourceType = updates.sourceType;
      hasChanges = true;
    }

    if (hasChanges) {
      this._updatedAt = new Date();
      this.incrementVersion(); // CRITICAL: Increment version on state change
    }
  }

  /**
   * Deactivates the source configuration
   * Requirements: 5.3
   */
  deactivate(): void {
    if (this._isActive) {
      this._isActive = false;
      this._updatedAt = new Date();
      this.incrementVersion(); // CRITICAL: Increment version on state change
    }
  }

  /**
   * Activates the source configuration
   */
  activate(): void {
    if (!this._isActive) {
      this._isActive = true;
      this._updatedAt = new Date();
      this.incrementVersion(); // CRITICAL: Increment version on state change
    }
  }

  /**
   * Validates the source configuration
   * Requirements: 4.1, 5.1
   */
  validateConfig(): SourceConfigurationValidationResult {
    const errors: string[] = [];

    // Validate name
    if (this._name.trim().length === 0) {
      errors.push('Source name is required');
    }

    if (this._name.length > 255) {
      errors.push('Source name must be at most 255 characters');
    }

    // Validate config object
    if (typeof this._config !== 'object' || this._config === null) {
      errors.push('Configuration object is required');
    }

    // Validate source type
    if (!this._sourceType.isValid()) {
      errors.push('Valid source type is required');
    }

    // Validate credentials for auth-required sources
    if (this._sourceType.requiresAuth() && this._credentials === undefined) {
      errors.push(
        `Source type ${this._sourceType.toString()} requires credentials`,
      );
    }

    // Source-specific validation
    const sourceTypeErrors = this.validateSourceTypeConfig();
    errors.push(...sourceTypeErrors);

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates source-type-specific configuration
   */
  private validateSourceTypeConfig(): string[] {
    const errors: string[] = [];
    const sourceTypeValue = this._sourceType.getValue();

    switch (sourceTypeValue) {
      case SourceTypeEnum.WEB:
        if (typeof this._config.url !== 'string') {
          errors.push('Web source requires a valid URL in config');
        }
        break;
      case SourceTypeEnum.RSS:
        if (typeof this._config.feedUrl !== 'string') {
          errors.push('RSS source requires a valid feedUrl in config');
        }
        break;
      case SourceTypeEnum.SOCIAL_MEDIA:
        if (typeof this._config.platform !== 'string') {
          errors.push('Social media source requires a platform in config');
        }
        break;
      case SourceTypeEnum.PDF:
        if (
          typeof this._config.path !== 'string' &&
          typeof this._config.url !== 'string'
        ) {
          errors.push('PDF source requires either a path or url in config');
        }
        break;
      case SourceTypeEnum.OCR:
        if (
          typeof this._config.imagePath !== 'string' &&
          typeof this._config.imageUrl !== 'string'
        ) {
          errors.push(
            'OCR source requires either an imagePath or imageUrl in config',
          );
        }
        break;
      case SourceTypeEnum.WIKIPEDIA:
        if (
          typeof this._config.articleTitle !== 'string' &&
          typeof this._config.articleId !== 'string'
        ) {
          errors.push(
            'Wikipedia source requires either an articleTitle or articleId in config',
          );
        }
        break;
    }

    return errors;
  }

  // Getters
  get sourceId(): string {
    return this.id; // Use inherited id property
  }

  get sourceType(): SourceType {
    return this._sourceType;
  }

  get name(): string {
    return this._name;
  }

  get config(): Record<string, unknown> {
    return { ...this._config }; // Return copy to prevent external mutation
  }

  get credentials(): string | undefined {
    return this._credentials;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Returns a plain object representation
   */
  toObject(): SourceConfigurationProps & { version: number } {
    return {
      sourceId: this.id,
      sourceType: this._sourceType,
      name: this._name,
      config: { ...this._config },
      credentials: this._credentials,
      isActive: this._isActive,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      version: this.version.value,
    };
  }
}
