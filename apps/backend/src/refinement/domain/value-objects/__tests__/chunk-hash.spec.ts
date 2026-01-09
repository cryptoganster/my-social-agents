import * as fc from 'fast-check';
import { ChunkHash } from '../chunk-hash';

describe('ChunkHash', () => {
  describe('Unit Tests', () => {
    describe('create', () => {
      it('should create hash from valid 64-character hex string', () => {
        const hashString = 'a'.repeat(64); // Valid 64-char hex string
        const chunkHash = ChunkHash.create(hashString);

        expect(chunkHash).toBeDefined();
        expect(chunkHash.value).toBe(hashString);
        expect(chunkHash.toString()).toBe(hashString);
      });

      it('should create hash with mixed hex characters', () => {
        const hashString = '0123456789abcdef'.repeat(4); // 64 chars
        const chunkHash = ChunkHash.create(hashString);

        expect(chunkHash.value).toBe(hashString);
      });

      it('should throw error for invalid hash length', () => {
        expect(() => ChunkHash.create('invalid')).toThrow(
          'Invalid hash: must be 64-character hex string',
        );
        expect(() => ChunkHash.create('')).toThrow(
          'Invalid hash: must be 64-character hex string',
        );
        expect(() => ChunkHash.create('a'.repeat(63))).toThrow(
          'Invalid hash: must be 64-character hex string',
        );
        expect(() => ChunkHash.create('a'.repeat(65))).toThrow(
          'Invalid hash: must be 64-character hex string',
        );
      });

      it('should throw error for non-hex characters', () => {
        const invalidHash = 'g' + '0'.repeat(63); // 'g' is not hex
        expect(() => ChunkHash.create(invalidHash)).toThrow(
          'Invalid hash: must contain only hexadecimal characters',
        );
      });

      it('should throw error for uppercase hex characters', () => {
        const invalidHash = 'A' + '0'.repeat(63); // Uppercase not allowed
        expect(() => ChunkHash.create(invalidHash)).toThrow(
          'Invalid hash: must contain only hexadecimal characters',
        );
      });

      it('should throw error for special characters', () => {
        const invalidHash = '@' + '0'.repeat(63);
        expect(() => ChunkHash.create(invalidHash)).toThrow(
          'Invalid hash: must contain only hexadecimal characters',
        );
      });
    });

    describe('equals', () => {
      it('should return true for identical hashes', () => {
        const hashString = 'a'.repeat(64);
        const hash1 = ChunkHash.create(hashString);
        const hash2 = ChunkHash.create(hashString);

        expect(hash1.equals(hash2)).toBe(true);
      });

      it('should return false for different hashes', () => {
        const hash1 = ChunkHash.create('a'.repeat(64));
        const hash2 = ChunkHash.create('b'.repeat(64));

        expect(hash1.equals(hash2)).toBe(false);
      });

      it('should return false for null', () => {
        const hash = ChunkHash.create('a'.repeat(64));

        expect(hash.equals(null as any)).toBe(false);
      });

      it('should return false for undefined', () => {
        const hash = ChunkHash.create('a'.repeat(64));

        expect(hash.equals(undefined as any)).toBe(false);
      });
    });

    describe('toString', () => {
      it('should return the hash string', () => {
        const hashString = 'a'.repeat(64);
        const hash = ChunkHash.create(hashString);

        expect(hash.toString()).toBe(hashString);
      });
    });

    describe('value getter', () => {
      it('should return the hash value', () => {
        const hashString = 'a'.repeat(64);
        const hash = ChunkHash.create(hashString);

        expect(hash.value).toBe(hashString);
      });

      it('should match toString output', () => {
        const hashString = '0123456789abcdef'.repeat(4);
        const hash = ChunkHash.create(hashString);

        expect(hash.value).toBe(hash.toString());
      });
    });

    describe('immutability', () => {
      it('should be immutable', () => {
        const hashString = 'a'.repeat(64);
        const hash = ChunkHash.create(hashString);

        // Attempt to modify should fail (TypeScript prevents this, but test runtime)
        expect(() => {
          (hash as any).value = 'b'.repeat(64);
        }).toThrow();
      });
    });
  });

  describe('Property Tests', () => {
    // Feature: refinement-bc, Property 7.1: Hash Generation
    // Validates: Requirements 7.1
    it('should accept any valid 64-character hex string', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.constantFrom(
              '0',
              '1',
              '2',
              '3',
              '4',
              '5',
              '6',
              '7',
              '8',
              '9',
              'a',
              'b',
              'c',
              'd',
              'e',
              'f',
            ),
            {
              minLength: 64,
              maxLength: 64,
            },
          ),
          (hexChars: string[]) => {
            const hexString = hexChars.join('');
            const hash = ChunkHash.create(hexString);

            expect(hash.value).toBe(hexString);
            expect(hash.value).toHaveLength(64);
            expect(hash.value).toMatch(/^[0-9a-f]{64}$/);
          },
        ),
        { numRuns: 100 },
      );
    });

    // Feature: refinement-bc, Property 7.1: Hash Equality
    // Validates: Requirements 7.1
    it('should have value equality for identical hash strings', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.constantFrom(
              '0',
              '1',
              '2',
              '3',
              '4',
              '5',
              '6',
              '7',
              '8',
              '9',
              'a',
              'b',
              'c',
              'd',
              'e',
              'f',
            ),
            {
              minLength: 64,
              maxLength: 64,
            },
          ),
          (hexChars: string[]) => {
            const hexString = hexChars.join('');
            const hash1 = ChunkHash.create(hexString);
            const hash2 = ChunkHash.create(hexString);

            expect(hash1.equals(hash2)).toBe(true);
            expect(hash1.value).toBe(hash2.value);
          },
        ),
        { numRuns: 100 },
      );
    });

    // Feature: refinement-bc, Property 7.1: Hash Uniqueness
    // Validates: Requirements 7.1, 8.1
    it('should have different values for different hash strings', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.constantFrom(
              '0',
              '1',
              '2',
              '3',
              '4',
              '5',
              '6',
              '7',
              '8',
              '9',
              'a',
              'b',
              'c',
              'd',
              'e',
              'f',
            ),
            {
              minLength: 64,
              maxLength: 64,
            },
          ),
          fc.array(
            fc.constantFrom(
              '0',
              '1',
              '2',
              '3',
              '4',
              '5',
              '6',
              '7',
              '8',
              '9',
              'a',
              'b',
              'c',
              'd',
              'e',
              'f',
            ),
            {
              minLength: 64,
              maxLength: 64,
            },
          ),
          (hexChars1: string[], hexChars2: string[]) => {
            const hexString1 = hexChars1.join('');
            const hexString2 = hexChars2.join('');
            fc.pre(hexString1 !== hexString2); // Only test when hashes differ

            const hash1 = ChunkHash.create(hexString1);
            const hash2 = ChunkHash.create(hexString2);

            expect(hash1.equals(hash2)).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    // Feature: refinement-bc, Property: Validation
    // Validates: Requirements 7.1
    it('should reject invalid hash strings', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string({ minLength: 0, maxLength: 63 }), // Too short
            fc.string({ minLength: 65, maxLength: 100 }), // Too long
            fc.string({ minLength: 64, maxLength: 64 }).filter(
              (s) => !/^[0-9a-f]{64}$/.test(s), // Invalid characters
            ),
          ),
          (invalidHash: string) => {
            expect(() => ChunkHash.create(invalidHash)).toThrow();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
