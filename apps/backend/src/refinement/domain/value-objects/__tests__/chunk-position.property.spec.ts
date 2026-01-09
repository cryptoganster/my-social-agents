import * as fc from 'fast-check';
import { ChunkPosition } from '@refinement/domain/value-objects/chunk-position';

/**
 * Property-Based Tests for ChunkPosition
 *
 * Feature: refinement-bc, Property 1: Position ordering invariant
 * Validates: Requirements 3.1, 3.2
 *
 * These tests verify universal properties that must hold for ALL valid chunk positions.
 */
describe('ChunkPosition - Property-Based Tests', () => {
  /**
   * Property 1: Position ordering invariant
   * For any valid chunk position, endOffset must always be greater than startOffset
   */
  describe('Property 1: Position ordering invariant', () => {
    it('should always have endOffset > startOffset for any valid position', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }), // index
          fc.integer({ min: 0, max: 10000 }), // startOffset
          fc.integer({ min: 1, max: 1000 }), // length (to ensure endOffset > startOffset)
          (index, startOffset, length) => {
            const endOffset = startOffset + length;
            const position = ChunkPosition.create(
              index,
              startOffset,
              endOffset,
            );

            // Invariant: endOffset must always be greater than startOffset
            expect(position.endOffset).toBeGreaterThan(position.startOffset);
            expect(position.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 2: Length calculation consistency
   * For any chunk position, length should always equal endOffset - startOffset
   */
  describe('Property 2: Length calculation consistency', () => {
    it('should always calculate length as endOffset - startOffset', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 10000 }),
          fc.integer({ min: 1, max: 1000 }),
          (index, startOffset, length) => {
            const endOffset = startOffset + length;
            const position = ChunkPosition.create(
              index,
              startOffset,
              endOffset,
            );

            expect(position.length).toBe(endOffset - startOffset);
            expect(position.length).toBe(
              position.endOffset - position.startOffset,
            );
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 3: Equality is reflexive
   * For any chunk position, it should equal itself
   */
  describe('Property 3: Equality is reflexive', () => {
    it('should always equal itself', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 10000 }),
          fc.integer({ min: 1, max: 1000 }),
          (index, startOffset, length) => {
            const endOffset = startOffset + length;
            const position = ChunkPosition.create(
              index,
              startOffset,
              endOffset,
            );

            expect(position.equals(position)).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 4: Equality is symmetric
   * For any two equal positions, if A equals B, then B equals A
   */
  describe('Property 4: Equality is symmetric', () => {
    it('should be symmetric (if A equals B, then B equals A)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 10000 }),
          fc.integer({ min: 1, max: 1000 }),
          (index, startOffset, length) => {
            const endOffset = startOffset + length;
            const position1 = ChunkPosition.create(
              index,
              startOffset,
              endOffset,
            );
            const position2 = ChunkPosition.create(
              index,
              startOffset,
              endOffset,
            );

            expect(position1.equals(position2)).toBe(
              position2.equals(position1),
            );
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 5: Equality is transitive
   * For any three positions, if A equals B and B equals C, then A equals C
   */
  describe('Property 5: Equality is transitive', () => {
    it('should be transitive (if A=B and B=C, then A=C)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 10000 }),
          fc.integer({ min: 1, max: 1000 }),
          (index, startOffset, length) => {
            const endOffset = startOffset + length;
            const positionA = ChunkPosition.create(
              index,
              startOffset,
              endOffset,
            );
            const positionB = ChunkPosition.create(
              index,
              startOffset,
              endOffset,
            );
            const positionC = ChunkPosition.create(
              index,
              startOffset,
              endOffset,
            );

            if (positionA.equals(positionB) && positionB.equals(positionC)) {
              expect(positionA.equals(positionC)).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 6: Index ordering consistency
   * For any two positions, isBefore and isAfter should be consistent with index comparison
   */
  describe('Property 6: Index ordering consistency', () => {
    it('should have consistent isBefore/isAfter with index comparison', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 10000 }),
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 0, max: 10000 }),
          fc.integer({ min: 1, max: 1000 }),
          (index1, index2, start1, len1, start2, len2) => {
            const position1 = ChunkPosition.create(
              index1,
              start1,
              start1 + len1,
            );
            const position2 = ChunkPosition.create(
              index2,
              start2,
              start2 + len2,
            );

            if (index1 < index2) {
              expect(position1.isBefore(position2)).toBe(true);
              expect(position1.isAfter(position2)).toBe(false);
            } else if (index1 > index2) {
              expect(position1.isBefore(position2)).toBe(false);
              expect(position1.isAfter(position2)).toBe(true);
            } else {
              expect(position1.isBefore(position2)).toBe(false);
              expect(position1.isAfter(position2)).toBe(false);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 7: Adjacency is symmetric
   * For any two positions, if A is adjacent to B, then B is adjacent to A
   */
  describe('Property 7: Adjacency is symmetric', () => {
    it('should have symmetric adjacency', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 10000 }),
          fc.integer({ min: 1, max: 1000 }),
          (index1, index2, startOffset, length) => {
            const position1 = ChunkPosition.create(
              index1,
              startOffset,
              startOffset + length,
            );
            const position2 = ChunkPosition.create(
              index2,
              startOffset + length,
              startOffset + length + 100,
            );

            expect(position1.isAdjacentTo(position2)).toBe(
              position2.isAdjacentTo(position1),
            );
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 8: Non-negative values
   * For any valid position, all numeric values must be non-negative
   */
  describe('Property 8: Non-negative values', () => {
    it('should always have non-negative index, startOffset, and endOffset', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 10000 }),
          fc.integer({ min: 1, max: 1000 }),
          (index, startOffset, length) => {
            const endOffset = startOffset + length;
            const position = ChunkPosition.create(
              index,
              startOffset,
              endOffset,
            );

            expect(position.index).toBeGreaterThanOrEqual(0);
            expect(position.startOffset).toBeGreaterThanOrEqual(0);
            expect(position.endOffset).toBeGreaterThanOrEqual(0);
            expect(position.length).toBeGreaterThanOrEqual(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 9: Immutability
   * For any position, creating a new position with same values should be equal but not same instance
   */
  describe('Property 9: Immutability', () => {
    it('should create independent instances with same values', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 10000 }),
          fc.integer({ min: 1, max: 1000 }),
          (index, startOffset, length) => {
            const endOffset = startOffset + length;
            const position1 = ChunkPosition.create(
              index,
              startOffset,
              endOffset,
            );
            const position2 = ChunkPosition.create(
              index,
              startOffset,
              endOffset,
            );

            expect(position1.equals(position2)).toBe(true);
            expect(position1).not.toBe(position2); // Different instances
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 10: toString contains all key information
   * For any position, toString should contain index, start, end, and length
   */
  describe('Property 10: toString contains all key information', () => {
    it('should include all key values in string representation', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 10000 }),
          fc.integer({ min: 1, max: 1000 }),
          (index, startOffset, length) => {
            const endOffset = startOffset + length;
            const position = ChunkPosition.create(
              index,
              startOffset,
              endOffset,
            );
            const str = position.toString();

            expect(str).toContain(`index=${index}`);
            expect(str).toContain(`start=${startOffset}`);
            expect(str).toContain(`end=${endOffset}`);
            expect(str).toContain(`length=${length}`);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
