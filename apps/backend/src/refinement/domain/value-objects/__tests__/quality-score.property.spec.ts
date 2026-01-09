import * as fc from 'fast-check';
import { QualityScore } from '@refinement/domain/value-objects/quality-score';

/**
 * Property-Based Tests for QualityScore
 *
 * These tests verify universal properties that should hold for all valid inputs.
 * We use fast-check to generate random test cases and verify correctness properties.
 *
 * Feature: refinement-bc
 * Requirements: Refinement 5.1 (Quality Score Calculation)
 */
describe('QualityScore - Property-Based Tests', () => {
  /**
   * Property 1: Score Bounds
   *
   * For any valid QualityScore, all component scores must be in [0, 1]
   *
   * Validates: Requirements 5.1
   */
  describe('Property 1: Score Bounds', () => {
    it('should always have all scores between 0 and 1', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          (overall, length, coherence, relevance, freshness) => {
            const score = QualityScore.create(
              overall,
              length,
              coherence,
              relevance,
              freshness,
            );

            // All scores must be in valid range
            expect(score.overall).toBeGreaterThanOrEqual(0);
            expect(score.overall).toBeLessThanOrEqual(1);
            expect(score.lengthScore).toBeGreaterThanOrEqual(0);
            expect(score.lengthScore).toBeLessThanOrEqual(1);
            expect(score.coherenceScore).toBeGreaterThanOrEqual(0);
            expect(score.coherenceScore).toBeLessThanOrEqual(1);
            expect(score.relevanceScore).toBeGreaterThanOrEqual(0);
            expect(score.relevanceScore).toBeLessThanOrEqual(1);
            expect(score.freshnessScore).toBeGreaterThanOrEqual(0);
            expect(score.freshnessScore).toBeLessThanOrEqual(1);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 2: Invalid Scores Rejection
   *
   * For any score outside [0, 1], creation should fail
   *
   * Validates: Requirements 5.1
   */
  describe('Property 2: Invalid Scores Rejection', () => {
    it('should reject any overall score outside [0, 1]', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.double({ min: -1000, max: -0.001, noNaN: true }),
            fc.double({ min: 1.001, max: 1000, noNaN: true }),
          ),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          (overall, length, coherence, relevance, freshness) => {
            expect(() =>
              QualityScore.create(
                overall,
                length,
                coherence,
                relevance,
                freshness,
              ),
            ).toThrow();
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should reject any lengthScore outside [0, 1]', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.oneof(
            fc.double({ min: -1000, max: -0.001, noNaN: true }),
            fc.double({ min: 1.001, max: 1000, noNaN: true }),
          ),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          (overall, length, coherence, relevance, freshness) => {
            expect(() =>
              QualityScore.create(
                overall,
                length,
                coherence,
                relevance,
                freshness,
              ),
            ).toThrow();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 3: Quality Classification Consistency
   *
   * For any QualityScore, exactly one quality classification should be true
   * (or isRejected for scores < 0.3)
   *
   * Validates: Requirements 5.5
   */
  describe('Property 3: Quality Classification Consistency', () => {
    it('should have exactly one quality classification true', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          (overall, length, coherence, relevance, freshness) => {
            const score = QualityScore.create(
              overall,
              length,
              coherence,
              relevance,
              freshness,
            );

            const classifications = [
              score.isHighQuality,
              score.isMediumQuality,
              score.isLowQuality,
              score.isRejected,
            ];

            // Exactly one classification should be true
            const trueCount = classifications.filter((c) => c).length;
            expect(trueCount).toBe(1);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 4: Quality Threshold Boundaries
   *
   * For any QualityScore, quality classifications should respect threshold boundaries
   *
   * Validates: Requirements 5.5
   */
  describe('Property 4: Quality Threshold Boundaries', () => {
    it('should classify high quality correctly (> 0.7)', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.701, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          (overall, length, coherence, relevance, freshness) => {
            const score = QualityScore.create(
              overall,
              length,
              coherence,
              relevance,
              freshness,
            );

            expect(score.isHighQuality).toBe(true);
            expect(score.isMediumQuality).toBe(false);
            expect(score.isLowQuality).toBe(false);
            expect(score.isRejected).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should classify medium quality correctly (0.5 <= overall <= 0.7)', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.5, max: 0.7, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          (overall, length, coherence, relevance, freshness) => {
            const score = QualityScore.create(
              overall,
              length,
              coherence,
              relevance,
              freshness,
            );

            expect(score.isHighQuality).toBe(false);
            expect(score.isMediumQuality).toBe(true);
            expect(score.isLowQuality).toBe(false);
            expect(score.isRejected).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should classify low quality correctly (0.3 <= overall < 0.5)', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.3, max: 0.499, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          (overall, length, coherence, relevance, freshness) => {
            const score = QualityScore.create(
              overall,
              length,
              coherence,
              relevance,
              freshness,
            );

            expect(score.isHighQuality).toBe(false);
            expect(score.isMediumQuality).toBe(false);
            expect(score.isLowQuality).toBe(true);
            expect(score.isRejected).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should classify rejected correctly (< 0.3)', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 0.299, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          (overall, length, coherence, relevance, freshness) => {
            const score = QualityScore.create(
              overall,
              length,
              coherence,
              relevance,
              freshness,
            );

            expect(score.isHighQuality).toBe(false);
            expect(score.isMediumQuality).toBe(false);
            expect(score.isLowQuality).toBe(false);
            expect(score.isRejected).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 5: Value Object Equality
   *
   * For any two QualityScores with identical properties, equals() should return true
   *
   * Validates: Value Object equality semantics
   */
  describe('Property 5: Value Object Equality', () => {
    it('should be equal when all properties are identical', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          (overall, length, coherence, relevance, freshness) => {
            const score1 = QualityScore.create(
              overall,
              length,
              coherence,
              relevance,
              freshness,
            );
            const score2 = QualityScore.create(
              overall,
              length,
              coherence,
              relevance,
              freshness,
            );

            expect(score1.equals(score2)).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should not be equal when any property differs', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          (overall1, overall2, length, coherence, relevance, freshness) => {
            // Skip if overall scores are equal
            fc.pre(Math.abs(overall1 - overall2) > 0.001);

            const score1 = QualityScore.create(
              overall1,
              length,
              coherence,
              relevance,
              freshness,
            );
            const score2 = QualityScore.create(
              overall2,
              length,
              coherence,
              relevance,
              freshness,
            );

            expect(score1.equals(score2)).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 6: Immutability
   *
   * For any QualityScore, the object should be immutable
   *
   * Validates: Value Object immutability
   */
  describe('Property 6: Immutability', () => {
    it('should be frozen and immutable', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          (overall, length, coherence, relevance, freshness) => {
            const score = QualityScore.create(
              overall,
              length,
              coherence,
              relevance,
              freshness,
            );

            expect(Object.isFrozen(score)).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
