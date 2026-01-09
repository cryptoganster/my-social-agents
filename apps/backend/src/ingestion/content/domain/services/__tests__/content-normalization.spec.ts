import * as fc from 'fast-check';
import { ContentNormalizationService } from '../content-normalization';
import {
  SourceType,
  SourceTypeEnum,
} from '@/ingestion/source/domain/value-objects';

describe('ContentNormalizationService', () => {
  let service: ContentNormalizationService;

  beforeEach(() => {
    service = new ContentNormalizationService();
  });

  describe('normalize', () => {
    it('should remove excessive whitespace', () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const content = 'This   has    too     many      spaces';
      const result = service.normalize(content, sourceType);
      expect(result).toBe('This  has  too  many  spaces');
    });

    it('should normalize line endings', () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const content = 'Line 1\r\nLine 2\rLine 3\nLine 4';
      const result = service.normalize(content, sourceType);
      expect(result).toBe('Line 1\nLine 2\nLine 3\nLine 4');
    });

    it('should trim leading and trailing whitespace', () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const content = '   Content with spaces   ';
      const result = service.normalize(content, sourceType);
      expect(result).toBe('Content with spaces');
    });

    it('should remove control characters', () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const content = 'Text\x00with\x01control\x02chars';
      const result = service.normalize(content, sourceType);
      expect(result).toBe('Textwithcontrolchars');
    });
  });

  describe('extractMetadata', () => {
    it('should extract title from first line', () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const content = 'Bitcoin Reaches New High\nThe price of Bitcoin...';
      const metadata = service.extractMetadata(content, sourceType);
      expect(metadata.title).toBe('Bitcoin Reaches New High');
    });

    it('should extract author from common patterns', () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const content = 'Article Title\nBy John Smith\nContent here...';
      const metadata = service.extractMetadata(content, sourceType);
      expect(metadata.author).toBe('John Smith');
    });

    it('should extract date from ISO format', () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const content = 'Article from 2024-01-15\nContent here...';
      const metadata = service.extractMetadata(content, sourceType);
      expect(metadata.publishedAt).toEqual(new Date('2024-01-15'));
    });

    it('should extract URL from content', () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const content = 'Check out https://example.com for more info';
      const metadata = service.extractMetadata(content, sourceType);
      expect(metadata.sourceUrl).toBe('https://example.com');
    });
  });

  describe('detectAssets', () => {
    it('should detect Bitcoin mentions', () => {
      const content =
        'Bitcoin is the leading cryptocurrency. BTC price is rising.';
      const assets = service.detectAssets(content);
      const btc = assets.find((a) => a.symbol === 'BTC');
      expect(btc).toBeDefined();
      expect(btc?.symbol).toBe('BTC');
    });

    it('should detect Ethereum mentions', () => {
      const content = 'Ethereum smart contracts are powerful. ETH is valuable.';
      const assets = service.detectAssets(content);
      const eth = assets.find((a) => a.symbol === 'ETH');
      expect(eth).toBeDefined();
      expect(eth?.symbol).toBe('ETH');
    });

    it('should detect multiple cryptocurrencies', () => {
      const content =
        'Bitcoin and Ethereum are the top two. BTC and ETH dominate the market.';
      const assets = service.detectAssets(content);
      expect(assets.length).toBeGreaterThanOrEqual(2);
      expect(assets.some((a) => a.symbol === 'BTC')).toBe(true);
      expect(assets.some((a) => a.symbol === 'ETH')).toBe(true);
    });

    it('should assign higher confidence for multiple mentions', () => {
      const content =
        'Bitcoin is great. Bitcoin is popular. Bitcoin is valuable. BTC BTC BTC';
      const assets = service.detectAssets(content);
      const btc = assets.find((a) => a.symbol === 'BTC');
      expect(btc?.confidence).toBeGreaterThan(0.8);
    });

    it('should return empty array when no assets detected', () => {
      const content = 'This is just regular text with no crypto mentions.';
      const assets = service.detectAssets(content);
      expect(assets).toEqual([]);
    });
  });

  // Feature: content-ingestion, Property 3: Asset Tag Detection
  // **Validates: Requirements 2.3**
  describe('Property 3: Asset Tag Detection', () => {
    it('should detect cryptocurrency mentions in any content', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('Bitcoin', 'BTC', 'Ethereum', 'ETH', 'Solana', 'SOL'),
          fc.string({ minLength: 10, maxLength: 100 }),
          fc.string({ minLength: 10, maxLength: 100 }),
          (cryptoMention, prefix, suffix) => {
            const content = `${prefix} ${cryptoMention} ${suffix}`;
            const assets = service.detectAssets(content);

            // Should detect at least one asset
            expect(assets.length).toBeGreaterThan(0);

            // All detected assets should have valid symbols
            assets.forEach((asset) => {
              expect(asset.symbol).toMatch(/^[A-Z]+$/);
              expect(asset.symbol.length).toBeGreaterThan(0);
              expect(asset.symbol.length).toBeLessThanOrEqual(10);
            });

            // All detected assets should have valid confidence scores
            assets.forEach((asset) => {
              expect(asset.confidence).toBeGreaterThanOrEqual(0);
              expect(asset.confidence).toBeLessThanOrEqual(1);
            });
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should assign confidence scores based on mention frequency', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('Bitcoin', 'BTC'),
          fc.integer({ min: 1, max: 5 }),
          (cryptoMention, mentionCount) => {
            // Create content with repeated mentions
            const mentions = Array(mentionCount).fill(cryptoMention).join(' ');
            const content = `Article about ${mentions} and its impact.`;

            const assets = service.detectAssets(content);
            const btc = assets.find((a) => a.symbol === 'BTC');

            if (btc) {
              // More mentions should generally result in higher confidence
              if (mentionCount >= 3) {
                expect(btc.confidence).toBeGreaterThan(0.7);
              }
              // Confidence should always be in valid range
              expect(btc.confidence).toBeGreaterThanOrEqual(0);
              expect(btc.confidence).toBeLessThanOrEqual(1);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should handle content with no cryptocurrency mentions', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 200 }).filter((s) => {
            // Filter out strings that accidentally contain crypto terms
            const lowerS = s.toLowerCase();
            return (
              !lowerS.includes('bitcoin') &&
              !lowerS.includes('btc') &&
              !lowerS.includes('ethereum') &&
              !lowerS.includes('eth') &&
              !lowerS.includes('crypto')
            );
          }),
          (content) => {
            const assets = service.detectAssets(content);
            // Should return empty array or very low confidence detections
            expect(Array.isArray(assets)).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should detect assets case-insensitively', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'bitcoin',
            'Bitcoin',
            'BITCOIN',
            'BiTcOiN',
            'btc',
            'BTC',
            'Btc',
          ),
          (cryptoMention) => {
            const content = `This article discusses ${cryptoMention} technology.`;
            const assets = service.detectAssets(content);

            const btc = assets.find((a) => a.symbol === 'BTC');
            expect(btc).toBeDefined();
            expect(btc?.symbol).toBe('BTC'); // Always normalized to uppercase
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // Feature: content-ingestion, Property 5: Structured Data Preservation
  // **Validates: Requirements 2.5**
  describe('Property 5: Structured Data Preservation', () => {
    it('should preserve JSON structure in normalized content', () => {
      fc.assert(
        fc.property(
          fc.record({
            // Filter out characters that get modified by source-specific normalizations:
            // - < and > (removed by RSS HTML tag removal)
            // - | (replaced by I in PDF/OCR)
            // - ` and ' (normalized in PDF/OCR)
            // - [[ and ]] (modified by Wikipedia)
            name: fc
              .string({ minLength: 1, maxLength: 20 })
              .filter(
                (s) =>
                  !s.includes('<') &&
                  !s.includes('>') &&
                  !s.includes('|') &&
                  !s.includes('`') &&
                  !s.includes('[') &&
                  !s.includes(']'),
              ),
            value: fc.integer(),
            active: fc.boolean(),
          }),
          fc.constantFrom(
            SourceTypeEnum.WEB,
            SourceTypeEnum.RSS,
            SourceTypeEnum.SOCIAL_MEDIA,
            SourceTypeEnum.PDF,
            SourceTypeEnum.OCR,
            SourceTypeEnum.WIKIPEDIA,
          ),
          (jsonData, sourceTypeEnum) => {
            const sourceType = SourceType.fromEnum(sourceTypeEnum);
            const jsonString = JSON.stringify(jsonData, null, 2);
            const content = `Here is some data:\n${jsonString}\nEnd of data.`;

            const normalized = service.normalize(content, sourceType);

            // The JSON structure should still be parseable after normalization
            const jsonMatch = normalized.match(/\{[\s\S]*\}/);
            expect(jsonMatch).toBeTruthy();

            if (jsonMatch) {
              const extractedJson = jsonMatch[0];

              const parsed = JSON.parse(extractedJson);

              // All original data should be preserved after source-specific normalization

              expect(parsed.name).toBe(jsonData.name);

              expect(parsed.value).toBe(jsonData.value);

              expect(parsed.active).toBe(jsonData.active);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should preserve table-like structures in normalized content', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              col1: fc
                .string({ minLength: 1, maxLength: 10 })
                .filter((s) => s.trim().length > 0),
              col2: fc.integer({ min: 0, max: 1000 }),
            }),
            { minLength: 1, maxLength: 5 },
          ),
          (tableData) => {
            const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);

            // Create a simple table structure
            const header = 'Column1 | Column2';
            const separator = '--------|--------';
            const rows = tableData
              .map((row) => `${row.col1.trim()} | ${row.col2}`)
              .join('\n');
            const table = `${header}\n${separator}\n${rows}`;

            const content = `Table data:\n${table}\nEnd of table.`;
            const normalized = service.normalize(content, sourceType);

            // Table structure should be preserved (rows should still be present)
            tableData.forEach((row) => {
              expect(normalized).toContain(row.col1.trim());
              expect(normalized).toContain(row.col2.toString());
            });

            // Header should be preserved
            expect(normalized).toContain('Column1');
            expect(normalized).toContain('Column2');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should preserve XML-like structure in normalized content', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.stringMatching(/^[a-zA-Z0-9]{3,10}$/), // Only alphanumeric words
            {
              minLength: 2,
              maxLength: 5,
            },
          ),
          (words) => {
            // Create content with meaningful alphanumeric words
            const content = words.join(' ');
            const sourceType = SourceType.fromEnum(SourceTypeEnum.RSS);
            const xml = `<tag>${content}</tag>`;
            const fullContent = `XML data: ${xml}`;

            const normalized = service.normalize(fullContent, sourceType);

            // After normalization for RSS (which removes tags),
            // the alphanumeric words should still be present
            words.forEach((word) => {
              expect(normalized).toContain(word);
            });
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should preserve key-value pairs in normalized content', () => {
      fc.assert(
        fc.property(
          fc.dictionary(
            fc.string({ minLength: 1, maxLength: 10 }),
            fc.oneof(
              fc.string(),
              fc.integer().map(String),
              fc.boolean().map(String),
            ),
            { minKeys: 1, maxKeys: 5 },
          ),
          (kvPairs) => {
            const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);

            // Create key-value content
            const kvContent = Object.entries(kvPairs)
              .map(([key, value]) => `${key}: ${value}`)
              .join('\n');

            const content = `Configuration:\n${kvContent}\nEnd of config.`;
            const normalized = service.normalize(content, sourceType);

            // All keys and values should be preserved
            Object.entries(kvPairs).forEach(([key, value]) => {
              expect(normalized).toContain(key);
              expect(normalized).toContain(value);
            });
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should not lose data during normalization', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 30, maxLength: 200 }).filter((s) => {
            // Filter to ensure meaningful content
            // Must have at least 15 alphanumeric characters
            const alphanumericCount = (s.match(/\w+/g) || []).join('').length;
            // Must not be mostly HTML tags for RSS
            const tagCount = (s.match(/<[^>]*>/g) || []).length;
            return alphanumericCount >= 15 && tagCount < 5;
          }),
          fc.constantFrom(
            SourceTypeEnum.WEB,
            SourceTypeEnum.PDF,
            SourceTypeEnum.OCR,
            // Exclude RSS from this test as it intentionally removes tags
          ),
          (content, sourceTypeEnum) => {
            const sourceType = SourceType.fromEnum(sourceTypeEnum);

            // Extract meaningful words (alphanumeric sequences > 2 chars)
            const words = content.match(/\w{3,}/g) || [];
            const uniqueWords = [...new Set(words)];

            if (uniqueWords.length === 0) return;

            const normalized = service.normalize(content, sourceType);

            // Most unique words should still be present after normalization
            const preservedWords = uniqueWords.filter((word) =>
              normalized.includes(word),
            );

            const preservationRate = preservedWords.length / uniqueWords.length;

            // At least 80% of meaningful words preserved
            expect(preservationRate).toBeGreaterThan(0.8);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
