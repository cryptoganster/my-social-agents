import { CryptoEntity } from '@refinement/domain/value-objects/crypto-entity';
import { CryptoEntityType } from '@refinement/domain/value-objects/crypto-entity-type';

describe('CryptoEntity', () => {
  describe('Factory Methods', () => {
    describe('create() - generic factory', () => {
      it('should create entity with any type', () => {
        const entity = CryptoEntity.create(
          CryptoEntityType.PERSON,
          'Vitalik Buterin',
          0.95,
          0,
          15,
        );

        expect(entity.type).toBe(CryptoEntityType.PERSON);
        expect(entity.value).toBe('Vitalik Buterin');
        expect(entity.confidence).toBe(0.95);
      });
    });

    describe('token()', () => {
      it('should create a token entity', () => {
        const entity = CryptoEntity.token('Bitcoin', 1.0, 0, 7);

        expect(entity.type).toBe(CryptoEntityType.TOKEN);
        expect(entity.value).toBe('Bitcoin');
        expect(entity.confidence).toBe(1.0);
        expect(entity.startPos).toBe(0);
        expect(entity.endPos).toBe(7);
      });

      it('should create a token with partial confidence', () => {
        const entity = CryptoEntity.token('BTC', 0.85, 10, 13);

        expect(entity.type).toBe(CryptoEntityType.TOKEN);
        expect(entity.value).toBe('BTC');
        expect(entity.confidence).toBe(0.85);
      });
    });

    describe('exchange()', () => {
      it('should create an exchange entity', () => {
        const entity = CryptoEntity.exchange('Binance', 1.0, 0, 7);

        expect(entity.type).toBe(CryptoEntityType.EXCHANGE);
        expect(entity.value).toBe('Binance');
        expect(entity.confidence).toBe(1.0);
        expect(entity.startPos).toBe(0);
        expect(entity.endPos).toBe(7);
      });
    });

    describe('blockchain()', () => {
      it('should create a blockchain entity', () => {
        const entity = CryptoEntity.blockchain('Ethereum', 1.0, 0, 8);

        expect(entity.type).toBe(CryptoEntityType.BLOCKCHAIN);
        expect(entity.value).toBe('Ethereum');
        expect(entity.confidence).toBe(1.0);
        expect(entity.startPos).toBe(0);
        expect(entity.endPos).toBe(8);
      });
    });

    describe('protocol()', () => {
      it('should create a protocol entity', () => {
        const entity = CryptoEntity.protocol('Uniswap', 0.95, 0, 7);

        expect(entity.type).toBe(CryptoEntityType.PROTOCOL);
        expect(entity.value).toBe('Uniswap');
        expect(entity.confidence).toBe(0.95);
        expect(entity.startPos).toBe(0);
        expect(entity.endPos).toBe(7);
      });
    });

    // New entity types
    describe('person()', () => {
      it('should create a person entity', () => {
        const entity = CryptoEntity.person('Satoshi Nakamoto', 0.9, 0, 16);

        expect(entity.type).toBe(CryptoEntityType.PERSON);
        expect(entity.value).toBe('Satoshi Nakamoto');
        expect(entity.confidence).toBe(0.9);
      });
    });

    describe('regulatoryBody()', () => {
      it('should create a regulatory body entity', () => {
        const entity = CryptoEntity.regulatoryBody('SEC', 1.0, 0, 3);

        expect(entity.type).toBe(CryptoEntityType.REGULATORY_BODY);
        expect(entity.value).toBe('SEC');
        expect(entity.confidence).toBe(1.0);
      });
    });

    describe('government()', () => {
      it('should create a government entity', () => {
        const entity = CryptoEntity.government('El Salvador', 1.0, 0, 11);

        expect(entity.type).toBe(CryptoEntityType.GOVERNMENT);
        expect(entity.value).toBe('El Salvador');
        expect(entity.confidence).toBe(1.0);
      });
    });

    describe('securityEvent()', () => {
      it('should create a security event entity', () => {
        const entity = CryptoEntity.securityEvent('hack', 0.95, 0, 4);

        expect(entity.type).toBe(CryptoEntityType.SECURITY_EVENT);
        expect(entity.value).toBe('hack');
        expect(entity.confidence).toBe(0.95);
      });
    });

    describe('economicIndicator()', () => {
      it('should create an economic indicator entity', () => {
        const entity = CryptoEntity.economicIndicator(
          'interest rates',
          0.9,
          0,
          14,
        );

        expect(entity.type).toBe(CryptoEntityType.ECONOMIC_INDICATOR);
        expect(entity.value).toBe('interest rates');
        expect(entity.confidence).toBe(0.9);
      });
    });

    describe('regulation()', () => {
      it('should create a regulation entity', () => {
        const entity = CryptoEntity.regulation('MiCA', 1.0, 0, 4);

        expect(entity.type).toBe(CryptoEntityType.REGULATION);
        expect(entity.value).toBe('MiCA');
        expect(entity.confidence).toBe(1.0);
      });
    });

    describe('attack()', () => {
      it('should create an attack entity', () => {
        const entity = CryptoEntity.attack('rug pull', 0.85, 0, 8);

        expect(entity.type).toBe(CryptoEntityType.ATTACK);
        expect(entity.value).toBe('rug pull');
        expect(entity.confidence).toBe(0.85);
      });
    });
  });

  describe('Validation', () => {
    describe('value validation', () => {
      it('should reject empty value', () => {
        expect(() => CryptoEntity.token('', 1.0, 0, 5)).toThrow(
          'Invalid entity value: must not be empty',
        );
      });

      it('should reject whitespace-only value', () => {
        expect(() => CryptoEntity.token('   ', 1.0, 0, 5)).toThrow(
          'Invalid entity value: must not be empty',
        );
      });

      it('should accept value with leading/trailing whitespace', () => {
        const entity = CryptoEntity.token(' Bitcoin ', 1.0, 0, 9);
        expect(entity.value).toBe(' Bitcoin ');
      });
    });

    describe('confidence validation', () => {
      it('should reject confidence < 0', () => {
        expect(() => CryptoEntity.token('Bitcoin', -0.1, 0, 7)).toThrow(
          'Invalid confidence: must be a number between 0 and 1 (inclusive)',
        );
      });

      it('should reject confidence > 1', () => {
        expect(() => CryptoEntity.token('Bitcoin', 1.1, 0, 7)).toThrow(
          'Invalid confidence: must be a number between 0 and 1 (inclusive)',
        );
      });

      it('should accept confidence = 0', () => {
        const entity = CryptoEntity.token('Bitcoin', 0, 0, 7);
        expect(entity.confidence).toBe(0);
      });

      it('should accept confidence = 1', () => {
        const entity = CryptoEntity.token('Bitcoin', 1, 0, 7);
        expect(entity.confidence).toBe(1);
      });

      it('should accept confidence = 0.5', () => {
        const entity = CryptoEntity.token('Bitcoin', 0.5, 0, 7);
        expect(entity.confidence).toBe(0.5);
      });

      it('should reject non-number confidence', () => {
        expect(() => CryptoEntity.token('Bitcoin', NaN, 0, 7)).toThrow(
          'Invalid confidence: must be a number between 0 and 1 (inclusive)',
        );
      });
    });

    describe('position validation', () => {
      it('should reject negative startPos', () => {
        expect(() => CryptoEntity.token('Bitcoin', 1.0, -1, 7)).toThrow(
          'Invalid startPos: must be a non-negative number',
        );
      });

      it('should accept startPos = 0', () => {
        const entity = CryptoEntity.token('Bitcoin', 1.0, 0, 7);
        expect(entity.startPos).toBe(0);
      });

      it('should reject endPos <= startPos', () => {
        expect(() => CryptoEntity.token('Bitcoin', 1.0, 5, 5)).toThrow(
          'Invalid endPos: must be greater than startPos',
        );

        expect(() => CryptoEntity.token('Bitcoin', 1.0, 5, 4)).toThrow(
          'Invalid endPos: must be greater than startPos',
        );
      });

      it('should accept endPos > startPos', () => {
        const entity = CryptoEntity.token('Bitcoin', 1.0, 5, 12);
        expect(entity.startPos).toBe(5);
        expect(entity.endPos).toBe(12);
      });

      it('should reject non-number positions', () => {
        expect(() => CryptoEntity.token('Bitcoin', 1.0, NaN, 7)).toThrow(
          'Invalid startPos: must be a non-negative number',
        );

        expect(() => CryptoEntity.token('Bitcoin', 1.0, 0, NaN)).toThrow(
          'Invalid endPos: must be greater than startPos',
        );
      });
    });
  });

  describe('Confidence Classification', () => {
    it('should identify high confidence (>= 0.8)', () => {
      const entity1 = CryptoEntity.token('Bitcoin', 0.8, 0, 7);
      const entity2 = CryptoEntity.token('Bitcoin', 0.9, 0, 7);
      const entity3 = CryptoEntity.token('Bitcoin', 1.0, 0, 7);

      expect(entity1.isHighConfidence).toBe(true);
      expect(entity2.isHighConfidence).toBe(true);
      expect(entity3.isHighConfidence).toBe(true);

      expect(entity1.isMediumConfidence).toBe(false);
      expect(entity1.isLowConfidence).toBe(false);
    });

    it('should identify medium confidence (0.5 - 0.8)', () => {
      const entity1 = CryptoEntity.token('Bitcoin', 0.5, 0, 7);
      const entity2 = CryptoEntity.token('Bitcoin', 0.65, 0, 7);
      const entity3 = CryptoEntity.token('Bitcoin', 0.79, 0, 7);

      expect(entity1.isMediumConfidence).toBe(true);
      expect(entity2.isMediumConfidence).toBe(true);
      expect(entity3.isMediumConfidence).toBe(true);

      expect(entity1.isHighConfidence).toBe(false);
      expect(entity1.isLowConfidence).toBe(false);
    });

    it('should identify low confidence (< 0.5)', () => {
      const entity1 = CryptoEntity.token('Bitcoin', 0, 0, 7);
      const entity2 = CryptoEntity.token('Bitcoin', 0.25, 0, 7);
      const entity3 = CryptoEntity.token('Bitcoin', 0.49, 0, 7);

      expect(entity1.isLowConfidence).toBe(true);
      expect(entity2.isLowConfidence).toBe(true);
      expect(entity3.isLowConfidence).toBe(true);

      expect(entity1.isHighConfidence).toBe(false);
      expect(entity1.isMediumConfidence).toBe(false);
    });
  });

  describe('Equality', () => {
    it('should be equal when all properties match', () => {
      const entity1 = CryptoEntity.token('Bitcoin', 1.0, 0, 7);
      const entity2 = CryptoEntity.token('Bitcoin', 1.0, 0, 7);

      expect(entity1.equals(entity2)).toBe(true);
    });

    it('should not be equal when type differs', () => {
      const entity1 = CryptoEntity.token('Bitcoin', 1.0, 0, 7);
      const entity2 = CryptoEntity.blockchain('Bitcoin', 1.0, 0, 7);

      expect(entity1.equals(entity2)).toBe(false);
    });

    it('should not be equal when value differs', () => {
      const entity1 = CryptoEntity.token('Bitcoin', 1.0, 0, 7);
      const entity2 = CryptoEntity.token('Ethereum', 1.0, 0, 8);

      expect(entity1.equals(entity2)).toBe(false);
    });

    it('should not be equal when confidence differs', () => {
      const entity1 = CryptoEntity.token('Bitcoin', 1.0, 0, 7);
      const entity2 = CryptoEntity.token('Bitcoin', 0.9, 0, 7);

      expect(entity1.equals(entity2)).toBe(false);
    });

    it('should not be equal when positions differ', () => {
      const entity1 = CryptoEntity.token('Bitcoin', 1.0, 0, 7);
      const entity2 = CryptoEntity.token('Bitcoin', 1.0, 10, 17);

      expect(entity1.equals(entity2)).toBe(false);
    });
  });

  describe('toString()', () => {
    it('should return formatted string representation', () => {
      const entity = CryptoEntity.token('Bitcoin', 0.95, 0, 7);

      expect(entity.toString()).toBe('token:Bitcoin@0.95');
    });

    it('should format confidence to 2 decimal places', () => {
      const entity = CryptoEntity.exchange('Binance', 0.8567, 0, 7);

      expect(entity.toString()).toBe('exchange:Binance@0.86');
    });
  });

  describe('Getters', () => {
    it('should expose all properties via getters', () => {
      const entity = CryptoEntity.protocol('Uniswap', 0.92, 5, 12);

      expect(entity.type).toBe(CryptoEntityType.PROTOCOL);
      expect(entity.value).toBe('Uniswap');
      expect(entity.confidence).toBe(0.92);
      expect(entity.startPos).toBe(5);
      expect(entity.endPos).toBe(12);
    });
  });

  describe('Immutability', () => {
    it('should be immutable', () => {
      const entity = CryptoEntity.token('Bitcoin', 1.0, 0, 7);

      // Attempting to modify should not work (TypeScript prevents this at compile time)
      // At runtime, the object is frozen
      expect(() => {
        (entity as any).confidence = 0.5;
      }).toThrow();
    });
  });
});
