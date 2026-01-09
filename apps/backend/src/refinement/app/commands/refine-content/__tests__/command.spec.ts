import { RefineContentCommand } from '@refinement/app/commands/refine-content/command';
import {
  RefinementConfig,
  ChunkingStrategy,
  ExtractionMethod,
} from '@refinement/domain/value-objects/refinement-config';

describe('RefineContentCommand', () => {
  describe('constructor', () => {
    it('should create command with contentItemId only', () => {
      // Arrange
      const contentItemId = 'content-123';

      // Act
      const command = new RefineContentCommand(contentItemId);

      // Assert
      expect(command.contentItemId).toBe(contentItemId);
      expect(command.config).toBeUndefined();
    });

    it('should create command with contentItemId and config', () => {
      // Arrange
      const contentItemId = 'content-123';
      const config = RefinementConfig.create({
        chunkSize: 800,
        chunkOverlap: 150,
        qualityThreshold: 0.3,
        chunkingStrategy: ChunkingStrategy.SEMANTIC,
        extractionMethod: ExtractionMethod.HYBRID,
      });

      // Act
      const command = new RefineContentCommand(contentItemId, config);

      // Assert
      expect(command.contentItemId).toBe(contentItemId);
      expect(command.config).toBe(config);
    });

    it('should create command with partial config', () => {
      // Arrange
      const contentItemId = 'content-123';
      const config = RefinementConfig.create({
        chunkSize: 1000,
        qualityThreshold: 0.5,
      });

      // Act
      const command = new RefineContentCommand(contentItemId, config);

      // Assert
      expect(command.contentItemId).toBe(contentItemId);
      expect(command.config).toBe(config);
      expect(command.config?.chunkSize).toBe(1000);
      expect(command.config?.qualityThreshold).toBe(0.5);
      // Value Object applies defaults for omitted properties
      expect(command.config?.chunkOverlap).toBe(150); // Default value
    });

    it('should have readonly properties', () => {
      // Arrange
      const contentItemId = 'content-123';
      const config = RefinementConfig.create({
        chunkSize: 800,
      });
      const command = new RefineContentCommand(contentItemId, config);

      // Act & Assert - TypeScript enforces readonly at compile time
      // Properties are readonly, so they cannot be reassigned
      expect(command.contentItemId).toBe(contentItemId);
      expect(command.config).toBe(config);
    });
  });

  describe('RefinementConfig Value Object', () => {
    it('should accept valid chunk size range', () => {
      // Arrange & Act
      const configs = [
        RefinementConfig.create({ chunkSize: 500 }), // Minimum
        RefinementConfig.create({ chunkSize: 800 }), // Default
        RefinementConfig.create({ chunkSize: 1000 }), // Maximum
      ];

      // Assert
      configs.forEach((config) => {
        expect(config.chunkSize).toBeGreaterThanOrEqual(500);
        expect(config.chunkSize).toBeLessThanOrEqual(1000);
      });
    });

    it('should accept valid chunk overlap range', () => {
      // Arrange & Act
      const configs = [
        RefinementConfig.create({ chunkOverlap: 100 }), // Minimum
        RefinementConfig.create({ chunkOverlap: 150 }), // Default
        RefinementConfig.create({ chunkOverlap: 200 }), // Maximum
      ];

      // Assert
      configs.forEach((config) => {
        expect(config.chunkOverlap).toBeGreaterThanOrEqual(100);
        expect(config.chunkOverlap).toBeLessThanOrEqual(200);
      });
    });

    it('should accept valid quality threshold range', () => {
      // Arrange & Act
      const configs = [
        RefinementConfig.create({ qualityThreshold: 0.0 }), // Minimum
        RefinementConfig.create({ qualityThreshold: 0.3 }), // Default
        RefinementConfig.create({ qualityThreshold: 0.5 }), // Medium
        RefinementConfig.create({ qualityThreshold: 1.0 }), // Maximum
      ];

      // Assert
      configs.forEach((config) => {
        expect(config.qualityThreshold).toBeGreaterThanOrEqual(0.0);
        expect(config.qualityThreshold).toBeLessThanOrEqual(1.0);
      });
    });

    it('should accept valid chunking strategies', () => {
      // Arrange & Act
      const strategies = [
        ChunkingStrategy.SEMANTIC,
        ChunkingStrategy.MARKDOWN,
        ChunkingStrategy.SENTENCE,
      ];

      // Assert
      strategies.forEach((strategy) => {
        const config = RefinementConfig.create({ chunkingStrategy: strategy });
        expect(config.chunkingStrategy).toBe(strategy);
      });
    });

    it('should accept valid extraction methods', () => {
      // Arrange & Act
      const methods = [
        ExtractionMethod.REGEX,
        ExtractionMethod.LLM,
        ExtractionMethod.HYBRID,
      ];

      // Assert
      methods.forEach((method) => {
        const config = RefinementConfig.create({ extractionMethod: method });
        expect(config.extractionMethod).toBe(method);
      });
    });

    it('should create config with defaults when empty', () => {
      // Arrange & Act
      const config = RefinementConfig.create({});

      // Assert - Value Object applies all defaults
      expect(config.chunkSize).toBe(800); // Default
      expect(config.chunkOverlap).toBe(150); // Default
      expect(config.qualityThreshold).toBe(0.3); // Default
      expect(config.chunkingStrategy).toBe(ChunkingStrategy.SEMANTIC); // Default
      expect(config.extractionMethod).toBe(ExtractionMethod.HYBRID); // Default
    });

    it('should allow all config options together', () => {
      // Arrange & Act
      const config = RefinementConfig.create({
        chunkSize: 750,
        chunkOverlap: 175,
        qualityThreshold: 0.4,
        chunkingStrategy: ChunkingStrategy.MARKDOWN,
        extractionMethod: ExtractionMethod.LLM,
      });

      // Assert
      expect(config.chunkSize).toBe(750);
      expect(config.chunkOverlap).toBe(175);
      expect(config.qualityThreshold).toBe(0.4);
      expect(config.chunkingStrategy).toBe(ChunkingStrategy.MARKDOWN);
      expect(config.extractionMethod).toBe(ExtractionMethod.LLM);
    });
  });

  describe('use cases', () => {
    it('should support default refinement (no config)', () => {
      // Arrange
      const contentItemId = 'content-123';

      // Act
      const command = new RefineContentCommand(contentItemId);

      // Assert
      expect(command.contentItemId).toBe(contentItemId);
      expect(command.config).toBeUndefined();
      // Handler will use default values
    });

    it('should support custom chunk size for large content', () => {
      // Arrange
      const contentItemId = 'content-large';
      const config = RefinementConfig.create({
        chunkSize: 1000, // Larger chunks for large content
      });

      // Act
      const command = new RefineContentCommand(contentItemId, config);

      // Assert
      expect(command.config?.chunkSize).toBe(1000);
    });

    it('should support custom quality threshold for strict filtering', () => {
      // Arrange
      const contentItemId = 'content-strict';
      const config = RefinementConfig.create({
        qualityThreshold: 0.7, // Higher threshold for quality
      });

      // Act
      const command = new RefineContentCommand(contentItemId, config);

      // Assert
      expect(command.config?.qualityThreshold).toBe(0.7);
    });

    it('should support markdown-specific chunking', () => {
      // Arrange
      const contentItemId = 'content-markdown';
      const config = RefinementConfig.create({
        chunkingStrategy: ChunkingStrategy.MARKDOWN,
      });

      // Act
      const command = new RefineContentCommand(contentItemId, config);

      // Assert
      expect(command.config?.chunkingStrategy).toBe(ChunkingStrategy.MARKDOWN);
    });

    it('should support regex-only extraction for performance', () => {
      // Arrange
      const contentItemId = 'content-fast';
      const config = RefinementConfig.create({
        extractionMethod: ExtractionMethod.REGEX, // Skip LLM for speed
      });

      // Act
      const command = new RefineContentCommand(contentItemId, config);

      // Assert
      expect(command.config?.extractionMethod).toBe(ExtractionMethod.REGEX);
    });

    it('should support LLM-only extraction for accuracy', () => {
      // Arrange
      const contentItemId = 'content-accurate';
      const config = RefinementConfig.create({
        extractionMethod: ExtractionMethod.LLM, // Use LLM for best accuracy
      });

      // Act
      const command = new RefineContentCommand(contentItemId, config);

      // Assert
      expect(command.config?.extractionMethod).toBe(ExtractionMethod.LLM);
    });
  });

  describe('edge cases', () => {
    it('should reject empty string contentItemId', () => {
      // Arrange
      const contentItemId = '';

      // Act & Assert
      expect(() => new RefineContentCommand(contentItemId)).toThrow(
        'Content item ID is required',
      );
    });

    it('should handle very long contentItemId', () => {
      // Arrange
      const contentItemId = 'a'.repeat(1000);

      // Act
      const command = new RefineContentCommand(contentItemId);

      // Assert
      expect(command.contentItemId).toBe(contentItemId);
      expect(command.contentItemId.length).toBe(1000);
    });

    it('should handle special characters in contentItemId', () => {
      // Arrange
      const contentItemId = 'content-123-!@#$%^&*()';

      // Act
      const command = new RefineContentCommand(contentItemId);

      // Assert
      expect(command.contentItemId).toBe(contentItemId);
    });

    it('should handle null config as undefined', () => {
      // Arrange
      const contentItemId = 'content-123';

      // Act
      const command = new RefineContentCommand(contentItemId, undefined);

      // Assert
      expect(command.config).toBeUndefined();
    });
  });
});
