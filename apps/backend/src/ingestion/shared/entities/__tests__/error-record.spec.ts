import { ErrorRecord, ErrorType } from '../error-record';

describe('ErrorRecord', () => {
  describe('Unit Tests', () => {
    it('should create a new error record', () => {
      const errorRecord = ErrorRecord.create({
        errorType: ErrorType.NETWORK_ERROR,
        message: 'Connection timeout',
        stackTrace: 'Error: Connection timeout\n  at ...',
      });

      expect(errorRecord.errorId).toBeDefined();
      expect(errorRecord.errorId).toMatch(/^err_/);
      expect(errorRecord.timestamp).toBeInstanceOf(Date);
      expect(errorRecord.errorType).toBe(ErrorType.NETWORK_ERROR);
      expect(errorRecord.message).toBe('Connection timeout');
      expect(errorRecord.stackTrace).toBe(
        'Error: Connection timeout\n  at ...',
      );
      expect(errorRecord.retryCount).toBe(0);
    });

    it('should create error record from Error object', () => {
      const error = new Error('Test error');
      const errorRecord = ErrorRecord.fromError(error, ErrorType.PARSING_ERROR);

      expect(errorRecord.errorType).toBe(ErrorType.PARSING_ERROR);
      expect(errorRecord.message).toBe('Test error');
      expect(errorRecord.stackTrace).toBeDefined();
    });

    it('should create error record from Error object with default type', () => {
      const error = new Error('Test error');
      const errorRecord = ErrorRecord.fromError(error);

      expect(errorRecord.errorType).toBe(ErrorType.UNKNOWN_ERROR);
      expect(errorRecord.message).toBe('Test error');
    });

    it('should increment retry count', () => {
      const errorRecord = ErrorRecord.create({
        errorType: ErrorType.NETWORK_ERROR,
        message: 'Connection timeout',
      });

      expect(errorRecord.retryCount).toBe(0);

      errorRecord.incrementRetryCount();
      expect(errorRecord.retryCount).toBe(1);

      errorRecord.incrementRetryCount();
      expect(errorRecord.retryCount).toBe(2);
    });

    it('should identify retryable errors', () => {
      const networkError = ErrorRecord.create({
        errorType: ErrorType.NETWORK_ERROR,
        message: 'Connection timeout',
      });
      expect(networkError.isRetryable()).toBe(true);

      const rateLimitError = ErrorRecord.create({
        errorType: ErrorType.RATE_LIMIT_ERROR,
        message: 'Rate limit exceeded',
      });
      expect(rateLimitError.isRetryable()).toBe(true);

      const timeoutError = ErrorRecord.create({
        errorType: ErrorType.TIMEOUT_ERROR,
        message: 'Request timeout',
      });
      expect(timeoutError.isRetryable()).toBe(true);

      const validationError = ErrorRecord.create({
        errorType: ErrorType.VALIDATION_ERROR,
        message: 'Invalid data',
      });
      expect(validationError.isRetryable()).toBe(false);

      const authError = ErrorRecord.create({
        errorType: ErrorType.AUTHENTICATION_ERROR,
        message: 'Invalid credentials',
      });
      expect(authError.isRetryable()).toBe(false);
    });

    it('should check if max retries exceeded', () => {
      const errorRecord = ErrorRecord.create({
        errorType: ErrorType.NETWORK_ERROR,
        message: 'Connection timeout',
      });

      expect(errorRecord.hasExceededMaxRetries(5)).toBe(false);

      for (let i = 0; i < 5; i++) {
        errorRecord.incrementRetryCount();
      }

      expect(errorRecord.hasExceededMaxRetries(5)).toBe(true);
    });

    it('should check if max retries exceeded with custom limit', () => {
      const errorRecord = ErrorRecord.create({
        errorType: ErrorType.NETWORK_ERROR,
        message: 'Connection timeout',
      });

      errorRecord.incrementRetryCount();
      errorRecord.incrementRetryCount();
      errorRecord.incrementRetryCount();

      expect(errorRecord.hasExceededMaxRetries(3)).toBe(true);
      expect(errorRecord.hasExceededMaxRetries(5)).toBe(false);
    });

    it('should return plain object representation', () => {
      const errorRecord = ErrorRecord.create({
        errorType: ErrorType.PARSING_ERROR,
        message: 'Failed to parse JSON',
        stackTrace: 'Error: Failed to parse JSON\n  at ...',
      });

      const obj = errorRecord.toObject();

      expect(obj.errorId).toBe(errorRecord.errorId);
      expect(obj.timestamp).toBe(errorRecord.timestamp);
      expect(obj.errorType).toBe(ErrorType.PARSING_ERROR);
      expect(obj.message).toBe('Failed to parse JSON');
      expect(obj.stackTrace).toBe('Error: Failed to parse JSON\n  at ...');
      expect(obj.retryCount).toBe(0);
    });

    it('should reconstitute from persistence', () => {
      const timestamp = new Date();
      const errorRecord = ErrorRecord.reconstitute({
        errorId: 'err_123',
        timestamp,
        errorType: ErrorType.NETWORK_ERROR,
        message: 'Connection timeout',
        stackTrace: 'Error: Connection timeout\n  at ...',
        retryCount: 2,
      });

      expect(errorRecord.errorId).toBe('err_123');
      expect(errorRecord.timestamp).toBe(timestamp);
      expect(errorRecord.errorType).toBe(ErrorType.NETWORK_ERROR);
      expect(errorRecord.message).toBe('Connection timeout');
      expect(errorRecord.retryCount).toBe(2);
    });

    it('should generate formatted log message', () => {
      const errorRecord = ErrorRecord.create({
        errorType: ErrorType.NETWORK_ERROR,
        message: 'Connection timeout',
        stackTrace: 'Error: Connection timeout\n  at ...',
      });

      const logMessage = errorRecord.toLogMessage();

      expect(logMessage).toContain('[NETWORK_ERROR]');
      expect(logMessage).toContain('Error ID:');
      expect(logMessage).toContain('Message: Connection timeout');
      expect(logMessage).toContain('Retry Count: 0');
      expect(logMessage).toContain('Timestamp:');
      expect(logMessage).toContain('Stack Trace:');
    });

    it('should generate log message without stack trace', () => {
      const errorRecord = ErrorRecord.create({
        errorType: ErrorType.VALIDATION_ERROR,
        message: 'Invalid data',
      });

      const logMessage = errorRecord.toLogMessage();

      expect(logMessage).toContain('[VALIDATION_ERROR]');
      expect(logMessage).toContain('Message: Invalid data');
      expect(logMessage).not.toContain('Stack Trace:');
    });

    it('should generate unique error IDs', () => {
      const error1 = ErrorRecord.create({
        errorType: ErrorType.NETWORK_ERROR,
        message: 'Error 1',
      });

      const error2 = ErrorRecord.create({
        errorType: ErrorType.NETWORK_ERROR,
        message: 'Error 2',
      });

      expect(error1.errorId).not.toBe(error2.errorId);
    });
  });
});
