import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger, Inject, Injectable } from '@nestjs/common';
import { ISourceConfigurationFactory } from '@/ingestion/source/domain/interfaces/factories/source-configuration-factory';
import { ISourceConfigurationWriteRepository } from '@/ingestion/source/domain/interfaces/repositories/source-configuration-write';
import { ICredentialEncryption } from '@/shared/interfaces';
import { IEncryptionKeyProvider } from '@/shared/interfaces';
import { SourceType } from '@/ingestion/source/domain/value-objects/source-type';
import { UpdateSourceCommand } from './command';
import { UpdateSourceResult } from './result';

/**
 * UpdateSourceCommandHandler
 *
 * Handles the update of existing source configurations.
 *
 * Single Responsibility: Orchestrate source configuration updates
 *
 * Flow:
 * 1. Load existing configuration via factory
 * 2. Encrypt credentials if present
 * 3. Update aggregate with new values
 * 4. Handle activation/deactivation
 * 5. Validate configuration
 * 6. Persist the configuration
 */
@Injectable()
@CommandHandler(UpdateSourceCommand)
export class UpdateSourceCommandHandler implements ICommandHandler<
  UpdateSourceCommand,
  UpdateSourceResult
> {
  private readonly logger = new Logger(UpdateSourceCommandHandler.name);

  constructor(
    @Inject('ISourceConfigurationFactory')
    private readonly sourceConfigFactory: ISourceConfigurationFactory,
    @Inject('ISourceConfigurationWriteRepository')
    private readonly sourceConfigWriteRepository: ISourceConfigurationWriteRepository,
    @Inject('ICredentialEncryption')
    private readonly credentialEncryption: ICredentialEncryption,
    @Inject('IEncryptionKeyProvider')
    private readonly encryptionKeyProvider: IEncryptionKeyProvider,
  ) {}

  async execute(command: UpdateSourceCommand): Promise<UpdateSourceResult> {
    this.logger.log(`Updating source configuration: ${command.sourceId}`);

    // Load existing configuration
    const existingConfig = await this.sourceConfigFactory.load(
      command.sourceId,
    );

    if (!existingConfig) {
      throw new Error(`Source configuration not found: ${command.sourceId}`);
    }

    // Encrypt credentials if provided
    const encryptedCredentials = this.encryptCredentialsIfPresent(
      command.credentials,
    );

    // Update the aggregate
    const sourceType = SourceType.fromString(command.sourceType);
    existingConfig.update({
      name: command.name,
      config: command.config,
      sourceType,
      credentials: encryptedCredentials,
    });

    // Handle activation/deactivation
    this.handleActivationChange(existingConfig, command.isActive);

    // Validate the configuration
    const validation = existingConfig.validateConfig();
    if (!validation.isValid) {
      throw new Error(
        `Invalid source configuration: ${validation.errors.join(', ')}`,
      );
    }

    // Persist the configuration
    this.logger.log(`Persisting source configuration ${command.sourceId}`);
    await this.sourceConfigWriteRepository.save(existingConfig);

    return {
      sourceId: existingConfig.sourceId,
      isActive: existingConfig.isActive,
    };
  }

  private encryptCredentialsIfPresent(
    credentials: string | undefined,
  ): string | undefined {
    if (!credentials) {
      return undefined;
    }

    this.logger.debug('Encrypting updated credentials');
    return this.credentialEncryption.encrypt(
      credentials,
      this.encryptionKeyProvider.getKey(),
    );
  }

  private handleActivationChange(
    sourceConfig: {
      isActive: boolean;
      activate: () => void;
      deactivate: () => void;
    },
    isActive: boolean | undefined,
  ): void {
    if (isActive === undefined) {
      return;
    }

    if (isActive && !sourceConfig.isActive) {
      sourceConfig.activate();
    } else if (!isActive && sourceConfig.isActive) {
      sourceConfig.deactivate();
    }
  }
}
