import { ValueObject } from '@/shared/kernel/value-object';

/**
 * Properties for TemplateMetadata value object
 */
export interface TemplateMetadataProps {
  name: string;
  description: string;
  type: 'specific' | 'generic';
  version?: string;
  author?: string;
}

/**
 * TemplateMetadata value object
 *
 * Represents metadata information for RSS source templates.
 * Includes name, description, type, and optional version/author fields.
 *
 * Requirements: 9.2, 9.3, 9.4
 */
export class TemplateMetadata extends ValueObject<TemplateMetadataProps> {
  private constructor(props: TemplateMetadataProps) {
    super(props);
    this.validate();
  }

  /**
   * Validates that required fields are present and valid
   * Requirements: 9.2, 9.3
   */
  protected validate(): void {
    if (!this.props.name || this.props.name.trim().length === 0) {
      throw new Error('Template name is required');
    }

    if (!this.props.description || this.props.description.trim().length === 0) {
      throw new Error('Template description is required');
    }

    if (this.props.type !== 'specific' && this.props.type !== 'generic') {
      throw new Error('Template type must be either "specific" or "generic"');
    }
  }

  /**
   * Creates a new TemplateMetadata instance
   *
   * @param props - The metadata properties
   * @returns A new TemplateMetadata instance
   */
  static create(props: TemplateMetadataProps): TemplateMetadata {
    return new TemplateMetadata(props);
  }

  /**
   * Gets the template name
   */
  get name(): string {
    return this.props.name;
  }

  /**
   * Gets the template description
   */
  get description(): string {
    return this.props.description;
  }

  /**
   * Gets the template type
   */
  get type(): 'specific' | 'generic' {
    return this.props.type;
  }

  /**
   * Gets the template version (optional)
   */
  get version(): string | undefined {
    return this.props.version;
  }

  /**
   * Gets the template author (optional)
   */
  get author(): string | undefined {
    return this.props.author;
  }
}
