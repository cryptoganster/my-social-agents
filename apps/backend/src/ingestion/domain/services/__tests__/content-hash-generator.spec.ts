import * as fc from 'fast-check';
import { ContentHashGenerator } from '../content-hash-generator';
import { ContentHash } from '../../value-objects/content-hash';
import { IHashService } from '../../interfaces/external';

describe('ContentHashGenerator', () => {
  let mockHash: IHashService;
  let generator: ContentHashGenerator;

  beforeEach(() => {
    // Mock implementation of Hash interface
    mockHash = {
      sha256: jest.fn((content: string) => {
        // Simple deterministic mock: create a valid 64-char hex hash
        // Use a simple hash of the content length and first few chars
        const seed =
          content.length > 0 ? (content.charCodeAt(0) % 16).toString(16) : '0';
        return seed.repeat(64);
      }),
    };

    generator = new ContentHashGenerator(mockHash);
  });

  describe('Property Tests', () => {
    it('should generate identical hashes for identical content', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), (content) => {
          const hash1 = generator.generate(content);
          const hash2 = generator.generate(content);

          expect(hash1.equals(hash2)).toBe(true);
          expect(hash1.toString()).toBe(hash2.toString());
        }),
        { numRuns: 100 },
      );
    });

    it('should return valid ContentHash instances', () => {
      fc.assert(
        fc.property(fc.string(), (content) => {
          const hash = generator.generate(content);

          expect(hash).toBeInstanceOf(ContentHash);
          expect(hash.toString()).toHaveLength(64);
          expect(hash.toString()).toMatch(/^[0-9a-f]{64}$/);
        }),
        { numRuns: 100 },
      );
    });

    it('should create ContentHash from valid hex strings', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 0, max: 15 }), {
            minLength: 64,
            maxLength: 64,
          }),
          (hexArray) => {
            const hashString = hexArray.map((n) => n.toString(16)).join('');
            const hash = generator.fromString(hashString);

            expect(hash).toBeInstanceOf(ContentHash);
            expect(hash.toString()).toBe(hashString);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('Unit Tests', () => {
    describe('generate()', () => {
      it('should generate a ContentHash from content', () => {
        const content = 'test content';
        const hash = generator.generate(content);

        expect(hash).toBeInstanceOf(ContentHash);
        expect(hash.toString()).toHaveLength(64);
      });

      it('should delegate to hash implementation', () => {
        const content = 'test content';
        const spy = jest.spyOn(mockHash, 'sha256');

        generator.generate(content);

        expect(spy).toHaveBeenCalledWith(content);
        expect(spy).toHaveBeenCalledTimes(1);
      });

      it('should handle empty string', () => {
        const hash = generator.generate('');

        expect(hash).toBeInstanceOf(ContentHash);
        expect(hash.toString()).toHaveLength(64);
      });

      it('should handle very long content', () => {
        const longContent = 'a'.repeat(10000);
        const hash = generator.generate(longContent);

        expect(hash).toBeInstanceOf(ContentHash);
        expect(hash.toString()).toHaveLength(64);
      });

      it('should handle special characters', () => {
        const specialContent = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
        const hash = generator.generate(specialContent);

        expect(hash).toBeInstanceOf(ContentHash);
        expect(hash.toString()).toHaveLength(64);
      });

      it('should handle unicode characters', () => {
        const unicodeContent = '你好世界 🌍 مرحبا العالم';
        const hash = generator.generate(unicodeContent);

        expect(hash).toBeInstanceOf(ContentHash);
        expect(hash.toString()).toHaveLength(64);
      });

      it('should generate consistent hashes for same content', () => {
        const content = 'consistent content';
        const hash1 = generator.generate(content);
        const hash2 = generator.generate(content);

        expect(hash1.equals(hash2)).toBe(true);
      });

      it('should call hash.sha256 for each generation', () => {
        const spy = jest.spyOn(mockHash, 'sha256');

        generator.generate('test1');
        generator.generate('test2');

        expect(spy).toHaveBeenCalledTimes(2);
        expect(spy).toHaveBeenNthCalledWith(1, 'test1');
        expect(spy).toHaveBeenNthCalledWith(2, 'test2');
      });
    });

    describe('fromString()', () => {
      it('should create ContentHash from valid hash string', () => {
        const hashString = 'a'.repeat(64);
        const hash = generator.fromString(hashString);

        expect(hash).toBeInstanceOf(ContentHash);
        expect(hash.toString()).toBe(hashString);
      });

      it('should not call hash function when creating from string', () => {
        const hashString = 'b'.repeat(64);
        const spy = jest.spyOn(mockHash, 'sha256');

        generator.fromString(hashString);

        expect(spy).not.toHaveBeenCalled();
      });

      it('should throw error for invalid hash string (too short)', () => {
        const invalidHash = 'a'.repeat(63);

        expect(() => generator.fromString(invalidHash)).toThrow(
          'Invalid hash: must be 64-character hex string',
        );
      });

      it('should throw error for invalid hash string (too long)', () => {
        const invalidHash = 'a'.repeat(65);

        expect(() => generator.fromString(invalidHash)).toThrow(
          'Invalid hash: must be 64-character hex string',
        );
      });

      it('should throw error for non-hex characters', () => {
        const invalidHash = 'g'.repeat(64);

        expect(() => generator.fromString(invalidHash)).toThrow(
          'Invalid hash: must contain only hexadecimal characters',
        );
      });

      it('should accept lowercase hex characters', () => {
        const hashString = 'abcdef0123456789'.repeat(4);
        const hash = generator.fromString(hashString);

        expect(hash.toString()).toBe(hashString);
      });

      it('should accept mixed case hex characters', () => {
        const hashString = 'AbCdEf0123456789'.repeat(4).toLowerCase();
        const hash = generator.fromString(hashString);

        expect(hash.toString()).toBe(hashString);
      });
    });

    describe('Integration with Hash implementation', () => {
      it('should work with different Hash implementations', () => {
        // Create a different mock implementation
        const sha256Mock = jest.fn(() => '1'.repeat(64));
        const alternativeHash: IHashService = {
          sha256: sha256Mock,
        };

        const alternativeGenerator = new ContentHashGenerator(alternativeHash);
        const hash = alternativeGenerator.generate('test');

        expect(hash.toString()).toBe('1'.repeat(64));

        expect(sha256Mock).toHaveBeenCalledWith('test');
      });

      it('should propagate errors from hash implementation', () => {
        const errorHash: IHashService = {
          sha256: jest.fn(() => {
            throw new Error('Hash computation failed');
          }),
        };

        const errorGenerator = new ContentHashGenerator(errorHash);

        expect(() => errorGenerator.generate('test')).toThrow(
          'Hash computation failed',
        );
      });

      it('should handle hash implementation returning invalid format', () => {
        const sha256Mock = jest.fn(() => 'invalid');
        const invalidHash: IHashService = {
          sha256: sha256Mock,
        };

        const invalidGenerator = new ContentHashGenerator(invalidHash);

        expect(() => invalidGenerator.generate('test')).toThrow(
          'Invalid hash: must be 64-character hex string',
        );
      });
    });

    describe('Domain Service Characteristics', () => {
      it('should be stateless - multiple calls with same input produce same output', () => {
        const content = 'stateless test';

        const hash1 = generator.generate(content);
        const hash2 = generator.generate(content);
        const hash3 = generator.generate(content);

        expect(hash1.equals(hash2)).toBe(true);
        expect(hash2.equals(hash3)).toBe(true);
      });

      it('should not maintain internal state between calls', () => {
        generator.generate('first call');
        generator.generate('second call');
        const hash = generator.generate('third call');

        // Each call should be independent
        expect(hash).toBeInstanceOf(ContentHash);

        expect(mockHash.sha256).toHaveBeenCalledTimes(3);
      });

      it('should delegate all hash computation to infrastructure', () => {
        const spy = jest.spyOn(mockHash, 'sha256');

        generator.generate('test1');
        generator.generate('test2');
        generator.generate('test3');

        // Verify all calls went through the infrastructure
        expect(spy).toHaveBeenCalledTimes(3);
        expect(spy).toHaveBeenNthCalledWith(1, 'test1');
        expect(spy).toHaveBeenNthCalledWith(2, 'test2');
        expect(spy).toHaveBeenNthCalledWith(3, 'test3');
      });
    });
  });
});
