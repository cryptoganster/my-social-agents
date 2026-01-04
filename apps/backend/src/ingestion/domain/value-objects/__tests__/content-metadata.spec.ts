import * as fc from 'fast-check';
import { ContentMetadata } from '../content-metadata';

describe('ContentMetadata', () => {
  describe('Property Tests', () => {
    it('should accept any valid metadata combination', () => {
      const metadataArbitrary = fc.record({
        title: fc.option(fc.string(), { nil: null }),
        author: fc.option(fc.string(), { nil: null }),
        publishedAt: fc.option(
          fc.date({ max: new Date() }), // Only past dates
          { nil: null },
        ),
        language: fc.option(
          fc.constantFrom('en', 'es', 'fr', 'de', 'ja', 'zh', 'en-US', 'es-MX'),
          { nil: null },
        ),
        sourceUrl: fc.option(fc.webUrl({ validSchemes: ['http', 'https'] }), {
          nil: null,
        }),
      });

      fc.assert(
        fc.property(metadataArbitrary, (props) => {
          const metadata = ContentMetadata.create(props);
          expect(metadata).toBeDefined();
          expect(metadata.title).toBe(props.title);
          expect(metadata.author).toBe(props.author);
          expect(metadata.language).toBe(props.language);
          expect(metadata.sourceUrl).toBe(props.sourceUrl);
        }),
        { numRuns: 100 },
      );
    });

    it('should maintain equality for identical metadata', () => {
      const metadataArbitrary = fc.record({
        title: fc.option(fc.string(), { nil: null }),
        author: fc.option(fc.string(), { nil: null }),
        publishedAt: fc.option(fc.date({ max: new Date() }), { nil: null }),
        language: fc.option(fc.constantFrom('en', 'es', 'fr'), { nil: null }),
        sourceUrl: fc.option(fc.webUrl(), { nil: null }),
      });

      fc.assert(
        fc.property(metadataArbitrary, (props) => {
          const metadata1 = ContentMetadata.create(props);
          const metadata2 = ContentMetadata.create(props);

          expect(metadata1.equals(metadata2)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it('should round-trip through toObject', () => {
      const metadataArbitrary = fc.record({
        title: fc.option(fc.string(), { nil: null }),
        author: fc.option(fc.string(), { nil: null }),
        publishedAt: fc.option(fc.date({ max: new Date() }), { nil: null }),
        language: fc.option(fc.constantFrom('en', 'es'), { nil: null }),
        sourceUrl: fc.option(fc.webUrl(), { nil: null }),
      });

      fc.assert(
        fc.property(metadataArbitrary, (props) => {
          const metadata = ContentMetadata.create(props);
          const obj = metadata.toObject();

          expect(obj.title).toBe(props.title);
          expect(obj.author).toBe(props.author);
          expect(obj.language).toBe(props.language);
          expect(obj.sourceUrl).toBe(props.sourceUrl);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Unit Tests', () => {
    it('should create metadata with all fields', () => {
      const publishedAt = new Date('2024-01-01');
      const metadata = ContentMetadata.create({
        title: 'Test Article',
        author: 'John Doe',
        publishedAt,
        language: 'en',
        sourceUrl: 'https://example.com/article',
      });

      expect(metadata.title).toBe('Test Article');
      expect(metadata.author).toBe('John Doe');
      expect(metadata.publishedAt).toEqual(publishedAt);
      expect(metadata.language).toBe('en');
      expect(metadata.sourceUrl).toBe('https://example.com/article');
    });

    it('should create metadata with partial fields', () => {
      const metadata = ContentMetadata.create({
        title: 'Test Article',
        sourceUrl: 'https://example.com/article',
      });

      expect(metadata.title).toBe('Test Article');
      expect(metadata.author).toBeNull();
      expect(metadata.publishedAt).toBeNull();
      expect(metadata.language).toBeNull();
      expect(metadata.sourceUrl).toBe('https://example.com/article');
    });

    it('should create empty metadata', () => {
      const metadata = ContentMetadata.empty();

      expect(metadata.title).toBeNull();
      expect(metadata.author).toBeNull();
      expect(metadata.publishedAt).toBeNull();
      expect(metadata.language).toBeNull();
      expect(metadata.sourceUrl).toBeNull();
    });

    it('should throw error for invalid URL', () => {
      expect(() =>
        ContentMetadata.create({
          sourceUrl: 'not-a-valid-url',
        }),
      ).toThrow('Invalid source URL');
    });

    it('should throw error for invalid language code', () => {
      expect(() =>
        ContentMetadata.create({
          language: 'invalid',
        }),
      ).toThrow('Invalid language code');
    });

    it('should accept valid language codes', () => {
      expect(() => ContentMetadata.create({ language: 'en' })).not.toThrow();
      expect(() => ContentMetadata.create({ language: 'en-US' })).not.toThrow();
      expect(() => ContentMetadata.create({ language: 'es-MX' })).not.toThrow();
    });

    it('should throw error for future published date', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      expect(() =>
        ContentMetadata.create({
          publishedAt: futureDate,
        }),
      ).toThrow('Published date cannot be in the future');
    });

    it('should check if has required fields', () => {
      const withTitle = ContentMetadata.create({ title: 'Test' });
      const withUrl = ContentMetadata.create({
        sourceUrl: 'https://example.com',
      });
      const empty = ContentMetadata.empty();

      expect(withTitle.hasRequiredFields()).toBe(true);
      expect(withUrl.hasRequiredFields()).toBe(true);
      expect(empty.hasRequiredFields()).toBe(false);
    });

    it('should check if metadata is complete', () => {
      const complete = ContentMetadata.create({
        title: 'Test',
        author: 'Author',
        publishedAt: new Date(),
        language: 'en',
        sourceUrl: 'https://example.com',
      });

      const incomplete = ContentMetadata.create({
        title: 'Test',
        author: 'Author',
      });

      expect(complete.isComplete()).toBe(true);
      expect(incomplete.isComplete()).toBe(false);
    });

    it('should check equality correctly', () => {
      const date = new Date('2024-01-01');
      const metadata1 = ContentMetadata.create({
        title: 'Test',
        author: 'Author',
        publishedAt: date,
        language: 'en',
        sourceUrl: 'https://example.com',
      });

      const metadata2 = ContentMetadata.create({
        title: 'Test',
        author: 'Author',
        publishedAt: new Date('2024-01-01'),
        language: 'en',
        sourceUrl: 'https://example.com',
      });

      const metadata3 = ContentMetadata.create({
        title: 'Different',
        author: 'Author',
      });

      expect(metadata1.equals(metadata2)).toBe(true);
      expect(metadata1.equals(metadata3)).toBe(false);
    });

    it('should convert to object', () => {
      const date = new Date('2024-01-01');
      const metadata = ContentMetadata.create({
        title: 'Test',
        publishedAt: date,
      });

      const obj = metadata.toObject();

      expect(obj.title).toBe('Test');
      expect(obj.publishedAt).toEqual(date);
      expect(obj.author).toBeNull();
    });
  });
});
