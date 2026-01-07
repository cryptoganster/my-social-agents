import { TemplateMetadata } from '../template-metadata';

describe('TemplateMetadata', () => {
  describe('create', () => {
    it('should create a valid TemplateMetadata with all fields', () => {
      const metadata = TemplateMetadata.create({
        name: 'CoinTelegraph',
        description: 'Cryptocurrency news from CoinTelegraph',
        type: 'specific',
        version: '1.0.0',
        author: 'System',
      });

      expect(metadata.name).toBe('CoinTelegraph');
      expect(metadata.description).toBe(
        'Cryptocurrency news from CoinTelegraph',
      );
      expect(metadata.type).toBe('specific');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.author).toBe('System');
    });

    it('should create a valid TemplateMetadata without optional fields', () => {
      const metadata = TemplateMetadata.create({
        name: 'Generic RSS',
        description: 'Generic RSS feed template',
        type: 'generic',
      });

      expect(metadata.name).toBe('Generic RSS');
      expect(metadata.description).toBe('Generic RSS feed template');
      expect(metadata.type).toBe('generic');
      expect(metadata.version).toBeUndefined();
      expect(metadata.author).toBeUndefined();
    });

    it('should throw error when name is missing', () => {
      expect(() =>
        TemplateMetadata.create({
          name: '',
          description: 'Test description',
          type: 'generic',
        }),
      ).toThrow('Template name is required');
    });

    it('should throw error when description is missing', () => {
      expect(() =>
        TemplateMetadata.create({
          name: 'Test',
          description: '',
          type: 'generic',
        }),
      ).toThrow('Template description is required');
    });

    it('should throw error when type is invalid', () => {
      expect(() =>
        TemplateMetadata.create({
          name: 'Test',
          description: 'Test description',
          type: 'invalid' as unknown as 'specific' | 'generic',
        }),
      ).toThrow('Template type must be either "specific" or "generic"');
    });
  });

  describe('equals', () => {
    it('should return true for identical metadata', () => {
      const metadata1 = TemplateMetadata.create({
        name: 'Test',
        description: 'Test description',
        type: 'generic',
      });

      const metadata2 = TemplateMetadata.create({
        name: 'Test',
        description: 'Test description',
        type: 'generic',
      });

      expect(metadata1.equals(metadata2)).toBe(true);
    });

    it('should return false for different metadata', () => {
      const metadata1 = TemplateMetadata.create({
        name: 'Test1',
        description: 'Test description',
        type: 'generic',
      });

      const metadata2 = TemplateMetadata.create({
        name: 'Test2',
        description: 'Test description',
        type: 'generic',
      });

      expect(metadata1.equals(metadata2)).toBe(false);
    });
  });
});
