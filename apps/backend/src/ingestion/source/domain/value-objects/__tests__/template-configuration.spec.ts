import { TemplateConfiguration } from '../template-configuration';
import { TemplateMetadata } from '../template-metadata';

describe('TemplateConfiguration', () => {
  describe('create', () => {
    it('should create a valid TemplateConfiguration with required fields only', () => {
      const config = TemplateConfiguration.create({
        feedUrl: 'https://example.com/rss',
        updateInterval: 3600,
      });

      expect(config.feedUrl).toBe('https://example.com/rss');
      expect(config.updateInterval).toBe(3600);
      expect(config.categories).toBeUndefined();
      expect(config.language).toBeUndefined();
      expect(config.maxItems).toBeUndefined();
      expect(config.timeout).toBeUndefined();
    });

    it('should create a valid TemplateConfiguration with all fields', () => {
      const metadata = TemplateMetadata.create({
        name: 'Test',
        description: 'Test template',
        type: 'generic',
      });

      const config = TemplateConfiguration.create({
        feedUrl: 'https://example.com/rss',
        updateInterval: 3600,
        categories: ['bitcoin', 'ethereum'],
        language: 'en',
        maxItems: 50,
        timeout: 30000,
        metadata,
        customFields: { custom: 'value' },
      });

      expect(config.feedUrl).toBe('https://example.com/rss');
      expect(config.updateInterval).toBe(3600);
      expect(config.categories).toEqual(['bitcoin', 'ethereum']);
      expect(config.language).toBe('en');
      expect(config.maxItems).toBe(50);
      expect(config.timeout).toBe(30000);
      expect(config.metadata).toBe(metadata);
      expect(config.customFields).toEqual({ custom: 'value' });
    });

    it('should throw error when feedUrl is missing', () => {
      expect(() =>
        TemplateConfiguration.create({
          feedUrl: '',
          updateInterval: 3600,
        }),
      ).toThrow('feedUrl is required');
    });

    it('should throw error when updateInterval is missing', () => {
      expect(() =>
        TemplateConfiguration.create({
          feedUrl: 'https://example.com/rss',
          updateInterval: undefined as unknown as number,
        }),
      ).toThrow('updateInterval is required');
    });

    it('should throw error when updateInterval is not a positive integer', () => {
      expect(() =>
        TemplateConfiguration.create({
          feedUrl: 'https://example.com/rss',
          updateInterval: -1,
        }),
      ).toThrow('updateInterval must be a positive integer');

      expect(() =>
        TemplateConfiguration.create({
          feedUrl: 'https://example.com/rss',
          updateInterval: 0,
        }),
      ).toThrow('updateInterval must be a positive integer');

      expect(() =>
        TemplateConfiguration.create({
          feedUrl: 'https://example.com/rss',
          updateInterval: 3.5,
        }),
      ).toThrow('updateInterval must be a positive integer');
    });

    it('should throw error when categories is not an array', () => {
      expect(() =>
        TemplateConfiguration.create({
          feedUrl: 'https://example.com/rss',
          updateInterval: 3600,
          categories: 'not-an-array' as unknown as string[],
        }),
      ).toThrow('categories must be an array');
    });

    it('should throw error when categories contains non-strings', () => {
      expect(() =>
        TemplateConfiguration.create({
          feedUrl: 'https://example.com/rss',
          updateInterval: 3600,
          categories: ['valid', 123] as unknown as string[],
        }),
      ).toThrow('categories must be an array of strings');
    });

    it('should throw error when language is not a string', () => {
      expect(() =>
        TemplateConfiguration.create({
          feedUrl: 'https://example.com/rss',
          updateInterval: 3600,
          language: 123 as unknown as string,
        }),
      ).toThrow('language must be a string');
    });

    it('should throw error when maxItems is not a positive integer', () => {
      expect(() =>
        TemplateConfiguration.create({
          feedUrl: 'https://example.com/rss',
          updateInterval: 3600,
          maxItems: -1,
        }),
      ).toThrow('maxItems must be a positive integer');
    });

    it('should throw error when timeout is not a positive integer', () => {
      expect(() =>
        TemplateConfiguration.create({
          feedUrl: 'https://example.com/rss',
          updateInterval: 3600,
          timeout: 0,
        }),
      ).toThrow('timeout must be a positive integer');
    });
  });

  describe('withoutMetadata', () => {
    it('should return configuration without metadata', () => {
      const metadata = TemplateMetadata.create({
        name: 'Test',
        description: 'Test template',
        type: 'generic',
      });

      const config = TemplateConfiguration.create({
        feedUrl: 'https://example.com/rss',
        updateInterval: 3600,
        metadata,
      });

      const configWithoutMetadata = config.withoutMetadata();

      expect(configWithoutMetadata.feedUrl).toBe('https://example.com/rss');
      expect(configWithoutMetadata.updateInterval).toBe(3600);
      expect(configWithoutMetadata.metadata).toBeUndefined();
    });

    it('should preserve other fields when removing metadata', () => {
      const metadata = TemplateMetadata.create({
        name: 'Test',
        description: 'Test template',
        type: 'generic',
      });

      const config = TemplateConfiguration.create({
        feedUrl: 'https://example.com/rss',
        updateInterval: 3600,
        categories: ['bitcoin'],
        language: 'en',
        metadata,
      });

      const configWithoutMetadata = config.withoutMetadata();

      expect(configWithoutMetadata.categories).toEqual(['bitcoin']);
      expect(configWithoutMetadata.language).toBe('en');
      expect(configWithoutMetadata.metadata).toBeUndefined();
    });
  });

  describe('equals', () => {
    it('should return true for identical configurations', () => {
      const config1 = TemplateConfiguration.create({
        feedUrl: 'https://example.com/rss',
        updateInterval: 3600,
      });

      const config2 = TemplateConfiguration.create({
        feedUrl: 'https://example.com/rss',
        updateInterval: 3600,
      });

      expect(config1.equals(config2)).toBe(true);
    });

    it('should return false for different configurations', () => {
      const config1 = TemplateConfiguration.create({
        feedUrl: 'https://example.com/rss',
        updateInterval: 3600,
      });

      const config2 = TemplateConfiguration.create({
        feedUrl: 'https://example.com/rss',
        updateInterval: 7200,
      });

      expect(config1.equals(config2)).toBe(false);
    });
  });
});
