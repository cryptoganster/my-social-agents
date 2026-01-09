import { ValueObject } from '@/shared/kernel/value-object';
import { TemplateMetadata } from './template-metadata';

/**
 * Properties for TemplateConfiguration value object
 */
export interface TemplateConfigurationProps {
  feedUrl: string;
  updateInterval: number;
  categories?: string[];
  language?: string;
  maxItems?: number;
  timeout?: number;
  metadata?: TemplateMetadata;
  customFields?: Record<string, unknown>;
}

/**
 * TemplateConfiguration value object
 *
 * Represents a complete RSS template configuration with required and optional fields.
 * Validates all fields according to the template schema.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */
export class TemplateConfiguration extends ValueObject<TemplateConfigurationProps> {
  private constructor(props: TemplateConfigurationProps) {
    super(props);
    this.validate();
  }

  /**
   * Validates required and optional fields
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
   */
  protected validate(): void {
    // Validate required fields
    if (!this.props.feedUrl || this.props.feedUrl.trim().length === 0) {
      throw new Error('feedUrl is required');
    }

    if (
      this.props.updateInterval === undefined ||
      this.props.updateInterval === null
    ) {
      throw new Error('updateInterval is required');
    }

    if (
      typeof this.props.updateInterval !== 'number' ||
      !Number.isInteger(this.props.updateInterval) ||
      this.props.updateInterval <= 0
    ) {
      throw new Error('updateInterval must be a positive integer');
    }

    // Validate optional fields if present
    if (this.props.categories !== undefined) {
      if (!Array.isArray(this.props.categories)) {
        throw new Error('categories must be an array');
      }
      if (!this.props.categories.every((cat) => typeof cat === 'string')) {
        throw new Error('categories must be an array of strings');
      }
    }

    if (this.props.language !== undefined) {
      if (typeof this.props.language !== 'string') {
        throw new Error('language must be a string');
      }
    }

    if (this.props.maxItems !== undefined) {
      if (
        typeof this.props.maxItems !== 'number' ||
        !Number.isInteger(this.props.maxItems) ||
        this.props.maxItems <= 0
      ) {
        throw new Error('maxItems must be a positive integer');
      }
    }

    if (this.props.timeout !== undefined) {
      if (
        typeof this.props.timeout !== 'number' ||
        !Number.isInteger(this.props.timeout) ||
        this.props.timeout <= 0
      ) {
        throw new Error('timeout must be a positive integer');
      }
    }
  }

  /**
   * Creates a new TemplateConfiguration instance
   *
   * @param props - The configuration properties
   * @returns A new TemplateConfiguration instance
   */
  static create(props: TemplateConfigurationProps): TemplateConfiguration {
    return new TemplateConfiguration(props);
  }

  /**
   * Gets the feed URL
   */
  get feedUrl(): string {
    return this.props.feedUrl;
  }

  /**
   * Gets the update interval in seconds
   */
  get updateInterval(): number {
    return this.props.updateInterval;
  }

  /**
   * Gets the categories array (optional)
   */
  get categories(): string[] | undefined {
    return this.props.categories;
  }

  /**
   * Gets the language code (optional)
   */
  get language(): string | undefined {
    return this.props.language;
  }

  /**
   * Gets the max items (optional)
   */
  get maxItems(): number | undefined {
    return this.props.maxItems;
  }

  /**
   * Gets the timeout in milliseconds (optional)
   */
  get timeout(): number | undefined {
    return this.props.timeout;
  }

  /**
   * Gets the template metadata (optional)
   */
  get metadata(): TemplateMetadata | undefined {
    return this.props.metadata;
  }

  /**
   * Gets custom fields (optional)
   */
  get customFields(): Record<string, unknown> | undefined {
    return this.props.customFields;
  }

  /**
   * Returns configuration without metadata for database storage
   * Requirement: 9.7
   */
  withoutMetadata(): TemplateConfiguration {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { metadata, ...propsWithoutMetadata } = this.props;
    return new TemplateConfiguration(propsWithoutMetadata);
  }
}
