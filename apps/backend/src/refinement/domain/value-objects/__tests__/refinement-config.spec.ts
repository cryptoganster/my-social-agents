import {
  RefinementConfig,
  ChunkingStrategy,
  ExtractionMethod,
} from '../refinement-config';

describe('RefinementConfig', () => {
  describe('Factory Methods', () => {
    describe('default()', () => {
      it('should create config with default values', () => {
        // Act
        const config = RefinementConfig.default();

        // Assert
        expect(config.chunkSize).toBe(800);
        expect(config.chunkOverlap).toBe(150);
        expect(config.qualityThreshold).toBe(0.3);
        expect(config.chunkingStrategy).toBe(ChunkingStrategy.SEMANTIC);
        expect(config.extractionMethod).toBe(ExtractionMethod.HYBRID);
      });

      it('should create immutable config', () => {
        // Act
        const config = RefinementConfig.default();

        // Assert
        expect(Object.isFrozen(config)).toBe(true);
      });
    });

    describe('create()', () => {
      it('should create config with custom chunk size', () => {
        // Act
        const config = RefinementConfig.create({ chunkSize: 1000 });

        // Assert
        expect(config.chunkSize).toBe(1000);
        expect(config.chunkOverlap).toBe(150); // Default
        expect(config.qualityThreshold).toBe(0.3); // Default
      });

      it('should create config with custom chunk overlap', () => {
        // Act
        const config = RefinementConfig.create({ chunkOverlap: 200 });

        // Assert
        expect(config.chunkSize).toBe(800); // Default
        expect(config.chunkOverlap).toBe(200);
        expect(config.qualityThreshold).toBe(0.3); // Default
      });

      it('should create config with custom quality threshold', () => {
        // Act
        const config = RefinementConfig.create({ qualityThreshold: 0.7 });

        // Assert
        expect(config.chunkSize).toBe(800); // Default
        expect(config.chunkOverlap).toBe(150); // Default
        expect(config.qualityThreshold).toBe(0.7);
      });

      it('should create config with custom chunking strategy', () => {
        // Act
        const config = RefinementConfig.create({
          chunkingStrategy: ChunkingStrategy.MARKDOWN,
        });

        // Assert
        expect(config.chunkingStrategy).toBe(ChunkingStrategy.MARKDOWN);
        expect(config.chunkSize).toBe(800); // Default
      });

      it('should create config with custom extraction method', () => {
        // Act
        const config = RefinementConfig.create({
          extractionMethod: ExtractionMethod.LLM,
        });

        // Assert
        expect(config.extractionMethod).toBe(ExtractionMethod.LLM);
        expect(config.chunkSize).toBe(800); // Default
      });

      it('should create config with all custom values', () => {
        // Act
        const config = RefinementConfig.create({
          chunkSize: 900,
          chunkOverlap: 175,
          qualityThreshold: 0.5,
          chunkingStrategy: ChunkingStrategy.SENTENCE,
          extractionMethod: ExtractionMethod.REGEX,
        });

        // Assert
        expect(config.chunkSize).toBe(900);
        expect(config.chunkOverlap).toBe(175);
        expect(config.qualityThreshold).toBe(0.5);
        expect(config.chunkingStrategy).toBe(ChunkingStrategy.SENTENCE);
        expect(config.extractionMethod).toBe(ExtractionMethod.REGEX);
      });

      it('should create config with empty object (all defaults)', () => {
        // Act
        const config = RefinementConfig.create({});

        // Assert
        expect(config.chunkSize).toBe(800);
        expect(config.chunkOverlap).toBe(150);
        expect(config.qualityThreshold).toBe(0.3);
        expect(config.chunkingStrategy).toBe(ChunkingStrategy.SEMANTIC);
        expect(config.extractionMethod).toBe(ExtractionMethod.HYBRID);
      });
    });
  });

  describe('Validation', () => {
    describe('Chunk Size', () => {
      it('should accept minimum valid chunk size (500)', () => {
        // Act & Assert
        expect(() => RefinementConfig.create({ chunkSize: 500 })).not.toThrow();
      });

      it('should accept maximum valid chunk size (1000)', () => {
        // Act & Assert
        expect(() =>
          RefinementConfig.create({ chunkSize: 1000 }),
        ).not.toThrow();
      });

      it('should accept mid-range chunk size (750)', () => {
        // Act & Assert
        expect(() => RefinementConfig.create({ chunkSize: 750 })).not.toThrow();
      });

      it('should reject chunk size below minimum (499)', () => {
        // Act & Assert
        expect(() => RefinementConfig.create({ chunkSize: 499 })).toThrow(
          'Chunk size must be between 500 and 1000 tokens',
        );
      });

      it('should reject chunk size above maximum (1001)', () => {
        // Act & Assert
        expect(() => RefinementConfig.create({ chunkSize: 1001 })).toThrow(
          'Chunk size must be between 500 and 1000 tokens',
        );
      });

      it('should reject zero chunk size', () => {
        // Act & Assert
        expect(() => RefinementConfig.create({ chunkSize: 0 })).toThrow(
          'Chunk size must be between 500 and 1000 tokens',
        );
      });

      it('should reject negative chunk size', () => {
        // Act & Assert
        expect(() => RefinementConfig.create({ chunkSize: -100 })).toThrow(
          'Chunk size must be between 500 and 1000 tokens',
        );
      });
    });

    describe('Chunk Overlap', () => {
      it('should accept minimum valid chunk overlap (100)', () => {
        // Act & Assert
        expect(() =>
          RefinementConfig.create({ chunkOverlap: 100 }),
        ).not.toThrow();
      });

      it('should accept maximum valid chunk overlap (200)', () => {
        // Act & Assert
        expect(() =>
          RefinementConfig.create({ chunkOverlap: 200 }),
        ).not.toThrow();
      });

      it('should accept mid-range chunk overlap (150)', () => {
        // Act & Assert
        expect(() =>
          RefinementConfig.create({ chunkOverlap: 150 }),
        ).not.toThrow();
      });

      it('should reject chunk overlap below minimum (99)', () => {
        // Act & Assert
        expect(() => RefinementConfig.create({ chunkOverlap: 99 })).toThrow(
          'Chunk overlap must be between 100 and 200 tokens',
        );
      });

      it('should reject chunk overlap above maximum (201)', () => {
        // Act & Assert
        expect(() => RefinementConfig.create({ chunkOverlap: 201 })).toThrow(
          'Chunk overlap must be between 100 and 200 tokens',
        );
      });

      it('should reject negative chunk overlap', () => {
        // Act & Assert
        expect(() => RefinementConfig.create({ chunkOverlap: -50 })).toThrow(
          'Chunk overlap must be between 100 and 200 tokens',
        );
      });
    });

    describe('Quality Threshold', () => {
      it('should accept minimum valid quality threshold (0.0)', () => {
        // Act & Assert
        expect(() =>
          RefinementConfig.create({ qualityThreshold: 0.0 }),
        ).not.toThrow();
      });

      it('should accept maximum valid quality threshold (1.0)', () => {
        // Act & Assert
        expect(() =>
          RefinementConfig.create({ qualityThreshold: 1.0 }),
        ).not.toThrow();
      });

      it('should accept mid-range quality threshold (0.5)', () => {
        // Act & Assert
        expect(() =>
          RefinementConfig.create({ qualityThreshold: 0.5 }),
        ).not.toThrow();
      });

      it('should reject quality threshold below minimum (-0.1)', () => {
        // Act & Assert
        expect(() =>
          RefinementConfig.create({ qualityThreshold: -0.1 }),
        ).toThrow('Quality threshold must be between 0 and 1');
      });

      it('should reject quality threshold above maximum (1.1)', () => {
        // Act & Assert
        expect(() =>
          RefinementConfig.create({ qualityThreshold: 1.1 }),
        ).toThrow('Quality threshold must be between 0 and 1');
      });

      it('should reject quality threshold of 2.0', () => {
        // Act & Assert
        expect(() =>
          RefinementConfig.create({ qualityThreshold: 2.0 }),
        ).toThrow('Quality threshold must be between 0 and 1');
      });
    });

    describe('Chunking Strategy', () => {
      it('should accept SEMANTIC strategy', () => {
        // Act & Assert
        expect(() =>
          RefinementConfig.create({
            chunkingStrategy: ChunkingStrategy.SEMANTIC,
          }),
        ).not.toThrow();
      });

      it('should accept MARKDOWN strategy', () => {
        // Act & Assert
        expect(() =>
          RefinementConfig.create({
            chunkingStrategy: ChunkingStrategy.MARKDOWN,
          }),
        ).not.toThrow();
      });

      it('should accept SENTENCE strategy', () => {
        // Act & Assert
        expect(() =>
          RefinementConfig.create({
            chunkingStrategy: ChunkingStrategy.SENTENCE,
          }),
        ).not.toThrow();
      });

      it('should reject invalid strategy', () => {
        // Act & Assert
        expect(() =>
          RefinementConfig.create({
            chunkingStrategy: 'invalid' as ChunkingStrategy,
          }),
        ).toThrow('Invalid chunking strategy: invalid');
      });
    });

    describe('Extraction Method', () => {
      it('should accept REGEX method', () => {
        // Act & Assert
        expect(() =>
          RefinementConfig.create({
            extractionMethod: ExtractionMethod.REGEX,
          }),
        ).not.toThrow();
      });

      it('should accept LLM method', () => {
        // Act & Assert
        expect(() =>
          RefinementConfig.create({
            extractionMethod: ExtractionMethod.LLM,
          }),
        ).not.toThrow();
      });

      it('should accept HYBRID method', () => {
        // Act & Assert
        expect(() =>
          RefinementConfig.create({
            extractionMethod: ExtractionMethod.HYBRID,
          }),
        ).not.toThrow();
      });

      it('should reject invalid method', () => {
        // Act & Assert
        expect(() =>
          RefinementConfig.create({
            extractionMethod: 'invalid' as ExtractionMethod,
          }),
        ).toThrow('Invalid extraction method: invalid');
      });
    });
  });

  describe('Value Object Behavior', () => {
    describe('Equality', () => {
      it('should be equal when all properties match', () => {
        // Arrange
        const config1 = RefinementConfig.create({
          chunkSize: 900,
          chunkOverlap: 175,
          qualityThreshold: 0.5,
        });
        const config2 = RefinementConfig.create({
          chunkSize: 900,
          chunkOverlap: 175,
          qualityThreshold: 0.5,
        });

        // Act & Assert
        expect(config1.equals(config2)).toBe(true);
      });

      it('should not be equal when chunk size differs', () => {
        // Arrange
        const config1 = RefinementConfig.create({ chunkSize: 800 });
        const config2 = RefinementConfig.create({ chunkSize: 900 });

        // Act & Assert
        expect(config1.equals(config2)).toBe(false);
      });

      it('should not be equal when chunk overlap differs', () => {
        // Arrange
        const config1 = RefinementConfig.create({ chunkOverlap: 150 });
        const config2 = RefinementConfig.create({ chunkOverlap: 175 });

        // Act & Assert
        expect(config1.equals(config2)).toBe(false);
      });

      it('should not be equal when quality threshold differs', () => {
        // Arrange
        const config1 = RefinementConfig.create({ qualityThreshold: 0.3 });
        const config2 = RefinementConfig.create({ qualityThreshold: 0.5 });

        // Act & Assert
        expect(config1.equals(config2)).toBe(false);
      });

      it('should not be equal when chunking strategy differs', () => {
        // Arrange
        const config1 = RefinementConfig.create({
          chunkingStrategy: ChunkingStrategy.SEMANTIC,
        });
        const config2 = RefinementConfig.create({
          chunkingStrategy: ChunkingStrategy.MARKDOWN,
        });

        // Act & Assert
        expect(config1.equals(config2)).toBe(false);
      });

      it('should not be equal when extraction method differs', () => {
        // Arrange
        const config1 = RefinementConfig.create({
          extractionMethod: ExtractionMethod.HYBRID,
        });
        const config2 = RefinementConfig.create({
          extractionMethod: ExtractionMethod.LLM,
        });

        // Act & Assert
        expect(config1.equals(config2)).toBe(false);
      });

      it('should be equal for two default configs', () => {
        // Arrange
        const config1 = RefinementConfig.default();
        const config2 = RefinementConfig.default();

        // Act & Assert
        expect(config1.equals(config2)).toBe(true);
      });
    });

    describe('Immutability', () => {
      it('should be frozen after creation', () => {
        // Act
        const config = RefinementConfig.default();

        // Assert
        expect(Object.isFrozen(config)).toBe(true);
      });

      it('should not allow property modification', () => {
        // Arrange
        const config = RefinementConfig.default();

        // Act & Assert
        expect(() => {
          (config as any).chunkSize = 1000;
        }).toThrow();
      });
    });

    describe('Serialization', () => {
      it('should convert to plain object', () => {
        // Arrange
        const config = RefinementConfig.create({
          chunkSize: 900,
          chunkOverlap: 175,
          qualityThreshold: 0.5,
          chunkingStrategy: ChunkingStrategy.MARKDOWN,
          extractionMethod: ExtractionMethod.LLM,
        });

        // Act
        const obj = config.toObject();

        // Assert
        expect(obj).toEqual({
          chunkSize: 900,
          chunkOverlap: 175,
          qualityThreshold: 0.5,
          chunkingStrategy: ChunkingStrategy.MARKDOWN,
          extractionMethod: ExtractionMethod.LLM,
        });
      });
    });
  });

  describe('Use Cases', () => {
    it('should support large content configuration', () => {
      // Arrange & Act
      const config = RefinementConfig.create({
        chunkSize: 1000, // Larger chunks for large content
        chunkOverlap: 200, // More overlap for context
      });

      // Assert
      expect(config.chunkSize).toBe(1000);
      expect(config.chunkOverlap).toBe(200);
    });

    it('should support strict quality configuration', () => {
      // Arrange & Act
      const config = RefinementConfig.create({
        qualityThreshold: 0.7, // Higher threshold for quality
      });

      // Assert
      expect(config.qualityThreshold).toBe(0.7);
    });

    it('should support markdown content configuration', () => {
      // Arrange & Act
      const config = RefinementConfig.create({
        chunkingStrategy: ChunkingStrategy.MARKDOWN,
      });

      // Assert
      expect(config.chunkingStrategy).toBe(ChunkingStrategy.MARKDOWN);
    });

    it('should support fast extraction configuration', () => {
      // Arrange & Act
      const config = RefinementConfig.create({
        extractionMethod: ExtractionMethod.REGEX, // Skip LLM for speed
      });

      // Assert
      expect(config.extractionMethod).toBe(ExtractionMethod.REGEX);
    });

    it('should support accurate extraction configuration', () => {
      // Arrange & Act
      const config = RefinementConfig.create({
        extractionMethod: ExtractionMethod.LLM, // Use LLM for best accuracy
      });

      // Assert
      expect(config.extractionMethod).toBe(ExtractionMethod.LLM);
    });
  });
});
