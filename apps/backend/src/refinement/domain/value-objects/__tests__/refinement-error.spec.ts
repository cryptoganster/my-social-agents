import { RefinementError } from '@refinement/domain/value-objects/refinement-error';

describe('RefinementError', () => {
  describe('create', () => {
    it('should create error with all properties', () => {
      const now = new Date();
      const error = RefinementError.create(
        'Test error message',
        'TEST_ERROR',
        'stack trace here',
        now,
      );

      expect(error.message).toBe('Test error message');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.stackTrace).toBe('stack trace here');
      expect(error.occurredAt).toBe(now);
    });

    it('should create error without stack trace', () => {
      const error = RefinementError.create('Test error message', 'TEST_ERROR');

      expect(error.message).toBe('Test error message');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.stackTrace).toBeUndefined();
      expect(error.occurredAt).toBeInstanceOf(Date);
    });

    it('should default occurredAt to current time', () => {
      const before = new Date();
      const error = RefinementError.create('Test error', 'TEST_ERROR');
      const after = new Date();

      expect(error.occurredAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(error.occurredAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should throw error if message is empty', () => {
      expect(() => RefinementError.create('', 'TEST_ERROR')).toThrow(
        'Invalid message: must be a non-empty string',
      );
    });

    it('should throw error if message is whitespace only', () => {
      expect(() => RefinementError.create('   ', 'TEST_ERROR')).toThrow(
        'Invalid message: must be a non-empty string',
      );
    });

    it('should throw error if code is empty', () => {
      expect(() => RefinementError.create('Test error', '')).toThrow(
        'Invalid code: must be a non-empty string',
      );
    });

    it('should throw error if code is whitespace only', () => {
      expect(() => RefinementError.create('Test error', '   ')).toThrow(
        'Invalid code: must be a non-empty string',
      );
    });

    it('should throw error if occurredAt is invalid date', () => {
      expect(() =>
        RefinementError.create(
          'Test error',
          'TEST_ERROR',
          undefined,
          new Date('invalid'),
        ),
      ).toThrow('Invalid occurredAt: must be a valid Date');
    });
  });

  describe('fromException', () => {
    it('should create error from Error object', () => {
      const jsError = new Error('Something went wrong');
      const error = RefinementError.fromException(jsError);

      expect(error.message).toBe('Something went wrong');
      expect(error.code).toBe('UNKNOWN_ERROR');
      expect(error.stackTrace).toBe(jsError.stack);
      expect(error.occurredAt).toBeInstanceOf(Date);
    });

    it('should create error with custom code', () => {
      const jsError = new Error('Something went wrong');
      const error = RefinementError.fromException(jsError, 'CUSTOM_ERROR');

      expect(error.message).toBe('Something went wrong');
      expect(error.code).toBe('CUSTOM_ERROR');
      expect(error.stackTrace).toBe(jsError.stack);
    });

    it('should preserve stack trace from Error object', () => {
      const jsError = new Error('Test error');
      const error = RefinementError.fromException(jsError);

      expect(error.stackTrace).toBeDefined();
      expect(error.stackTrace).toContain('Error: Test error');
    });
  });

  describe('factory methods for specific error types', () => {
    it('should create chunking failed error', () => {
      const error = RefinementError.chunkingFailed(
        'Failed to chunk content',
        'stack',
      );

      expect(error.message).toBe('Failed to chunk content');
      expect(error.code).toBe('CHUNKING_FAILED');
      expect(error.stackTrace).toBe('stack');
    });

    it('should create entity extraction failed error', () => {
      const error = RefinementError.entityExtractionFailed(
        'Failed to extract entities',
      );

      expect(error.message).toBe('Failed to extract entities');
      expect(error.code).toBe('ENTITY_EXTRACTION_FAILED');
    });

    it('should create temporal analysis failed error', () => {
      const error = RefinementError.temporalAnalysisFailed(
        'Failed to analyze temporal context',
      );

      expect(error.message).toBe('Failed to analyze temporal context');
      expect(error.code).toBe('TEMPORAL_ANALYSIS_FAILED');
    });

    it('should create quality analysis failed error', () => {
      const error = RefinementError.qualityAnalysisFailed(
        'Failed to analyze quality',
      );

      expect(error.message).toBe('Failed to analyze quality');
      expect(error.code).toBe('QUALITY_ANALYSIS_FAILED');
    });

    it('should create validation failed error', () => {
      const error = RefinementError.validationFailed(
        'Content validation failed',
      );

      expect(error.message).toBe('Content validation failed');
      expect(error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('getters', () => {
    it('should return message', () => {
      const error = RefinementError.create('Test message', 'TEST_ERROR');
      expect(error.message).toBe('Test message');
    });

    it('should return code', () => {
      const error = RefinementError.create('Test message', 'TEST_ERROR');
      expect(error.code).toBe('TEST_ERROR');
    });

    it('should return stackTrace when present', () => {
      const error = RefinementError.create(
        'Test message',
        'TEST_ERROR',
        'stack trace',
      );
      expect(error.stackTrace).toBe('stack trace');
    });

    it('should return undefined stackTrace when not present', () => {
      const error = RefinementError.create('Test message', 'TEST_ERROR');
      expect(error.stackTrace).toBeUndefined();
    });

    it('should return occurredAt', () => {
      const now = new Date();
      const error = RefinementError.create(
        'Test message',
        'TEST_ERROR',
        undefined,
        now,
      );
      expect(error.occurredAt).toBe(now);
    });
  });

  describe('hasStackTrace', () => {
    it('should return true when stack trace is present', () => {
      const error = RefinementError.create(
        'Test message',
        'TEST_ERROR',
        'stack trace',
      );
      expect(error.hasStackTrace).toBe(true);
    });

    it('should return false when stack trace is not present', () => {
      const error = RefinementError.create('Test message', 'TEST_ERROR');
      expect(error.hasStackTrace).toBe(false);
    });
  });

  describe('toString', () => {
    it('should format error without stack trace', () => {
      const now = new Date('2025-01-08T12:00:00Z');
      const error = RefinementError.create(
        'Test error message',
        'TEST_ERROR',
        undefined,
        now,
      );

      const str = error.toString();
      expect(str).toContain('[TEST_ERROR]');
      expect(str).toContain('Test error message');
      expect(str).toContain('2025-01-08T12:00:00.000Z');
      expect(str).not.toContain('\n');
    });

    it('should format error with stack trace', () => {
      const now = new Date('2025-01-08T12:00:00Z');
      const error = RefinementError.create(
        'Test error message',
        'TEST_ERROR',
        'Error: Test\n  at line 1',
        now,
      );

      const str = error.toString();
      expect(str).toContain('[TEST_ERROR]');
      expect(str).toContain('Test error message');
      expect(str).toContain('2025-01-08T12:00:00.000Z');
      expect(str).toContain('\nError: Test\n  at line 1');
    });
  });

  describe('equals', () => {
    it('should return true for errors with same values', () => {
      const now = new Date();
      const error1 = RefinementError.create(
        'Test error',
        'TEST_ERROR',
        'stack',
        now,
      );
      const error2 = RefinementError.create(
        'Test error',
        'TEST_ERROR',
        'stack',
        now,
      );

      expect(error1.equals(error2)).toBe(true);
    });

    it('should return false for errors with different messages', () => {
      const now = new Date();
      const error1 = RefinementError.create(
        'Test error 1',
        'TEST_ERROR',
        undefined,
        now,
      );
      const error2 = RefinementError.create(
        'Test error 2',
        'TEST_ERROR',
        undefined,
        now,
      );

      expect(error1.equals(error2)).toBe(false);
    });

    it('should return false for errors with different codes', () => {
      const now = new Date();
      const error1 = RefinementError.create(
        'Test error',
        'ERROR_1',
        undefined,
        now,
      );
      const error2 = RefinementError.create(
        'Test error',
        'ERROR_2',
        undefined,
        now,
      );

      expect(error1.equals(error2)).toBe(false);
    });

    it('should return false for errors with different timestamps', () => {
      const error1 = RefinementError.create(
        'Test error',
        'TEST_ERROR',
        undefined,
        new Date('2025-01-08T12:00:00Z'),
      );
      const error2 = RefinementError.create(
        'Test error',
        'TEST_ERROR',
        undefined,
        new Date('2025-01-08T13:00:00Z'),
      );

      expect(error1.equals(error2)).toBe(false);
    });

    it('should return false for errors with different stack traces', () => {
      const now = new Date();
      const error1 = RefinementError.create(
        'Test error',
        'TEST_ERROR',
        'stack 1',
        now,
      );
      const error2 = RefinementError.create(
        'Test error',
        'TEST_ERROR',
        'stack 2',
        now,
      );

      expect(error1.equals(error2)).toBe(false);
    });
  });

  describe('immutability', () => {
    it('should not allow modification of message', () => {
      const error = RefinementError.create('Test error', 'TEST_ERROR');

      expect(() => {
        // @ts-expect-error - Testing immutability
        error.message = 'Modified message';
      }).toThrow();
    });

    it('should not allow modification of code', () => {
      const error = RefinementError.create('Test error', 'TEST_ERROR');

      expect(() => {
        // @ts-expect-error - Testing immutability
        error.code = 'MODIFIED_CODE';
      }).toThrow();
    });

    it('should create independent instances', () => {
      const error1 = RefinementError.create('Error 1', 'CODE_1');
      const error2 = RefinementError.create('Error 2', 'CODE_2');

      expect(error1.message).toBe('Error 1');
      expect(error2.message).toBe('Error 2');
      expect(error1.code).toBe('CODE_1');
      expect(error2.code).toBe('CODE_2');
    });
  });

  describe('real-world scenarios', () => {
    it('should capture error from try-catch block', () => {
      try {
        throw new Error('Chunking failed due to invalid input');
      } catch (e) {
        const error = RefinementError.fromException(
          e as Error,
          'CHUNKING_FAILED',
        );

        expect(error.message).toBe('Chunking failed due to invalid input');
        expect(error.code).toBe('CHUNKING_FAILED');
        expect(error.hasStackTrace).toBe(true);
      }
    });

    it('should create error for LLM timeout', () => {
      const error = RefinementError.entityExtractionFailed(
        'LLM request timed out after 5000ms',
      );

      expect(error.message).toContain('timed out');
      expect(error.code).toBe('ENTITY_EXTRACTION_FAILED');
    });

    it('should create error for quality threshold rejection', () => {
      const error = RefinementError.validationFailed(
        'Content quality score 0.25 below threshold 0.3',
      );

      expect(error.message).toContain('quality score');
      expect(error.code).toBe('VALIDATION_FAILED');
    });
  });
});
