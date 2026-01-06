import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { IHashService } from '@/ingestion/shared/interfaces/external';

/**
 * HashService
 *
 * Concrete implementation of IHashService interface using Node.js crypto module.
 * Provides SHA-256 hashing for content deduplication.
 *
 * Requirements: 2.4, 3.1
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
