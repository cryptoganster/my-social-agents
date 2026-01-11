/**
 * External Infrastructure Services
 *
 * Concrete implementations of external service interfaces using Node.js built-in modules
 * and third-party libraries. These services are part of the shared kernel and can be
 * used by any bounded context.
 */
export { HashService } from './hash';
export { CredentialEncryptionService } from './credential-encryption';
export { SharedExternalModule } from './shared-external.module';
