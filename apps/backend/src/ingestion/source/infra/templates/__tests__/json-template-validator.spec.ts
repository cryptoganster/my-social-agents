import { JsonTemplateValidator } from '../json-template-validator';

describe('JsonTemplateValidator', () => {
  let validator: JsonTemplateValidator;

  beforeEach(() => {
    validator = new JsonTemplateValidator();
  });

  describe('validate', () => {
    it('should validate a complete valid template', () => {
      const template = {
        feedUrl: 'https://example.com/rss',
        updateInterval: 3600,
        categories: ['bitcoin', 'ethereum'],
        language: 'en',
        maxItems: 50,
        timeout: 30000,
      };

      const result = validator.validate(template);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a template with only required fields', () => {
      const template = {
        feedUrl: 'https://example.com/rss',
        updateInterval: 3600,
      };

      const result = validator.validate(template);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject template missing feedUrl', () => {
      const template = {
        updateInterval: 3600,
      };

      const result = validator.validate(template);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: feedUrl');
    });

    it('should reject template missing updateInterval', () => {
      const template = {
        feedUrl: 'https://example.com/rss',
      };

      const result = validator.validate(template);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: updateInterval');
    });

    it('should reject non-object template', () => {
      const result = validator.validate('not an object');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Template must be a valid JSON object');
    });

    it('should reject null template', () => {
      const result = validator.validate(null);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Template must be a valid JSON object');
    });

    it('should collect multiple validation errors', () => {
      const template = {
        feedUrl: 'invalid-url',
        updateInterval: -1,
        categories: 'not-an-array',
        language: 'invalid',
      };

      const result = validator.validate(template);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('validateField - feedUrl', () => {
    it('should accept valid HTTP URL', () => {
      const result = validator.validateField(
        'feedUrl',
        'http://example.com/rss',
      );

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept valid HTTPS URL', () => {
      const result = validator.validateField(
        'feedUrl',
        'https://example.com/rss',
      );

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject missing feedUrl', () => {
      const result = validator.validateField('feedUrl', undefined);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Missing required field: feedUrl');
    });

    it('should reject non-string feedUrl', () => {
      const result = validator.validateField('feedUrl', 123);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid value for feedUrl: must be a string');
    });

    it('should reject empty feedUrl', () => {
      const result = validator.validateField('feedUrl', '   ');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid value for feedUrl: cannot be empty');
    });

    it('should reject invalid URL format', () => {
      const result = validator.validateField('feedUrl', 'not-a-url');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Invalid value for feedUrl: must be a valid HTTP or HTTPS URL',
      );
    });
  });

  describe('validateField - updateInterval', () => {
    it('should accept positive integer', () => {
      const result = validator.validateField('updateInterval', 3600);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject missing updateInterval', () => {
      const result = validator.validateField('updateInterval', undefined);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Missing required field: updateInterval');
    });

    it('should reject non-number updateInterval', () => {
      const result = validator.validateField('updateInterval', '3600');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Invalid value for updateInterval: must be a number',
      );
    });

    it('should reject non-integer updateInterval', () => {
      const result = validator.validateField('updateInterval', 3600.5);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Invalid value for updateInterval: must be an integer',
      );
    });

    it('should reject zero updateInterval', () => {
      const result = validator.validateField('updateInterval', 0);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Invalid value for updateInterval: must be a positive integer',
      );
    });

    it('should reject negative updateInterval', () => {
      const result = validator.validateField('updateInterval', -100);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Invalid value for updateInterval: must be a positive integer',
      );
    });
  });

  describe('validateField - categories', () => {
    it('should accept array of strings', () => {
      const result = validator.validateField('categories', [
        'bitcoin',
        'ethereum',
      ]);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept empty array', () => {
      const result = validator.validateField('categories', []);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject non-array categories', () => {
      const result = validator.validateField('categories', 'bitcoin');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Invalid value for categories: must be an array',
      );
    });

    it('should reject array with non-string elements', () => {
      const result = validator.validateField('categories', ['bitcoin', 123]);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Invalid value for categories: must be an array of strings',
      );
    });
  });

  describe('validateField - language', () => {
    it('should accept valid ISO 639-1 code', () => {
      const result = validator.validateField('language', 'en');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept other valid ISO 639-1 codes', () => {
      const codes = ['es', 'fr', 'de', 'ja', 'zh'];

      codes.forEach((code) => {
        const result = validator.validateField('language', code);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject non-string language', () => {
      const result = validator.validateField('language', 123);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid value for language: must be a string');
    });

    it('should reject uppercase language code', () => {
      const result = validator.validateField('language', 'EN');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Invalid value for language: must be a valid ISO 639-1 language code (2 lowercase letters)',
      );
    });

    it('should reject language code with wrong length', () => {
      const result = validator.validateField('language', 'eng');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Invalid value for language: must be a valid ISO 639-1 language code (2 lowercase letters)',
      );
    });

    it('should reject language code with numbers', () => {
      const result = validator.validateField('language', 'e1');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Invalid value for language: must be a valid ISO 639-1 language code (2 lowercase letters)',
      );
    });
  });

  describe('validateField - maxItems', () => {
    it('should accept positive integer', () => {
      const result = validator.validateField('maxItems', 50);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject non-number maxItems', () => {
      const result = validator.validateField('maxItems', '50');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid value for maxItems: must be a number');
    });

    it('should reject non-integer maxItems', () => {
      const result = validator.validateField('maxItems', 50.5);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Invalid value for maxItems: must be an integer',
      );
    });

    it('should reject zero maxItems', () => {
      const result = validator.validateField('maxItems', 0);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Invalid value for maxItems: must be a positive integer',
      );
    });

    it('should reject negative maxItems', () => {
      const result = validator.validateField('maxItems', -10);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Invalid value for maxItems: must be a positive integer',
      );
    });
  });

  describe('validateField - timeout', () => {
    it('should accept positive integer', () => {
      const result = validator.validateField('timeout', 30000);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject non-number timeout', () => {
      const result = validator.validateField('timeout', '30000');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid value for timeout: must be a number');
    });

    it('should reject non-integer timeout', () => {
      const result = validator.validateField('timeout', 30000.5);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Invalid value for timeout: must be an integer',
      );
    });

    it('should reject zero timeout', () => {
      const result = validator.validateField('timeout', 0);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Invalid value for timeout: must be a positive integer',
      );
    });

    it('should reject negative timeout', () => {
      const result = validator.validateField('timeout', -1000);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Invalid value for timeout: must be a positive integer',
      );
    });
  });

  describe('validateField - unknown field', () => {
    it('should accept unknown fields without validation', () => {
      const result = validator.validateField('unknownField', 'any value');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('error message generation', () => {
    it('should generate clear error messages for missing fields', () => {
      const template = {};

      const result = validator.validate(template);

      expect(result.errors).toContain('Missing required field: feedUrl');
      expect(result.errors).toContain('Missing required field: updateInterval');
    });

    it('should generate clear error messages for invalid values', () => {
      const template = {
        feedUrl: 'invalid',
        updateInterval: 'invalid',
      };

      const result = validator.validate(template);

      expect(result.errors.some((e) => e.includes('Invalid value for'))).toBe(
        true,
      );
    });

    it('should generate specific error messages for each field type', () => {
      const feedUrlResult = validator.validateField('feedUrl', 'invalid');
      expect(feedUrlResult.error).toContain('feedUrl');

      const updateIntervalResult = validator.validateField(
        'updateInterval',
        -1,
      );
      expect(updateIntervalResult.error).toContain('updateInterval');

      const languageResult = validator.validateField('language', 'invalid');
      expect(languageResult.error).toContain('language');
    });
  });
});
