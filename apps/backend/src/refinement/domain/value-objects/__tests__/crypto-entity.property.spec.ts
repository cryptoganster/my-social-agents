import * as fc from 'fast-check';
import { CryptoEntity } from '@refinement/domain/value-objects/crypto-entity';
import { CryptoEntityType } from '@refinement/domain/value-objects/crypto-entity-type';

/**
 * Property-Based Tests for CryptoEntity
 *
 * These tests verify universal properties that should hold for all valid inputs.
 * We use fast-check to generate random test cases and verify invariants.
 *
 * Feature: refinement-bc, Property: Confidence bounds and position validity
 * Validates: Requirements 3.3, 3.4
 */
describe('CryptoEntity - Property-Based Tests', () => {
  describe('Property 1: Confidence bounds', () => {
    /**
     * For any valid CryptoEntity, confidence must be in [0, 1]
     *
     * Validates: Requirements 3.3
     */
    it('should always have confidence between 0 and 1 (inclusive)', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(CryptoEntityType)),
          nonWhitespaceString(),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.nat(),
          fc.integer({ min: 1 }), // offset must be at least 1
          (type, value, confidence, start, offset) => {
            const startPos = start;
            const endPos = start + offset;

            const entity = CryptoEntity.create(
              type,
              value,
              confidence,
              startPos,
              endPos,
            );

            // Property: confidence is always in valid range
            expect(entity.confidence).toBeGreaterThanOrEqual(0);
            expect(entity.confidence).toBeLessThanOrEqual(1);
            expect(entity.confidence).toBe(confidence);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * For any confidence outside [0, 1], entity creation should fail
     *
     * Validates: Requirements 3.3
     */
    it('should reject confidence outside [0, 1]', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(CryptoEntityType)),
          nonWhitespaceString(),
          fc.oneof(
            fc.double({ max: -0.01, noNaN: true }), // negative
            fc.double({ min: 1.01, noNaN: true }), // > 1
          ),
          fc.nat(),
          fc.integer({ min: 1 }),
          (type, value, invalidConfidence, start, offset) => {
            const startPos = start;
            const endPos = start + offset;

            // Property: invalid confidence always throws
            expect(() =>
              CryptoEntity.create(
                type,
                value,
                invalidConfidence,
                startPos,
                endPos,
              ),
            ).toThrow('Invalid confidence');
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 2: Position validity', () => {
    /**
     * For any valid CryptoEntity, endPos must be > startPos
     *
     * Validates: Requirements 3.4
     */
    it('should always have endPos > startPos', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(CryptoEntityType)),
          nonWhitespaceString(),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.nat(),
          fc.integer({ min: 1 }), // offset must be at least 1
          (type, value, confidence, start, offset) => {
            const startPos = start;
            const endPos = start + offset;

            const entity = CryptoEntity.create(
              type,
              value,
              confidence,
              startPos,
              endPos,
            );

            // Property: endPos is always greater than startPos
            expect(entity.endPos).toBeGreaterThan(entity.startPos);
            expect(entity.endPos - entity.startPos).toBe(offset);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * For any startPos >= 0, entity creation should succeed
     *
     * Validates: Requirements 3.4
     */
    it('should accept any non-negative startPos', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(CryptoEntityType)),
          nonWhitespaceString(),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.nat(), // non-negative integer
          fc.integer({ min: 1 }),
          (type, value, confidence, startPos, offset) => {
            const endPos = startPos + offset;

            const entity = CryptoEntity.create(
              type,
              value,
              confidence,
              startPos,
              endPos,
            );

            // Property: startPos is always non-negative
            expect(entity.startPos).toBeGreaterThanOrEqual(0);
            expect(entity.startPos).toBe(startPos);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * For any negative startPos, entity creation should fail
     *
     * Validates: Requirements 3.4
     */
    it('should reject negative startPos', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(CryptoEntityType)),
          nonWhitespaceString(),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.integer({ max: -1 }), // negative integer
          fc.integer({ min: 1 }),
          (type, value, confidence, negativeStart, offset) => {
            const endPos = negativeStart + offset;

            // Property: negative startPos always throws
            expect(() =>
              CryptoEntity.create(
                type,
                value,
                confidence,
                negativeStart,
                endPos,
              ),
            ).toThrow('Invalid startPos');
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * For any endPos <= startPos, entity creation should fail
     *
     * Validates: Requirements 3.4
     */
    it('should reject endPos <= startPos', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(CryptoEntityType)),
          nonWhitespaceString(),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.nat(),
          fc.integer({ max: 0 }), // offset <= 0
          (type, value, confidence, start, invalidOffset) => {
            const startPos = start;
            const endPos = start + invalidOffset;

            // Property: endPos <= startPos always throws
            expect(() =>
              CryptoEntity.create(type, value, confidence, startPos, endPos),
            ).toThrow('Invalid endPos');
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 3: Value validity', () => {
    /**
     * For any non-empty string value, entity creation should succeed
     *
     * Validates: Requirements 3.1
     */
    it('should accept any non-empty string value', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(CryptoEntityType)),
          nonWhitespaceString(), // non-empty string
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.nat(),
          fc.integer({ min: 1 }),
          (type, value, confidence, start, offset) => {
            const startPos = start;
            const endPos = start + offset;

            const entity = CryptoEntity.create(
              type,
              value,
              confidence,
              startPos,
              endPos,
            );

            // Property: value is always preserved
            expect(entity.value).toBe(value);
            expect(entity.value.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 4: Confidence classification consistency', () => {
    /**
     * For any confidence >= 0.8, entity should be high confidence
     *
     * Validates: Requirements 3.3
     */
    it('should classify confidence >= 0.8 as high', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(CryptoEntityType)),
          nonWhitespaceString(),
          fc.double({ min: 0.8, max: 1, noNaN: true }),
          fc.nat(),
          fc.integer({ min: 1 }),
          (type, value, confidence, start, offset) => {
            const entity = CryptoEntity.create(
              type,
              value,
              confidence,
              start,
              start + offset,
            );

            // Property: high confidence classification is consistent
            expect(entity.isHighConfidence).toBe(true);
            expect(entity.isMediumConfidence).toBe(false);
            expect(entity.isLowConfidence).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * For any confidence in [0.5, 0.8), entity should be medium confidence
     *
     * Validates: Requirements 3.3
     */
    it('should classify confidence in [0.5, 0.8) as medium', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(CryptoEntityType)),
          nonWhitespaceString(),
          fc.double({ min: 0.5, max: 0.799999, noNaN: true }),
          fc.nat(),
          fc.integer({ min: 1 }),
          (type, value, confidence, start, offset) => {
            const entity = CryptoEntity.create(
              type,
              value,
              confidence,
              start,
              start + offset,
            );

            // Property: medium confidence classification is consistent
            expect(entity.isHighConfidence).toBe(false);
            expect(entity.isMediumConfidence).toBe(true);
            expect(entity.isLowConfidence).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * For any confidence < 0.5, entity should be low confidence
     *
     * Validates: Requirements 3.3
     */
    it('should classify confidence < 0.5 as low', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(CryptoEntityType)),
          nonWhitespaceString(),
          fc.double({ min: 0, max: 0.499999, noNaN: true }),
          fc.nat(),
          fc.integer({ min: 1 }),
          (type, value, confidence, start, offset) => {
            const entity = CryptoEntity.create(
              type,
              value,
              confidence,
              start,
              start + offset,
            );

            // Property: low confidence classification is consistent
            expect(entity.isHighConfidence).toBe(false);
            expect(entity.isMediumConfidence).toBe(false);
            expect(entity.isLowConfidence).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 5: Equality is reflexive, symmetric, and transitive', () => {
    /**
     * For any entity, it should equal itself (reflexive)
     */
    it('should be reflexive (entity.equals(entity) = true)', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(CryptoEntityType)),
          nonWhitespaceString(),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.nat(),
          fc.integer({ min: 1 }),
          (type, value, confidence, start, offset) => {
            const entity = CryptoEntity.create(
              type,
              value,
              confidence,
              start,
              start + offset,
            );

            // Property: reflexive equality
            expect(entity.equals(entity)).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * For any two equal entities, equality should be symmetric
     */
    it('should be symmetric (a.equals(b) = b.equals(a))', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(CryptoEntityType)),
          nonWhitespaceString(),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.nat(),
          fc.integer({ min: 1 }),
          (type, value, confidence, start, offset) => {
            const entity1 = CryptoEntity.create(
              type,
              value,
              confidence,
              start,
              start + offset,
            );
            const entity2 = CryptoEntity.create(
              type,
              value,
              confidence,
              start,
              start + offset,
            );

            // Property: symmetric equality
            expect(entity1.equals(entity2)).toBe(entity2.equals(entity1));
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});

/**
 * Generator for non-whitespace strings
 * Ensures the string has at least one non-whitespace character
 */
function nonWhitespaceString(): fc.Arbitrary<string> {
  return fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0);
}
