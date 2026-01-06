import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SourceConfigurationFactory } from '@/ingestion/source/domain/interfaces/factories/source-configuration-factory';
import { SourceConfiguration } from '@/ingestion/source/domain/aggregates/source-configuration';
import { SourceConfigurationWriteRepository } from '@/ingestion/source/domain/interfaces/repositories/source-configuration-write';
import { ICredentialEncryption } from '@/ingestion/shared/interfaces/external';
import { SourceType } from '@/ingestion/source/domain/value-objects/source-type';
import { ConfigureSourceCommand } from './command';
import { ConfigureSourceResult } from './result';

/**
 * ConfigureSourceCommandHandler
 *
 * Handles the configuration of content sources following CQRS principles.
 * Responsibilities:
 * 1. Load existing configuration (for updates) or prepare for creation
 * 2. Validate source configuration
 * 3. Encrypt credentials if present
 * 4. Create or update SourceConfiguration aggregate
 * 5. Persist the configuration
 *
 * Requirements: 5.1, 5.2, 5.5
 */
@CommandHandler(ConfigureSourceCommand)
export class ConfigureSourceCommandHandler implements ICommandHandler<
  ConfigureSourceCommand,
  ConfigureSourceResult
> {
  private readonly logger = new Logger(ConfigureSourceCommandHandler.name);
  private readonly encryptionKey: string;

  constructor(
    @Inject('SourceConfigurationFactory')
    private readonly sourceConfigFactory: SourceConfigurationFactory,
    @Inject('SourceConfigurationWriteRepository')
    private readonly sourceConfigWriteRepository: SourceConfigurationWriteRepository,
    @Inject('ICredentialEncryption')
    private readonly credentialEncryption: ICredentialEncryption,
  ) {
    // Get encryption key from environment
    // In production, this should be stored securely (e.g., AWS Secrets Manager, HashiCorp Vault)
    this.encryptionKey =
      process.env.CREDENTIAL_ENCRYPTION_KEY ??
      'default-key-for-development-only-min-32-chars';

    if (
      this.encryptionKey === 'default-key-for-development-only-min-32-chars'
    ) {
      this.logger.warn(
        'Using default encryption key. Set CREDENTIAL_ENCRYPTION_KEY environment variable in production.',
      );
    }
  }

  /**
   * Executes the ConfigureSourceCommand
   *
   * Pipeline: load existing (if update) → validate → encrypt credentials → create/update aggregate → persist
   */
  async execute(
    command: ConfigureSourceCommand,
  ): Promise<ConfigureSourceResult> {
    try {
      const isUpdate =
        command.sourceId !== undefined && command.sourceId !== null;
      let sourceConfig: SourceConfiguration;

      if (isUpdate) {
        // Update existing source configuration
        this.logger.log(`Updating source configuration: ${command.sourceId}`);
        sourceConfig = await this.updateSourceConfiguration(command);
      } else {
        // Create new source configuration
        this.logger.log('Creating new source configuration');
        sourceConfig = this.createSourceConfiguration(command);
      }

      // Validate the configuration
      const validation = sourceConfig.validateConfig();
      if (!validation.isValid) {
        throw new Error(
          `Invalid source configuration: ${validation.errors.join(', ')}`,
        );
      }

      // Persist the configuration
      this.logger.log(
        `Persisting source configuration ${sourceConfig.sourceId}`,
      );
      await this.sourceConfigWriteRepository.save(sourceConfig);

      return {
        sourceId: sourceConfig.sourceId,
        isNew: !isUpdate,
        isActive: sourceConfig.isActive,
      };
    } catch (error) {
      // Fatal error: log and rethrow
      this.logger.error(
        `Fatal error configuring source: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Creates a new source configuration
   */
  private createSourceConfiguration(
    command: ConfigureSourceCommand,
  ): SourceConfiguration {
    const sourceId = randomUUID();
    const sourceType = SourceType.fromString(command.sourceType);

    // Encrypt credentials if provided
    let encryptedCredentials: string | undefined;
    if (
      command.credentials !== undefined &&
      command.credentials !== null &&
      command.credentials !== ''
    ) {
      this.logger.log('Encrypting credentials for new source');
      encryptedCredentials = this.credentialEncryption.encrypt(
        command.credentials,
        this.encryptionKey,
      );
    }

    // Create new aggregate
    return SourceConfiguration.create({
      sourceId,
      sourceType,
      name: command.name,
      config: command.config,
      credentials: encryptedCredentials,
      isActive: command.isActive,
    });
  }

  /**
   * Updates an existing source configuration
   */
  private async updateSourceConfiguration(
    command: ConfigureSourceCommand,
  ): Promise<SourceConfiguration> {
    // Load existing configuration
    const existingConfig = await this.sourceConfigFactory.load(
      command.sourceId!,
    );

    if (!existingConfig) {
      throw new Error(`Source configuration not found: ${command.sourceId}`);
    }

    // Prepare updates
    const sourceType = SourceType.fromString(command.sourceType);
    let encryptedCredentials: string | undefined;

    // Encrypt credentials if provided
    if (
      command.credentials !== undefined &&
      command.credentials !== null &&
      command.credentials !== ''
    ) {
      this.logger.log('Encrypting updated credentials');
      encryptedCredentials = this.credentialEncryption.encrypt(
        command.credentials,
        this.encryptionKey,
      );
    }

    // Update the aggregate
    existingConfig.update({
      name: command.name,
      config: command.config,
      sourceType,
      credentials: encryptedCredentials,
    });

    // Handle activation/deactivation if specified
    if (command.isActive !== undefined) {
      if (command.isActive && !existingConfig.isActive) {
        existingConfig.activate();
      } else if (!command.isActive && existingConfig.isActive) {
        existingConfig.deactivate();
      }
    }

    return existingConfig;
  }
}
