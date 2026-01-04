import * as fc from 'fast-check';
import { SourceConfiguration } from '../source-configuration';
import { SourceType, SourceTypeEnum } from '../../value-objects/source-type';

describe('SourceConfiguration', () => {
  describe('Property Tests', () => {
    // Feature: content-ingestion, Property 8: Configuration Validation
    // Validates: Requirements 4.1, 5.1
    it('should reject invalid configurations with descriptive errors', () => {
      fc.assert(
        fc.property(
          fc.record({
            sourceId: fc.string({ minLength: 1 }),
            sourceType: fc.constantFrom(...Object.values(SourceTypeEnum)),
            name: fc.oneof(
              fc.constant(''), // Empty name
              fc.constant('   '), // Whitespace only
              fc.string({ minLength: 256, maxLength: 300 }), // Too long
            ),
            config: fc.constant({}),
            isActive: fc.boolean(),
          }),
          (props) => {
            const sourceType = SourceType.fromEnum(props.sourceType);
            const config = SourceConfiguration.create({
              sourceId: props.sourceId,
              sourceType,
              name: props.name,
              config: props.config,
              isActive: props.isActive,
            });

            const result = config.validateConfig();

            // Invalid name should produce validation errors
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should accept valid configurations for all source types', () => {
      fc.assert(
        fc.property(
          fc.record({
            sourceId: fc.string({ minLength: 1 }),
            sourceType: fc.constantFrom(...Object.values(SourceTypeEnum)),
            // Generate names with at least one non-whitespace character
            name: fc
              .string({ minLength: 1, maxLength: 255 })
              .filter((s) => s.trim().length > 0),
            isActive: fc.boolean(),
          }),
          (props) => {
            const sourceType = SourceType.fromEnum(props.sourceType);

            // Create valid config based on source type
            let config: Record<string, unknown>;
            let credentials: string | undefined;

            switch (props.sourceType) {
              case SourceTypeEnum.WEB:
                config = { url: 'https://example.com' };
                break;
              case SourceTypeEnum.RSS:
                config = { feedUrl: 'https://example.com/feed.xml' };
                break;
              case SourceTypeEnum.SOCIAL_MEDIA:
                config = { platform: 'twitter' };
                credentials = 'encrypted-credentials';
                break;
              case SourceTypeEnum.PDF:
                config = { path: '/path/to/file.pdf' };
                break;
              case SourceTypeEnum.OCR:
                config = { imagePath: '/path/to/image.png' };
                break;
              case SourceTypeEnum.WIKIPEDIA:
                config = { articleTitle: 'Bitcoin' };
                credentials = 'api-key';
                break;
              default:
                config = {};
            }

            const sourceConfig = SourceConfiguration.create({
              sourceId: props.sourceId,
              sourceType,
              name: props.name,
              config,
              credentials,
              isActive: props.isActive,
            });

            const result = sourceConfig.validateConfig();

            // Valid configuration should pass validation
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should reject configurations missing required source-specific fields', () => {
      fc.assert(
        fc.property(
          fc.record({
            sourceId: fc.string({ minLength: 1 }),
            sourceType: fc.constantFrom(...Object.values(SourceTypeEnum)),
            name: fc.string({ minLength: 1, maxLength: 255 }),
            isActive: fc.boolean(),
          }),
          (props) => {
            const sourceType = SourceType.fromEnum(props.sourceType);

            // Create config with missing required fields
            const config = {}; // Empty config - missing required fields

            const sourceConfig = SourceConfiguration.create({
              sourceId: props.sourceId,
              sourceType,
              name: props.name.trim(),
              config,
              isActive: props.isActive,
            });

            const result = sourceConfig.validateConfig();

            // Should fail validation due to missing source-specific fields
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should reject auth-required sources without credentials', () => {
      fc.assert(
        fc.property(
          fc.record({
            sourceId: fc.string({ minLength: 1 }),
            name: fc.string({ minLength: 1, maxLength: 255 }),
            isActive: fc.boolean(),
          }),
          (props) => {
            // Test with SOCIAL_MEDIA which requires auth
            const sourceType = SourceType.fromEnum(SourceTypeEnum.SOCIAL_MEDIA);
            const config = { platform: 'twitter' };

            const sourceConfig = SourceConfiguration.create({
              sourceId: props.sourceId,
              sourceType,
              name: props.name.trim(),
              config,
              credentials: undefined, // Missing credentials
              isActive: props.isActive,
            });

            const result = sourceConfig.validateConfig();

            // Should fail validation due to missing credentials
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain(
              'Source type SOCIAL_MEDIA requires credentials',
            );
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Unit Tests', () => {
    it('should create a new source configuration', () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const config = SourceConfiguration.create({
        sourceId: 'test-id',
        sourceType,
        name: 'Test Source',
        config: { url: 'https://example.com' },
        isActive: true,
      });

      expect(config.sourceId).toBe('test-id');
      expect(config.name).toBe('Test Source');
      expect(config.isActive).toBe(true);
      expect(config.createdAt).toBeInstanceOf(Date);
      expect(config.updatedAt).toBeInstanceOf(Date);
    });

    it('should update source configuration', () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const config = SourceConfiguration.create({
        sourceId: 'test-id',
        sourceType,
        name: 'Test Source',
        config: { url: 'https://example.com' },
        isActive: true,
      });

      const originalUpdatedAt = config.updatedAt;

      // Wait a bit to ensure timestamp changes
      setTimeout(() => {
        config.update({
          name: 'Updated Source',
          config: { url: 'https://updated.com' },
        });

        expect(config.name).toBe('Updated Source');
        expect(config.config.url).toBe('https://updated.com');
        expect(config.updatedAt.getTime()).toBeGreaterThanOrEqual(
          originalUpdatedAt.getTime(),
        );
      }, 10);
    });

    it('should deactivate source configuration', () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const config = SourceConfiguration.create({
        sourceId: 'test-id',
        sourceType,
        name: 'Test Source',
        config: { url: 'https://example.com' },
        isActive: true,
      });

      expect(config.isActive).toBe(true);

      config.deactivate();

      expect(config.isActive).toBe(false);
    });

    it('should activate source configuration', () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const config = SourceConfiguration.create({
        sourceId: 'test-id',
        sourceType,
        name: 'Test Source',
        config: { url: 'https://example.com' },
        isActive: false,
      });

      expect(config.isActive).toBe(false);

      config.activate();

      expect(config.isActive).toBe(true);
    });

    it('should validate web source configuration', () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const config = SourceConfiguration.create({
        sourceId: 'test-id',
        sourceType,
        name: 'Test Source',
        config: { url: 'https://example.com' },
        isActive: true,
      });

      const result = config.validateConfig();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject web source without URL', () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const config = SourceConfiguration.create({
        sourceId: 'test-id',
        sourceType,
        name: 'Test Source',
        config: {},
        isActive: true,
      });

      const result = config.validateConfig();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Web source requires a valid URL in config',
      );
    });

    it('should reject empty name', () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const config = SourceConfiguration.create({
        sourceId: 'test-id',
        sourceType,
        name: '',
        config: { url: 'https://example.com' },
        isActive: true,
      });

      const result = config.validateConfig();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Source name is required');
    });

    it('should reject name that is too long', () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const longName = 'a'.repeat(256);
      const config = SourceConfiguration.create({
        sourceId: 'test-id',
        sourceType,
        name: longName,
        config: { url: 'https://example.com' },
        isActive: true,
      });

      const result = config.validateConfig();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Source name must be at most 255 characters',
      );
    });

    it('should return plain object representation', () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const config = SourceConfiguration.create({
        sourceId: 'test-id',
        sourceType,
        name: 'Test Source',
        config: { url: 'https://example.com' },
        isActive: true,
      });

      const obj = config.toObject();

      expect(obj.sourceId).toBe('test-id');
      expect(obj.name).toBe('Test Source');
      expect(obj.config.url).toBe('https://example.com');
      expect(obj.isActive).toBe(true);
    });

    it('should reconstitute from persistence', () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const now = new Date();

      const config = SourceConfiguration.reconstitute({
        sourceId: 'test-id',
        sourceType,
        name: 'Test Source',
        config: { url: 'https://example.com' },
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      expect(config.sourceId).toBe('test-id');
      expect(config.createdAt).toBe(now);
      expect(config.updatedAt).toBe(now);
    });
  });
});
