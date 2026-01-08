import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { IHashService } from '@/shared/interfaces';

/**
 * HashService
 *
 * Concrete implementation of IHashService interface using Node.js crypto module.
 * Provides SHA-256 hashing for content deduplication and integrity verification.
 *
 * This implementation is part of the shared kernel and can be used by any bounded
 * context that requires hashing capabilities (e.g., Ingestion, Refinement).
 *
 * Requirements: Shared across multiple contexts for content hashing
 */
@Injectable()
export class HashService implements IHashService {
  /**
   * Computes a SHA-256 hash using Node.js crypto
   */
  sha256(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex');
  }
}
