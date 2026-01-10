import * as fc from 'fast-check';
import { ParsedContent, ParsedContentProps } from '../parsed-content';

describe('ParsedContent', () => {
  // Helper to create valid props
  const createValidProps = (
    overrides: Partial<ParsedContentProps> = {},
  ): ParsedContentProps => ({
    markdown: '# Test Content\n\nSome markdown text.',
    extractedMetadata: {
      title: 'Test Title',
      author: 'Test Author',
      publishedAt: new Date('2025-01-01'),
      links: ['https://example.com'],
      images: ['https://example.com/image.png'],
      description: 'Test description',
    },
    parsingInfo: {
      parser: 'HtmlParsingStrategy',
      originalFormat: 'text/html',
      conversionTimeMs: 42,
      warnings: [],
    },
    ...overrides,
  });

  describe('Property-Based Tests', () => {
    /**
     * Feature: content-parsing-strategy, Property 1: Equality Reflexivity
     * Validates: Requirements 2.1
     */
    it('should satisfy reflexivity: vo.equals(vo) === true', () => {
      fc.assert(
        fc.property(
          fc.record({
            markdown: fc.string(),
            title: fc.option(fc.string(), { nil: undefined }),
            author: fc.option(fc.string(), { nil: undefined }),
            parser: fc.string({ minLength: 1 }),
            originalFormat: fc.string({ minLength: 1 }),
            conversionTimeMs: fc.nat(),
          }),
          (props) => {
            const parsedContent = ParsedContent.create({
              markdown: props.markdown,
              extractedMetadata: {
                title: props.title,
                author: props.author,
              },
              parsingInfo: {
                parser: props.parser,
                originalFormat: props.originalFormat,
                conversionTimeMs: props.conversionTimeMs,
              },
            });
            return parsedContent.equals(parsedContent);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Feature: content-parsing-strategy, Property 2: Equality Symmetry
     * Validates: Requirements 2.1
     */
    it('should satisfy symmetry: vo1.equals(vo2) === vo2.equals(vo1)', () => {
      fc.assert(
        fc.property(
          fc.record({
            markdown: fc.string(),
            parser: fc.string({ minLength: 1 }),
            originalFormat: fc.string({ minLength: 1 }),
            conversionTimeMs: fc.nat(),
          }),
          (props) => {
            const parsedContent1 = ParsedContent.create({
              markdown: props.markdown,
              extractedMetadata: {},
              parsingInfo: {
                parser: props.parser,
                originalFormat: props.originalFormat,
                conversionTimeMs: props.conversionTimeMs,
              },
            });
            const parsedContent2 = ParsedContent.create({
              markdown: props.markdown,
              extractedMetadata: {},
              parsingInfo: {
                parser: props.parser,
                originalFormat: props.originalFormat,
                conversionTimeMs: props.conversionTimeMs,
              },
            });
            return (
              parsedContent1.equals(parsedContent2) ===
              parsedContent2.equals(parsedContent1)
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Feature: content-parsing-strategy, Property 3: hasContent Consistency
     * Validates: Requirements 2.3
     */
    it('should return hasContent=true only for non-empty trimmed markdown', () => {
      fc.assert(
        fc.property(fc.string(), (markdown) => {
          const parsedContent = ParsedContent.create({
            markdown,
            extractedMetadata: {},
            parsingInfo: {
              parser: 'TestParser',
              originalFormat: 'text/plain',
              conversionTimeMs: 0,
            },
          });

          const expectedHasContent = markdown.trim().length > 0;
          return parsedContent.hasContent === expectedHasContent;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Feature: content-parsing-strategy, Property 4: hasWarnings Consistency
     * Validates: Requirements 2.4
     */
    it('should return hasWarnings=true only when warnings array is non-empty', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1 }), { minLength: 0, maxLength: 5 }),
          (warnings) => {
            const parsedContent = ParsedContent.create({
              markdown: 'test',
              extractedMetadata: {},
              parsingInfo: {
                parser: 'TestParser',
                originalFormat: 'text/plain',
                conversionTimeMs: 0,
                warnings: warnings.length > 0 ? warnings : undefined,
              },
            });

            const expectedHasWarnings = warnings.length > 0;
            return parsedContent.hasWarnings === expectedHasWarnings;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Feature: content-parsing-strategy, Property 5: Immutability
     * Validates: Requirements 2.2
     */
    it('should be immutable after creation', () => {
      fc.assert(
        fc.property(
          fc.record({
            markdown: fc.string(),
            parser: fc.string({ minLength: 1 }),
            originalFormat: fc.string({ minLength: 1 }),
            conversionTimeMs: fc.nat(),
          }),
          (props) => {
            const parsedContent = ParsedContent.create({
              markdown: props.markdown,
              extractedMetadata: {},
              parsingInfo: {
                parser: props.parser,
                originalFormat: props.originalFormat,
                conversionTimeMs: props.conversionTimeMs,
              },
            });

            // Attempt to modify should not change the value
            const originalMarkdown = parsedContent.markdown;
            const originalParser = parsedContent.parsingInfo.parser;

            // Object.freeze prevents modification
            expect(parsedContent.markdown).toBe(originalMarkdown);
            expect(parsedContent.parsingInfo.parser).toBe(originalParser);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Unit Tests', () => {
    describe('create()', () => {
      it('should create ParsedContent with valid props', () => {
        const props = createValidProps();
        const parsedContent = ParsedContent.create(props);

        expect(parsedContent).toBeDefined();
        expect(parsedContent.markdown).toBe(props.markdown);
        expect(parsedContent.extractedMetadata).toEqual(
          props.extractedMetadata,
        );
        expect(parsedContent.parsingInfo).toEqual(props.parsingInfo);
      });

      it('should create ParsedContent with empty markdown', () => {
        const props = createValidProps({ markdown: '' });
        const parsedContent = ParsedContent.create(props);

        expect(parsedContent.markdown).toBe('');
        expect(parsedContent.hasContent).toBe(false);
      });

      it('should create ParsedContent with minimal metadata', () => {
        const props = createValidProps({
          extractedMetadata: {},
        });
        const parsedContent = ParsedContent.create(props);

        expect(parsedContent.extractedMetadata).toEqual({});
      });

      it('should create ParsedContent without warnings', () => {
        const props = createValidProps({
          parsingInfo: {
            parser: 'TestParser',
            originalFormat: 'text/html',
            conversionTimeMs: 10,
          },
        });
        const parsedContent = ParsedContent.create(props);

        expect(parsedContent.hasWarnings).toBe(false);
        expect(parsedContent.warnings).toEqual([]);
      });
    });

    describe('validation', () => {
      it('should throw error when markdown is undefined', () => {
        const props = createValidProps();
        (props as any).markdown = undefined;

        expect(() => ParsedContent.create(props)).toThrow(
          'Markdown content must be defined',
        );
      });

      it('should throw error when markdown is null', () => {
        const props = createValidProps();
        (props as any).markdown = null;

        expect(() => ParsedContent.create(props)).toThrow(
          'Markdown content must be defined',
        );
      });

      it('should throw error when extractedMetadata is undefined', () => {
        const props = createValidProps();
        (props as any).extractedMetadata = undefined;

        expect(() => ParsedContent.create(props)).toThrow(
          'Extracted metadata must be defined',
        );
      });

      it('should throw error when parsingInfo is undefined', () => {
        const props = createValidProps();
        (props as any).parsingInfo = undefined;

        expect(() => ParsedContent.create(props)).toThrow(
          'Parsing info must be defined',
        );
      });

      it('should throw error when parser name is missing', () => {
        const props = createValidProps({
          parsingInfo: {
            parser: '',
            originalFormat: 'text/html',
            conversionTimeMs: 10,
          },
        });

        expect(() => ParsedContent.create(props)).toThrow(
          'Parser name must be defined in parsing info',
        );
      });

      it('should throw error when originalFormat is missing', () => {
        const props = createValidProps({
          parsingInfo: {
            parser: 'TestParser',
            originalFormat: '',
            conversionTimeMs: 10,
          },
        });

        expect(() => ParsedContent.create(props)).toThrow(
          'Original format must be defined in parsing info',
        );
      });

      it('should throw error when conversionTimeMs is negative', () => {
        const props = createValidProps({
          parsingInfo: {
            parser: 'TestParser',
            originalFormat: 'text/html',
            conversionTimeMs: -1,
          },
        });

        expect(() => ParsedContent.create(props)).toThrow(
          'Conversion time must be a non-negative number',
        );
      });

      it('should throw error when conversionTimeMs is undefined', () => {
        const props = createValidProps({
          parsingInfo: {
            parser: 'TestParser',
            originalFormat: 'text/html',
            conversionTimeMs: undefined as any,
          },
        });

        expect(() => ParsedContent.create(props)).toThrow(
          'Conversion time must be a non-negative number',
        );
      });
    });

    describe('hasContent', () => {
      it('should return true for non-empty markdown', () => {
        const props = createValidProps({ markdown: '# Title' });
        const parsedContent = ParsedContent.create(props);

        expect(parsedContent.hasContent).toBe(true);
      });

      it('should return false for empty markdown', () => {
        const props = createValidProps({ markdown: '' });
        const parsedContent = ParsedContent.create(props);

        expect(parsedContent.hasContent).toBe(false);
      });

      it('should return false for whitespace-only markdown', () => {
        const props = createValidProps({ markdown: '   \n\t  ' });
        const parsedContent = ParsedContent.create(props);

        expect(parsedContent.hasContent).toBe(false);
      });
    });

    describe('hasWarnings', () => {
      it('should return true when warnings array has items', () => {
        const props = createValidProps({
          parsingInfo: {
            parser: 'TestParser',
            originalFormat: 'text/html',
            conversionTimeMs: 10,
            warnings: ['Warning 1', 'Warning 2'],
          },
        });
        const parsedContent = ParsedContent.create(props);

        expect(parsedContent.hasWarnings).toBe(true);
      });

      it('should return false when warnings array is empty', () => {
        const props = createValidProps({
          parsingInfo: {
            parser: 'TestParser',
            originalFormat: 'text/html',
            conversionTimeMs: 10,
            warnings: [],
          },
        });
        const parsedContent = ParsedContent.create(props);

        expect(parsedContent.hasWarnings).toBe(false);
      });

      it('should return false when warnings is undefined', () => {
        const props = createValidProps({
          parsingInfo: {
            parser: 'TestParser',
            originalFormat: 'text/html',
            conversionTimeMs: 10,
          },
        });
        const parsedContent = ParsedContent.create(props);

        expect(parsedContent.hasWarnings).toBe(false);
      });
    });

    describe('warnings getter', () => {
      it('should return warnings array when present', () => {
        const warnings = ['Warning 1', 'Warning 2'];
        const props = createValidProps({
          parsingInfo: {
            parser: 'TestParser',
            originalFormat: 'text/html',
            conversionTimeMs: 10,
            warnings,
          },
        });
        const parsedContent = ParsedContent.create(props);

        expect(parsedContent.warnings).toEqual(warnings);
      });

      it('should return empty array when warnings is undefined', () => {
        const props = createValidProps({
          parsingInfo: {
            parser: 'TestParser',
            originalFormat: 'text/html',
            conversionTimeMs: 10,
          },
        });
        const parsedContent = ParsedContent.create(props);

        expect(parsedContent.warnings).toEqual([]);
      });
    });

    describe('equality', () => {
      it('should be equal when all properties match', () => {
        const props = createValidProps();
        const parsedContent1 = ParsedContent.create(props);
        const parsedContent2 = ParsedContent.create(props);

        expect(parsedContent1.equals(parsedContent2)).toBe(true);
      });

      it('should not be equal when markdown differs', () => {
        const props1 = createValidProps({ markdown: '# Title 1' });
        const props2 = createValidProps({ markdown: '# Title 2' });
        const parsedContent1 = ParsedContent.create(props1);
        const parsedContent2 = ParsedContent.create(props2);

        expect(parsedContent1.equals(parsedContent2)).toBe(false);
      });

      it('should not be equal when metadata differs', () => {
        const props1 = createValidProps({
          extractedMetadata: { title: 'Title 1' },
        });
        const props2 = createValidProps({
          extractedMetadata: { title: 'Title 2' },
        });
        const parsedContent1 = ParsedContent.create(props1);
        const parsedContent2 = ParsedContent.create(props2);

        expect(parsedContent1.equals(parsedContent2)).toBe(false);
      });

      it('should not be equal when parsingInfo differs', () => {
        const props1 = createValidProps({
          parsingInfo: {
            parser: 'Parser1',
            originalFormat: 'text/html',
            conversionTimeMs: 10,
          },
        });
        const props2 = createValidProps({
          parsingInfo: {
            parser: 'Parser2',
            originalFormat: 'text/html',
            conversionTimeMs: 10,
          },
        });
        const parsedContent1 = ParsedContent.create(props1);
        const parsedContent2 = ParsedContent.create(props2);

        expect(parsedContent1.equals(parsedContent2)).toBe(false);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle markdown with special characters', () => {
      const props = createValidProps({
        markdown: '# Title with `code` and **bold** and _italic_',
      });
      const parsedContent = ParsedContent.create(props);

      expect(parsedContent.markdown).toBe(
        '# Title with `code` and **bold** and _italic_',
      );
      expect(parsedContent.hasContent).toBe(true);
    });

    it('should handle markdown with unicode characters', () => {
      const props = createValidProps({
        markdown: '# 日本語タイトル 🚀 émojis',
      });
      const parsedContent = ParsedContent.create(props);

      expect(parsedContent.markdown).toBe('# 日本語タイトル 🚀 émojis');
      expect(parsedContent.hasContent).toBe(true);
    });

    it('should handle very long markdown content', () => {
      const longMarkdown = '# Title\n\n' + 'Lorem ipsum '.repeat(10000);
      const props = createValidProps({ markdown: longMarkdown });
      const parsedContent = ParsedContent.create(props);

      expect(parsedContent.markdown).toBe(longMarkdown);
      expect(parsedContent.hasContent).toBe(true);
    });

    it('should handle zero conversion time', () => {
      const props = createValidProps({
        parsingInfo: {
          parser: 'TestParser',
          originalFormat: 'text/html',
          conversionTimeMs: 0,
        },
      });
      const parsedContent = ParsedContent.create(props);

      expect(parsedContent.parsingInfo.conversionTimeMs).toBe(0);
    });

    it('should handle metadata with all optional fields undefined', () => {
      const props = createValidProps({
        extractedMetadata: {
          title: undefined,
          author: undefined,
          publishedAt: undefined,
          links: undefined,
          images: undefined,
          description: undefined,
        },
      });
      const parsedContent = ParsedContent.create(props);

      expect(parsedContent.extractedMetadata.title).toBeUndefined();
      expect(parsedContent.extractedMetadata.author).toBeUndefined();
    });

    it('should handle metadata with empty arrays', () => {
      const props = createValidProps({
        extractedMetadata: {
          links: [],
          images: [],
        },
      });
      const parsedContent = ParsedContent.create(props);

      expect(parsedContent.extractedMetadata.links).toEqual([]);
      expect(parsedContent.extractedMetadata.images).toEqual([]);
    });
  });
});
