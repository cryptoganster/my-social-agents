import { SourceType, SourceTypeEnum } from '../value-objects/source-type';

/**
 * SourceConfiguration Entity
 *
 * Represents a configured content source with its settings and credentials.
 * Unlike Value Objects, entities have identity and lifecycle.
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

export class SourceConfiguration {
  private readonly _sourceId: string;
  private _sourceType: SourceType;
  private _name: string;
  private _config: Record<string, unknown>;
  private _credentials?: string;
  private _isActive: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: SourceConfigurationProps) {
    this._sourceId = props.sourceId;
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
   */
  static create(
    props: Omit<SourceConfigurationProps, 'createdAt' | 'updatedAt'>,
  ): SourceConfiguration {
    const now = new Date();
    return new SourceConfiguration({
      ...props,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitutes a SourceConfiguration from persistence
   */
  static reconstitute(props: SourceConfigurationProps): SourceConfiguration {
    return new SourceConfiguration(props);
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
    if (updates.name !== undefined) {
      this._name = updates.name;
    }
    if (updates.config !== undefined) {
      this._config = updates.config;
    }
    if (updates.credentials !== undefined) {
      this._credentials = updates.credentials;
    }
    if (updates.sourceType !== undefined) {
      this._sourceType = updates.sourceType;
    }
    this._updatedAt = new Date();
  }

  /**
   * Deactivates the source configuration
   * Requirements: 5.3
   */
  deactivate(): void {
    this._isActive = false;
    this._updatedAt = new Date();
  }

  /**
   * Activates the source configuration
   */
  activate(): void {
    this._isActive = true;
    this._updatedAt = new Date();
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
    return this._sourceId;
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
  toObject(): SourceConfigurationProps {
    return {
      sourceId: this._sourceId,
      sourceType: this._sourceType,
      name: this._name,
      config: { ...this._config },
      credentials: this._credentials,
      isActive: this._isActive,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
