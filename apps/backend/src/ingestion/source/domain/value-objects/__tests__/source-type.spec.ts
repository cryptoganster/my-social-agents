import * as fc from 'fast-check';
import { SourceType, SourceTypeEnum } from '../source-type';

describe('SourceType', () => {
  describe('Property Tests', () => {
    it('should accept all valid source type values', () => {
      const validTypes = Object.values(SourceTypeEnum);

      fc.assert(
        fc.property(fc.constantFrom(...validTypes), (typeValue) => {
          const sourceType = SourceType.fromEnum(typeValue);
          expect(sourceType.isValid()).toBe(true);
          expect(sourceType.getValue()).toBe(typeValue);
        }),
        { numRuns: 100 },
      );
    });

    it('should consistently determine auth requirements', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(SourceTypeEnum)),
          (typeValue) => {
            const sourceType1 = SourceType.fromEnum(typeValue);
            const sourceType2 = SourceType.fromEnum(typeValue);

            expect(sourceType1.requiresAuth()).toBe(sourceType2.requiresAuth());
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should maintain equality for same type values', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(SourceTypeEnum)),
          (typeValue) => {
            const sourceType1 = SourceType.fromEnum(typeValue);
            const sourceType2 = SourceType.fromEnum(typeValue);

            expect(sourceType1.equals(sourceType2)).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Unit Tests', () => {
    it('should create source type from string', () => {
      const sourceType = SourceType.fromString('WEB');
      expect(sourceType.getValue()).toBe(SourceTypeEnum.WEB);
    });

    it('should create source type from string case-insensitive', () => {
      const sourceType = SourceType.fromString('web');
      expect(sourceType.getValue()).toBe(SourceTypeEnum.WEB);
    });

    it('should create source type from enum', () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.RSS);
      expect(sourceType.getValue()).toBe(SourceTypeEnum.RSS);
    });

    it('should throw error for invalid source type string', () => {
      expect(() => SourceType.fromString('INVALID')).toThrow(
        'Invalid source type',
      );
    });

    it('should validate all source types as valid', () => {
      Object.values(SourceTypeEnum).forEach((type) => {
        const sourceType = SourceType.fromEnum(type);
        expect(sourceType.isValid()).toBe(true);
      });
    });

    it('should identify auth-required source types', () => {
      expect(
        SourceType.fromEnum(SourceTypeEnum.SOCIAL_MEDIA).requiresAuth(),
      ).toBe(true);
      expect(SourceType.fromEnum(SourceTypeEnum.WIKIPEDIA).requiresAuth()).toBe(
        true,
      );
    });

    it('should identify non-auth source types', () => {
      expect(SourceType.fromEnum(SourceTypeEnum.WEB).requiresAuth()).toBe(
        false,
      );
      expect(SourceType.fromEnum(SourceTypeEnum.RSS).requiresAuth()).toBe(
        false,
      );
      expect(SourceType.fromEnum(SourceTypeEnum.PDF).requiresAuth()).toBe(
        false,
      );
      expect(SourceType.fromEnum(SourceTypeEnum.OCR).requiresAuth()).toBe(
        false,
      );
    });

    it('should check equality correctly', () => {
      const type1 = SourceType.fromEnum(SourceTypeEnum.WEB);
      const type2 = SourceType.fromEnum(SourceTypeEnum.WEB);
      const type3 = SourceType.fromEnum(SourceTypeEnum.RSS);

      expect(type1.equals(type2)).toBe(true);
      expect(type1.equals(type3)).toBe(false);
    });

    it('should convert to string', () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      expect(sourceType.toString()).toBe('WEB');
    });
  });
});
