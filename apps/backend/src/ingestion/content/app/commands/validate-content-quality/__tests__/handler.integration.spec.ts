import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { ValidateContentQualityHandler } from '../handler';
import { ValidateContentQualityCommand } from '../command';
import {
  ContentQualityValidated,
  ContentValidationFailed,
} from '@/ingestion/content/domain/events';
import { IContentValidationService } from '@/ingestion/content/domain/interfaces/services/content-validation';

/**
 * Integration Test: ValidateContentQualityHandler
 *
 * Tests the command handler that validates content quality
 * and publishes either ContentQualityValidated or ContentValidationFailed event.
 *
 * Pipeline Step 2 Handler: ValidateContentQualityCommand → ContentQualityValidated | ContentValidationFailed
 *
 * Requirements: 2.3, 3.1
 */
describe('ValidateContentQualityHandler - Integration Tests', () => {
  let handler: ValidateContentQualityHandler;
  let mockValidationService: jest.Mocked<IContentValidationService>;
  let mockEventBus: jest.Mocked<EventBus>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockValidationService = {
      validateQuality: jest.fn(),
      validateCompleteness: jest.fn(),
      validateFormat: jest.fn(),
    } as unknown as jest.Mocked<IContentValidationService>;

    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EventBus>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidateContentQualityHandler,
        {
          provide: 'IContentValidationService',
          useValue: mockValidationService,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    handler = module.get<ValidateContentQualityHandler>(
      ValidateContentQualityHandler,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Valid Content', () => {
    it('should publish ContentQualityValidated when content is valid', async () => {
      // Arrange
      const collectedAt = new Date('2024-01-15T08:00:00Z');
      const command = new ValidateContentQualityCommand(
        'job-123',
        'source-456',
        'Raw content about Bitcoin',
        'Normalized content about Bitcoin with sufficient length for validation',
        {
          title: 'Bitcoin News',
          author: 'John Doe',
          publishedAt: new Date('2024-01-15'),
          language: 'en',
          sourceUrl: 'https://example.com/btc',
        },
        ['BTC', 'ETH'],
        collectedAt,
      );

      mockValidationService.validateQuality.mockReturnValue({
        isValid: true,
        errors: [],
        qualityScore: 0.85,
      });

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.qualityScore).toBe(0.85);

      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const event = mockEventBus.publish.mock
        .calls[0][0] as ContentQualityValidated;
      expect(event).toBeInstanceOf(ContentQualityValidated);
      expect(event.jobId).toBe('job-123');
      expect(event.sourceId).toBe('source-456');
      expect(event.qualityScore).toBe(0.85);
    });

    it('should pass all data through to ContentQualityValidated event', async () => {
      // Arrange
      const collectedAt = new Date('2024-01-15T08:00:00Z');
      const publishedAt = new Date('2024-01-14T10:00:00Z');
      const command = new ValidateContentQualityCommand(
        'job-full',
        'source-full',
        'Raw content',
        'Normalized content with full metadata',
        {
          title: 'Full Metadata',
          author: 'Jane Smith',
          publishedAt,
          language: 'es',
          sourceUrl: 'https://example.com/full',
        },
        ['BTC', 'ETH', 'SOL'],
        collectedAt,
      );

      mockValidationService.validateQuality.mockReturnValue({
        isValid: true,
        errors: [],
        qualityScore: 0.92,
      });

      // Act
      await handler.execute(command);

      // Assert
      const event = mockEventBus.publish.mock
        .calls[0][0] as ContentQualityValidated;
      expect(event.rawContent).toBe('Raw content');
      expect(event.normalizedContent).toBe(
        'Normalized content with full metadata',
      );
      expect(event.metadata.title).toBe('Full Metadata');
      expect(event.metadata.author).toBe('Jane Smith');
      expect(event.assetTags).toEqual(['BTC', 'ETH', 'SOL']);
      expect(event.collectedAt).toBe(collectedAt);
    });

    it('should handle high quality content', async () => {
      // Arrange
      const command = new ValidateContentQualityCommand(
        'job-high',
        'source-high',
        'Raw high quality content',
        'Excellent normalized content with detailed analysis of Bitcoin market trends',
        { title: 'High Quality' },
        ['BTC'],
        new Date(),
      );

      mockValidationService.validateQuality.mockReturnValue({
        isValid: true,
        errors: [],
        qualityScore: 0.98,
      });

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.qualityScore).toBe(0.98);
      const event = mockEventBus.publish.mock
        .calls[0][0] as ContentQualityValidated;
      expect(event.qualityScore).toBe(0.98);
    });
  });

  describe('Invalid Content', () => {
    it('should publish ContentValidationFailed when content is invalid', async () => {
      // Arrange
      const command = new ValidateContentQualityCommand(
        'job-invalid',
        'source-invalid',
        'Short',
        'Too short',
        { title: 'Invalid' },
        [],
        new Date(),
      );

      mockValidationService.validateQuality.mockReturnValue({
        isValid: false,
        errors: ['Content too short', 'Missing crypto mentions'],
        qualityScore: 0.2,
      });

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual([
        'Content too short',
        'Missing crypto mentions',
      ]);
      expect(result.qualityScore).toBe(0.2);

      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const event = mockEventBus.publish.mock
        .calls[0][0] as ContentValidationFailed;
      expect(event).toBeInstanceOf(ContentValidationFailed);
      expect(event.jobId).toBe('job-invalid');
      expect(event.sourceId).toBe('source-invalid');
      expect(event.validationErrors).toEqual([
        'Content too short',
        'Missing crypto mentions',
      ]);
    });

    it('should truncate raw content in ContentValidationFailed event', async () => {
      // Arrange
      const longRawContent = 'A'.repeat(500); // 500 characters
      const command = new ValidateContentQualityCommand(
        'job-truncate',
        'source-truncate',
        longRawContent,
        'Normalized but invalid',
        { title: 'Truncate Test' },
        [],
        new Date(),
      );

      mockValidationService.validateQuality.mockReturnValue({
        isValid: false,
        errors: ['Invalid content'],
        qualityScore: 0.1,
      });

      // Act
      await handler.execute(command);

      // Assert
      const event = mockEventBus.publish.mock
        .calls[0][0] as ContentValidationFailed;
      expect(event.content.length).toBeLessThanOrEqual(200);
    });

    it('should handle single validation error', async () => {
      // Arrange
      const command = new ValidateContentQualityCommand(
        'job-single-error',
        'source-single-error',
        'Raw content',
        'Normalized content',
        { title: 'Single Error' },
        [],
        new Date(),
      );

      mockValidationService.validateQuality.mockReturnValue({
        isValid: false,
        errors: ['Content too short'],
        qualityScore: 0.3,
      });

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe('Content too short');
    });

    it('should handle multiple validation errors', async () => {
      // Arrange
      const command = new ValidateContentQualityCommand(
        'job-multi-error',
        'source-multi-error',
        'Bad content',
        'Bad normalized',
        { title: 'Multi Error' },
        [],
        new Date(),
      );

      mockValidationService.validateQuality.mockReturnValue({
        isValid: false,
        errors: [
          'Content too short',
          'Missing title',
          'No crypto mentions',
          'Low quality score',
          'Invalid language',
        ],
        qualityScore: 0.1,
      });

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.errors).toHaveLength(5);
    });
  });

  describe('Quality Score Handling', () => {
    it('should handle zero quality score', async () => {
      // Arrange
      const command = new ValidateContentQualityCommand(
        'job-zero',
        'source-zero',
        'Spam content',
        'Spam normalized',
        { title: 'Spam' },
        [],
        new Date(),
      );

      mockValidationService.validateQuality.mockReturnValue({
        isValid: false,
        errors: ['Spam detected'],
        qualityScore: 0,
      });

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.qualityScore).toBe(0);
    });

    it('should handle perfect quality score', async () => {
      // Arrange
      const command = new ValidateContentQualityCommand(
        'job-perfect',
        'source-perfect',
        'Perfect raw content',
        'Perfect normalized content with excellent analysis',
        { title: 'Perfect' },
        ['BTC'],
        new Date(),
      );

      mockValidationService.validateQuality.mockReturnValue({
        isValid: true,
        errors: [],
        qualityScore: 1.0,
      });

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.qualityScore).toBe(1.0);
    });

    it('should handle undefined quality score', async () => {
      // Arrange
      const command = new ValidateContentQualityCommand(
        'job-undefined',
        'source-undefined',
        'Content',
        'Normalized',
        { title: 'Undefined Score' },
        [],
        new Date(),
      );

      mockValidationService.validateQuality.mockReturnValue({
        isValid: true,
        errors: [],
        // qualityScore is undefined
      });

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.qualityScore).toBe(0); // Default to 0
    });
  });

  describe('Result Object', () => {
    it('should return ValidateContentQualityResult with all fields', async () => {
      // Arrange
      const command = new ValidateContentQualityCommand(
        'job-result',
        'source-result',
        'Raw content',
        'Normalized content',
        { title: 'Result Test' },
        ['BTC'],
        new Date(),
      );

      mockValidationService.validateQuality.mockReturnValue({
        isValid: true,
        errors: [],
        qualityScore: 0.88,
      });

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.qualityScore).toBe(0.88);
      expect(result.validatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Timestamp Preservation', () => {
    it('should preserve collectedAt in ContentQualityValidated event', async () => {
      // Arrange
      const originalCollectedAt = new Date('2024-01-15T08:00:00Z');
      const command = new ValidateContentQualityCommand(
        'job-ts',
        'source-ts',
        'Raw',
        'Normalized',
        { title: 'Timestamp' },
        [],
        originalCollectedAt,
      );

      mockValidationService.validateQuality.mockReturnValue({
        isValid: true,
        errors: [],
        qualityScore: 0.8,
      });

      // Act
      await handler.execute(command);

      // Assert
      const event = mockEventBus.publish.mock
        .calls[0][0] as ContentQualityValidated;
      expect(event.collectedAt).toEqual(originalCollectedAt);
    });
  });
});
