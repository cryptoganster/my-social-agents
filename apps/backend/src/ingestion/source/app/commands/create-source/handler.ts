import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ISourceConfigurationWriteRepository } from '@/ingestion/source/domain/interfaces/repositories/source-configuration-write';
import { ICredentialEncryption } from '@/shared/interfaces';
import { IEncryptionKeyProvider } from '@/shared/interfaces';
import { SourceConfiguration } from '@/ingestion/source/domain/aggregates/source-configuration';
import { SourceType } from '@/ingestion/source/domain/value-objects/source-type';
import { CreateSourceCommand } from './command';
import { CreateSourceResult } from './result';

/**
 * CreateSourceCommandHandler
 *
 * Handles the creation of new source configurations.
 *
 * Single Responsibility: Orchestrate new source creation
 *
 * Flow:
 * 1. Generate source ID
 * 2. Encrypt credentials if present
 * 3. Create SourceConfiguration aggregate
 * 4. Validate configuration
 * 5. Persist the configuration
 */
@Injectable()
@CommandHandler(CreateSourceCommand)
export class CreateSourceCommandHandler implements ICommandHandler<
  CreateSourceCommand,
  CreateSourceResult
> {
  private readonly logger = new Logger(CreateSourceCommandHandler.name);

  constructor(
    @Inject('ISourceConfigurationWriteRepository')
    private readonly sourceConfigWriteRepository: ISourceConfigurationWriteRepository,
    @Inject('ICredentialEncryption')
    private readonly credentialEncryption: ICredentialEncryption,
    @Inject('IEncryptionKeyProvider')
    private readonly encryptionKeyProvider: IEncryptionKeyProvider,
  ) {}

  async execute(command: CreateSourceCommand): Promise<CreateSourceResult> {
    this.logger.log('Creating new source configuration');

    const sourceId = randomUUID();
    const sourceType = SourceType.fromString(command.sourceType);

    // Encrypt credentials if provided
    const encryptedCredentials = this.encryptCredentialsIfPresent(
      command.credentials,
    );

    // Create new aggregate
    const sourceConfig = SourceConfiguration.create({
      sourceId,
      sourceType,
      name: command.name,
      config: command.config,
      credentials: encryptedCredentials,
      isActive: command.isActive,
    });

    // Validate the configuration
    const validation = sourceConfig.validateConfig();
    if (!validation.isValid) {
      throw new Error(
        `Invalid source configuration: ${validation.errors.join(', ')}`,
      );
    }

    // Persist the configuration
    this.logger.log(`Persisting source configuration ${sourceId}`);
    await this.sourceConfigWriteRepository.save(sourceConfig);

    return {
      sourceId: sourceConfig.sourceId,
      isActive: sourceConfig.isActive,
    };
  }

  private encryptCredentialsIfPresent(
    credentials: string | undefined,
  ): string | undefined {
    if (!credentials) {
      return undefined;
    }

    this.logger.debug('Encrypting credentials for new source');
    return this.credentialEncryption.encrypt(
      credentials,
      this.encryptionKeyProvider.getKey(),
    );
  }
}
