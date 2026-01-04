import * as fc from 'fast-check';
import { AssetTag } from '../asset-tag';

describe('AssetTag', () => {
  describe('Property Tests', () => {
    it('should accept valid asset tags with confidence 0-1', () => {
      const assetTagArbitrary = fc.record({
        symbol: fc
          .string({ minLength: 1, maxLength: 10 })
          .filter((s) => /^[A-Za-z]+$/.test(s)),
        confidence: fc.double({ min: 0, max: 1, noNaN: true }),
      });

      fc.assert(
        fc.property(assetTagArbitrary, (props) => {
          const tag = AssetTag.create(props);
          expect(tag.symbol).toBe(props.symbol.toUpperCase());
          expect(tag.confidence).toBeCloseTo(props.confidence, 10);
        }),
        { numRuns: 100 },
      );
    });

    it('should normalize symbols to uppercase', () => {
      const symbolArbitrary = fc
        .string({ minLength: 1, maxLength: 10 })
        .filter((s) => /^[A-Za-z]+$/.test(s));

      fc.assert(
        fc.property(symbolArbitrary, (symbol) => {
          const tag = AssetTag.create({ symbol, confidence: 0.5 });
          expect(tag.symbol).toBe(symbol.toUpperCase());
          expect(tag.symbol).toMatch(/^[A-Z]+$/);
        }),
        { numRuns: 100 },
      );
    });

    it('should correctly classify confidence levels', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1, noNaN: true }),
          (confidence) => {
            const tag = AssetTag.create({ symbol: 'BTC', confidence });

            const isHigh = tag.isHighConfidence();
            const isMedium = tag.isMediumConfidence();
            const isLow = tag.isLowConfidence();

            // Exactly one should be true
            const trueCount = [isHigh, isMedium, isLow].filter(Boolean).length;
            expect(trueCount).toBe(1);

            // Verify classification
            if (confidence > 0.8) {
              expect(isHigh).toBe(true);
            } else if (confidence >= 0.5 && confidence <= 0.8) {
              expect(isMedium).toBe(true);
            } else {
              expect(isLow).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should maintain equality for identical tags', () => {
      const assetTagArbitrary = fc.record({
        symbol: fc
          .string({ minLength: 1, maxLength: 10 })
          .filter((s) => /^[A-Za-z]+$/.test(s)),
        confidence: fc.double({ min: 0, max: 1, noNaN: true }),
      });

      fc.assert(
        fc.property(assetTagArbitrary, (props) => {
          const tag1 = AssetTag.create(props);
          const tag2 = AssetTag.create(props);

          expect(tag1.equals(tag2)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Unit Tests', () => {
    it('should create asset tag with valid properties', () => {
      const tag = AssetTag.create({ symbol: 'BTC', confidence: 0.95 });

      expect(tag.symbol).toBe('BTC');
      expect(tag.confidence).toBe(0.95);
    });

    it('should normalize symbol to uppercase', () => {
      const tag = AssetTag.create({ symbol: 'btc', confidence: 0.5 });
      expect(tag.symbol).toBe('BTC');
    });

    it('should throw error for empty symbol', () => {
      expect(() => AssetTag.create({ symbol: '', confidence: 0.5 })).toThrow(
        'Asset symbol cannot be empty',
      );
    });

    it('should throw error for symbol exceeding 10 characters', () => {
      expect(() =>
        AssetTag.create({ symbol: 'VERYLONGSYMBOL', confidence: 0.5 }),
      ).toThrow('Asset symbol cannot exceed 10 characters');
    });

    it('should throw error for non-alphabetic symbol', () => {
      expect(() =>
        AssetTag.create({ symbol: 'BTC123', confidence: 0.5 }),
      ).toThrow('Asset symbol must contain only uppercase letters');
    });

    it('should throw error for confidence below 0', () => {
      expect(() =>
        AssetTag.create({ symbol: 'BTC', confidence: -0.1 }),
      ).toThrow('Confidence must be between 0.0 and 1.0');
    });

    it('should throw error for confidence above 1', () => {
      expect(() => AssetTag.create({ symbol: 'BTC', confidence: 1.1 })).toThrow(
        'Confidence must be between 0.0 and 1.0',
      );
    });

    it('should identify high confidence tags', () => {
      const highTag = AssetTag.create({ symbol: 'BTC', confidence: 0.9 });
      expect(highTag.isHighConfidence()).toBe(true);
      expect(highTag.isMediumConfidence()).toBe(false);
      expect(highTag.isLowConfidence()).toBe(false);
    });

    it('should identify medium confidence tags', () => {
      const mediumTag = AssetTag.create({ symbol: 'ETH', confidence: 0.6 });
      expect(mediumTag.isHighConfidence()).toBe(false);
      expect(mediumTag.isMediumConfidence()).toBe(true);
      expect(mediumTag.isLowConfidence()).toBe(false);
    });

    it('should identify low confidence tags', () => {
      const lowTag = AssetTag.create({ symbol: 'XRP', confidence: 0.3 });
      expect(lowTag.isHighConfidence()).toBe(false);
      expect(lowTag.isMediumConfidence()).toBe(false);
      expect(lowTag.isLowConfidence()).toBe(true);
    });

    it('should handle boundary confidence values', () => {
      const boundary1 = AssetTag.create({ symbol: 'BTC', confidence: 0.8 });
      expect(boundary1.isMediumConfidence()).toBe(true);

      const boundary2 = AssetTag.create({ symbol: 'BTC', confidence: 0.5 });
      expect(boundary2.isMediumConfidence()).toBe(true);
    });

    it('should check equality correctly', () => {
      const tag1 = AssetTag.create({ symbol: 'BTC', confidence: 0.95 });
      const tag2 = AssetTag.create({ symbol: 'BTC', confidence: 0.95 });
      const tag3 = AssetTag.create({ symbol: 'ETH', confidence: 0.95 });
      const tag4 = AssetTag.create({ symbol: 'BTC', confidence: 0.85 });

      expect(tag1.equals(tag2)).toBe(true);
      expect(tag1.equals(tag3)).toBe(false);
      expect(tag1.equals(tag4)).toBe(false);
    });

    it('should handle float comparison with epsilon', () => {
      const tag1 = AssetTag.create({ symbol: 'BTC', confidence: 0.95 });
      const tag2 = AssetTag.create({ symbol: 'BTC', confidence: 0.95 });

      expect(tag1.equals(tag2)).toBe(true);
    });

    it('should convert to string with percentage', () => {
      const tag = AssetTag.create({ symbol: 'BTC', confidence: 0.95 });
      expect(tag.toString()).toBe('BTC (95.0%)');
    });

    it('should convert to object', () => {
      const tag = AssetTag.create({ symbol: 'BTC', confidence: 0.95 });
      const obj = tag.toObject();

      expect(obj.symbol).toBe('BTC');
      expect(obj.confidence).toBe(0.95);
    });
  });
});
