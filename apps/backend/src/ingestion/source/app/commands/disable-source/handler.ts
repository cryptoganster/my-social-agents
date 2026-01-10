import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { DisableSourceCommand } from './command';
import { DisableSourceResult } from './result';
import { ISourceConfigurationFactory } from '@/ingestion/source/domain/interfaces/factories';
import { ISourceConfigurationWriteRepository } from '@/ingestion/source/domain/interfaces/repositories';

/**
 * DisableSourceHandler
 *
 * Handles DisableSourceCommand by loading the source, disabling it,
 * and persisting the change. Includes retry logic for concurrency conflicts.
 *
 * Flow:
 * 1. Load source via factory (gets latest version)
 * 2. Check if source exists and is active
 * 3. Call source.disable() with reason
 * 4. Persist via write repository with optimistic locking
 *
 * Requirements: 4.5, 4.6
 */
@Injectable()
@CommandHandler(DisableSourceCommand)
export class DisableSourceHandler implements ICommandHandler<
  DisableSourceCommand,
  DisableSourceResult
> {
  private readonly logger = new Logger(DisableSourceHandler.name);

  constructor(
    @Inject('ISourceConfigurationFactory')
    private readonly sourceFactory: ISourceConfigurationFactory,
    @Inject('ISourceConfigurationWriteRepository')
    private readonly sourceWriteRepo: ISourceConfigurationWriteRepository,
  ) {}

  async execute(command: DisableSourceCommand): Promise<DisableSourceResult> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const source = await this.sourceFactory.load(command.sourceId);

        if (!source) {
          this.logger.warn(`Source ${command.sourceId} not found`);
          return DisableSourceResult.notFound(command.sourceId);
        }

        if (!source.isActive) {
          this.logger.debug(`Source ${command.sourceId} is already disabled`);
          return DisableSourceResult.alreadyDisabled(command.sourceId);
        }

        source.disable(command.reason);
        await this.sourceWriteRepo.save(source);

        this.logger.log(
          `Source ${command.sourceId} disabled: ${command.reason}`,
        );

        return DisableSourceResult.disabled(command.sourceId);
      } catch (error) {
        const isConcurrencyError =
          error instanceof Error &&
          error.message.includes('was modified by another transaction');

        if (!isConcurrencyError) {
          this.logger.error(
            `Error disabling source ${command.sourceId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            error instanceof Error ? error.stack : undefined,
          );
          throw error;
        }

        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(
          `Concurrency conflict disabling source ${command.sourceId}, retrying (attempt ${attempt + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
      }
    }

    this.logger.error(
      `Failed to disable source ${command.sourceId} after ${maxRetries} attempts`,
      lastError?.stack,
    );
    throw new Error(
      `Failed to disable source ${command.sourceId} after ${maxRetries} attempts`,
    );
  }
}
