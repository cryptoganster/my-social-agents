import { RerefineContentCommand } from '../command';
import {
  RefinementConfig,
  ChunkingStrategy,
  ExtractionMethod,
} from '@refinement/domain/value-objects/refinement-config';

describe('RerefineContentCommand', () => {
  describe('constructor', () => {
    it('should create command with valid properties', () => {
      const command = new RerefineContentCommand(
        'content-123',
        'Low quality detected',
      );

      expect(command.contentItemId).toBe('content-123');
      expect(command.reason).toBe('Low quality detected');
      expect(command.config).toBeUndefined();
    });

    it('should create command with config', () => {
      const config = RefinementConfig.create({
        chunkSize: 1000,
        chunkOverlap: 200,
        qualityThreshold: 0.5,
      });

      const command = new RerefineContentCommand(
        'content-123',
        'Algorithm update',
        config,
      );

      expect(command.contentItemId).toBe('content-123');
      expect(command.reason).toBe('Algorithm update');
      expect(command.config).toBe(config);
    });

    it('should create command with partial config', () => {
      const config = RefinementConfig.create({
        qualityThreshold: 0.6,
      });

      const command = new RerefineContentCommand(
        'content-123',
        'Quality threshold change',
        config,
      );

      expect(command.config?.qualityThreshold).toBe(0.6);
      // Value Object applies defaults for omitted properties
      expect(command.config?.chunkSize).toBe(800); // Default value
    });
  });

  describe('validation', () => {
    describe('contentItemId', () => {
      it('should reject empty content item ID', () => {
        expect(() => new RerefineContentCommand('', 'Some reason')).toThrow(
          'Content item ID is required',
        );
      });

      it('should reject whitespace-only content item ID', () => {
        expect(() => new RerefineContentCommand('   ', 'Some reason')).toThrow(
          'Content item ID is required',
        );
      });
    });

    describe('reason', () => {
      it('should reject empty reason', () => {
        expect(() => new RerefineContentCommand('content-123', '')).toThrow(
          'Reason is required',
        );
      });

      it('should reject whitespace-only reason', () => {
        expect(() => new RerefineContentCommand('content-123', '   ')).toThrow(
          'Reason is required',
        );
      });

      it('should reject reason longer than 500 characters', () => {
        const longReason = 'a'.repeat(501);
        expect(
          () => new RerefineContentCommand('content-123', longReason),
        ).toThrow('Reason must be 500 characters or less');
      });

      it('should accept reason with exactly 500 characters', () => {
        const reason = 'a'.repeat(500);
        const command = new RerefineContentCommand('content-123', reason);
        expect(command.reason).toBe(reason);
      });
    });
  });

  describe('immutability', () => {
    it('should have readonly properties', () => {
      const command = new RerefineContentCommand('content-123', 'Test reason');

      // TypeScript enforces readonly at compile time
      // This test verifies the properties exist and are accessible
      expect(command.contentItemId).toBe('content-123');
      expect(command.reason).toBe('Test reason');
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in reason', () => {
      const reason = 'Reason with special chars: @#$%^&*()';
      const command = new RerefineContentCommand('content-123', reason);
      expect(command.reason).toBe(reason);
    });

    it('should handle unicode characters in reason', () => {
      const reason = 'Reason with unicode: 你好 🚀';
      const command = new RerefineContentCommand('content-123', reason);
      expect(command.reason).toBe(reason);
    });

    it('should handle all config options together', () => {
      const config = RefinementConfig.create({
        chunkSize: 800,
        chunkOverlap: 150,
        qualityThreshold: 0.7,
        chunkingStrategy: ChunkingStrategy.SEMANTIC,
        extractionMethod: ExtractionMethod.HYBRID,
      });

      const command = new RerefineContentCommand(
        'content-123',
        'Full config test',
        config,
      );

      expect(command.config).toBe(config);
    });
  });
});
