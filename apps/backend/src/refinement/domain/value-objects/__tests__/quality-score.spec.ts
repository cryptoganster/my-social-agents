import { QualityScore } from '@refinement/domain/value-objects/quality-score';

describe('QualityScore', () => {
  describe('create', () => {
    it('should create a valid QualityScore with all scores in range', () => {
      const score = QualityScore.create(0.8, 0.9, 0.85, 0.75, 0.7);

      expect(score.overall).toBe(0.8);
      expect(score.lengthScore).toBe(0.9);
      expect(score.coherenceScore).toBe(0.85);
      expect(score.relevanceScore).toBe(0.75);
      expect(score.freshnessScore).toBe(0.7);
    });

    it('should create a QualityScore with minimum valid scores (0)', () => {
      const score = QualityScore.create(0, 0, 0, 0, 0);

      expect(score.overall).toBe(0);
      expect(score.lengthScore).toBe(0);
      expect(score.coherenceScore).toBe(0);
      expect(score.relevanceScore).toBe(0);
      expect(score.freshnessScore).toBe(0);
    });

    it('should create a QualityScore with maximum valid scores (1)', () => {
      const score = QualityScore.create(1, 1, 1, 1, 1);

      expect(score.overall).toBe(1);
      expect(score.lengthScore).toBe(1);
      expect(score.coherenceScore).toBe(1);
      expect(score.relevanceScore).toBe(1);
      expect(score.freshnessScore).toBe(1);
    });
  });

  describe('validation', () => {
    describe('overall score validation', () => {
      it('should reject overall score < 0', () => {
        expect(() => QualityScore.create(-0.1, 0.5, 0.5, 0.5, 0.5)).toThrow(
          'Invalid overall score: must be a number between 0 and 1 (inclusive)',
        );
      });

      it('should reject overall score > 1', () => {
        expect(() => QualityScore.create(1.1, 0.5, 0.5, 0.5, 0.5)).toThrow(
          'Invalid overall score: must be a number between 0 and 1 (inclusive)',
        );
      });

      it('should reject NaN overall score', () => {
        expect(() => QualityScore.create(NaN, 0.5, 0.5, 0.5, 0.5)).toThrow(
          'Invalid overall score: must be a number between 0 and 1 (inclusive)',
        );
      });
    });

    describe('lengthScore validation', () => {
      it('should reject lengthScore < 0', () => {
        expect(() => QualityScore.create(0.5, -0.1, 0.5, 0.5, 0.5)).toThrow(
          'Invalid lengthScore: must be a number between 0 and 1 (inclusive)',
        );
      });

      it('should reject lengthScore > 1', () => {
        expect(() => QualityScore.create(0.5, 1.1, 0.5, 0.5, 0.5)).toThrow(
          'Invalid lengthScore: must be a number between 0 and 1 (inclusive)',
        );
      });

      it('should reject NaN lengthScore', () => {
        expect(() => QualityScore.create(0.5, NaN, 0.5, 0.5, 0.5)).toThrow(
          'Invalid lengthScore: must be a number between 0 and 1 (inclusive)',
        );
      });
    });

    describe('coherenceScore validation', () => {
      it('should reject coherenceScore < 0', () => {
        expect(() => QualityScore.create(0.5, 0.5, -0.1, 0.5, 0.5)).toThrow(
          'Invalid coherenceScore: must be a number between 0 and 1 (inclusive)',
        );
      });

      it('should reject coherenceScore > 1', () => {
        expect(() => QualityScore.create(0.5, 0.5, 1.1, 0.5, 0.5)).toThrow(
          'Invalid coherenceScore: must be a number between 0 and 1 (inclusive)',
        );
      });

      it('should reject NaN coherenceScore', () => {
        expect(() => QualityScore.create(0.5, 0.5, NaN, 0.5, 0.5)).toThrow(
          'Invalid coherenceScore: must be a number between 0 and 1 (inclusive)',
        );
      });
    });

    describe('relevanceScore validation', () => {
      it('should reject relevanceScore < 0', () => {
        expect(() => QualityScore.create(0.5, 0.5, 0.5, -0.1, 0.5)).toThrow(
          'Invalid relevanceScore: must be a number between 0 and 1 (inclusive)',
        );
      });

      it('should reject relevanceScore > 1', () => {
        expect(() => QualityScore.create(0.5, 0.5, 0.5, 1.1, 0.5)).toThrow(
          'Invalid relevanceScore: must be a number between 0 and 1 (inclusive)',
        );
      });

      it('should reject NaN relevanceScore', () => {
        expect(() => QualityScore.create(0.5, 0.5, 0.5, NaN, 0.5)).toThrow(
          'Invalid relevanceScore: must be a number between 0 and 1 (inclusive)',
        );
      });
    });

    describe('freshnessScore validation', () => {
      it('should reject freshnessScore < 0', () => {
        expect(() => QualityScore.create(0.5, 0.5, 0.5, 0.5, -0.1)).toThrow(
          'Invalid freshnessScore: must be a number between 0 and 1 (inclusive)',
        );
      });

      it('should reject freshnessScore > 1', () => {
        expect(() => QualityScore.create(0.5, 0.5, 0.5, 0.5, 1.1)).toThrow(
          'Invalid freshnessScore: must be a number between 0 and 1 (inclusive)',
        );
      });

      it('should reject NaN freshnessScore', () => {
        expect(() => QualityScore.create(0.5, 0.5, 0.5, 0.5, NaN)).toThrow(
          'Invalid freshnessScore: must be a number between 0 and 1 (inclusive)',
        );
      });
    });
  });

  describe('quality classification', () => {
    describe('isHighQuality', () => {
      it('should return true for overall > 0.7', () => {
        const score = QualityScore.create(0.71, 0.8, 0.8, 0.8, 0.8);
        expect(score.isHighQuality).toBe(true);
      });

      it('should return true for overall = 0.8', () => {
        const score = QualityScore.create(0.8, 0.8, 0.8, 0.8, 0.8);
        expect(score.isHighQuality).toBe(true);
      });

      it('should return false for overall = 0.7', () => {
        const score = QualityScore.create(0.7, 0.7, 0.7, 0.7, 0.7);
        expect(score.isHighQuality).toBe(false);
      });

      it('should return false for overall < 0.7', () => {
        const score = QualityScore.create(0.69, 0.7, 0.7, 0.7, 0.7);
        expect(score.isHighQuality).toBe(false);
      });
    });

    describe('isMediumQuality', () => {
      it('should return true for overall = 0.5', () => {
        const score = QualityScore.create(0.5, 0.5, 0.5, 0.5, 0.5);
        expect(score.isMediumQuality).toBe(true);
      });

      it('should return true for overall = 0.6', () => {
        const score = QualityScore.create(0.6, 0.6, 0.6, 0.6, 0.6);
        expect(score.isMediumQuality).toBe(true);
      });

      it('should return true for overall = 0.7', () => {
        const score = QualityScore.create(0.7, 0.7, 0.7, 0.7, 0.7);
        expect(score.isMediumQuality).toBe(true);
      });

      it('should return false for overall < 0.5', () => {
        const score = QualityScore.create(0.49, 0.5, 0.5, 0.5, 0.5);
        expect(score.isMediumQuality).toBe(false);
      });

      it('should return false for overall > 0.7', () => {
        const score = QualityScore.create(0.71, 0.7, 0.7, 0.7, 0.7);
        expect(score.isMediumQuality).toBe(false);
      });
    });

    describe('isLowQuality', () => {
      it('should return true for overall = 0.3', () => {
        const score = QualityScore.create(0.3, 0.3, 0.3, 0.3, 0.3);
        expect(score.isLowQuality).toBe(true);
      });

      it('should return true for overall = 0.4', () => {
        const score = QualityScore.create(0.4, 0.4, 0.4, 0.4, 0.4);
        expect(score.isLowQuality).toBe(true);
      });

      it('should return true for overall = 0.49', () => {
        const score = QualityScore.create(0.49, 0.4, 0.4, 0.4, 0.4);
        expect(score.isLowQuality).toBe(true);
      });

      it('should return false for overall < 0.3', () => {
        const score = QualityScore.create(0.29, 0.3, 0.3, 0.3, 0.3);
        expect(score.isLowQuality).toBe(false);
      });

      it('should return false for overall >= 0.5', () => {
        const score = QualityScore.create(0.5, 0.5, 0.5, 0.5, 0.5);
        expect(score.isLowQuality).toBe(false);
      });
    });

    describe('isRejected', () => {
      it('should return true for overall < 0.3', () => {
        const score = QualityScore.create(0.29, 0.3, 0.3, 0.3, 0.3);
        expect(score.isRejected).toBe(true);
      });

      it('should return true for overall = 0.2', () => {
        const score = QualityScore.create(0.2, 0.2, 0.2, 0.2, 0.2);
        expect(score.isRejected).toBe(true);
      });

      it('should return true for overall = 0', () => {
        const score = QualityScore.create(0, 0, 0, 0, 0);
        expect(score.isRejected).toBe(true);
      });

      it('should return false for overall = 0.3', () => {
        const score = QualityScore.create(0.3, 0.3, 0.3, 0.3, 0.3);
        expect(score.isRejected).toBe(false);
      });

      it('should return false for overall > 0.3', () => {
        const score = QualityScore.create(0.31, 0.3, 0.3, 0.3, 0.3);
        expect(score.isRejected).toBe(false);
      });
    });

    describe('boundary cases', () => {
      it('should classify 0.7 as medium quality (not high)', () => {
        const score = QualityScore.create(0.7, 0.7, 0.7, 0.7, 0.7);
        expect(score.isHighQuality).toBe(false);
        expect(score.isMediumQuality).toBe(true);
        expect(score.isLowQuality).toBe(false);
        expect(score.isRejected).toBe(false);
      });

      it('should classify 0.5 as medium quality (not low)', () => {
        const score = QualityScore.create(0.5, 0.5, 0.5, 0.5, 0.5);
        expect(score.isHighQuality).toBe(false);
        expect(score.isMediumQuality).toBe(true);
        expect(score.isLowQuality).toBe(false);
        expect(score.isRejected).toBe(false);
      });

      it('should classify 0.3 as low quality (not rejected)', () => {
        const score = QualityScore.create(0.3, 0.3, 0.3, 0.3, 0.3);
        expect(score.isHighQuality).toBe(false);
        expect(score.isMediumQuality).toBe(false);
        expect(score.isLowQuality).toBe(true);
        expect(score.isRejected).toBe(false);
      });
    });
  });

  describe('equals', () => {
    it('should return true for identical scores', () => {
      const score1 = QualityScore.create(0.8, 0.9, 0.85, 0.75, 0.7);
      const score2 = QualityScore.create(0.8, 0.9, 0.85, 0.75, 0.7);

      expect(score1.equals(score2)).toBe(true);
    });

    it('should return false for different overall scores', () => {
      const score1 = QualityScore.create(0.8, 0.9, 0.85, 0.75, 0.7);
      const score2 = QualityScore.create(0.7, 0.9, 0.85, 0.75, 0.7);

      expect(score1.equals(score2)).toBe(false);
    });

    it('should return false for different component scores', () => {
      const score1 = QualityScore.create(0.8, 0.9, 0.85, 0.75, 0.7);
      const score2 = QualityScore.create(0.8, 0.8, 0.85, 0.75, 0.7);

      expect(score1.equals(score2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return a formatted string representation', () => {
      const score = QualityScore.create(0.8, 0.9, 0.85, 0.75, 0.7);

      const result = score.toString();

      expect(result).toBe(
        'QualityScore(overall=0.80, length=0.90, coherence=0.85, relevance=0.75, freshness=0.70)',
      );
    });

    it('should format scores with 2 decimal places', () => {
      const score = QualityScore.create(0.123, 0.456, 0.789, 0.111, 0.999);

      const result = score.toString();

      expect(result).toBe(
        'QualityScore(overall=0.12, length=0.46, coherence=0.79, relevance=0.11, freshness=1.00)',
      );
    });
  });

  describe('immutability', () => {
    it('should not allow modification of scores', () => {
      const score = QualityScore.create(0.8, 0.9, 0.85, 0.75, 0.7);

      expect(() => {
        // @ts-expect-error - Testing immutability
        score.overall = 0.5;
      }).toThrow();
    });
  });
});
