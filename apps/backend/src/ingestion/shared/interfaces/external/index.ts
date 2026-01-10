/**
 * External Service Interfaces
 *
 * Interfaces for external dependencies that the domain layer needs.
 * Implementations live in the infrastructure layer.
 *
 * Note: IHashService has been moved to the shared kernel at @/shared/interfaces
 * Note: ICredentialEncryption has been moved to domain/interfaces/external
 */
export type { IHashService } from '@/shared/interfaces';
export type { ICredentialEncryption } from '@/ingestion/shared/domain/interfaces/external/credential-encryption';
