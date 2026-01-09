/**
 * External Service Interfaces
 *
 * Interfaces for external dependencies that the domain layer needs.
 * Implementations live in the infrastructure layer.
 *
 * Note: IHashService has been moved to the shared kernel at @/shared/interfaces
 */
export type { IHashService } from '@/shared/interfaces';
export type { ICredentialEncryption } from './credential-encryption';
