import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { Hash } from '@/ingestion/domain/interfaces/external';

/**
 * Node.js Crypto Hash Implementation
 *
 * Infrastructure implementation using Node.js built-in crypto module.
 * This is a technical detail - the domain doesn't know or care about Node.js.
 */
@Injectable()
export class NodeHash implements Hash {
  /**
   * Computes a SHA-256 hash using Node.js crypto
   */
  sha256(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex');
  }
}
