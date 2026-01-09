import { RefineContentResult } from '@refinement/app/commands/refine-content/result';

describe('RefineContentResult', () => {
  describe('completed status', () => {
    it('should create result for successful refinement', () => {
      // Arrange & Act
      const result: RefineContentResult = {
        refinementId: 'refinement-123',
        contentItemId: 'content-123',
        status: 'completed',
        chunkCount: 5,
        durationMs: 2500,
        averageQualityScore: 0.85,
      };

      // Assert
      expect(result.refinementId).toBe('refinement-123');
      expect(result.contentItemId).toBe('content-123');
      expect(result.status).toBe('completed');
      expect(result.chunkCount).toBe(5);
      expect(result.durationMs).toBe(2500);
      expect(result.averageQualityScore).toBe(0.85);
      expect(result.error).toBeUndefined();
      expect(result.rejectionReason).toBeUndefined();
    });

    it('should include chunk count for completed refinement', () => {
      // Arrange & Act
      const result: RefineContentResult = {
        refinementId: 'refinement-123',
        contentItemId: 'content-123',
        status: 'completed',
        chunkCount: 10,
        durationMs: 3000,
        averageQualityScore: 0.75,
      };

      // Assert
      expect(result.chunkCount).toBeDefined();
      expect(result.chunkCount).toBeGreaterThan(0);
    });

    it('should include duration for completed refinement', () => {
      // Arrange & Act
      const result: RefineContentResult = {
        refinementId: 'refinement-123',
        contentItemId: 'content-123',
        status: 'completed',
        chunkCount: 3,
        durationMs: 1500,
        averageQualityScore: 0.9,
      };

      // Assert
      expect(result.durationMs).toBeDefined();
      expect(result.durationMs).toBeGreaterThan(0);
    });

    it('should include average quality score for completed refinement', () => {
      // Arrange & Act
      const result: RefineContentResult = {
        refinementId: 'refinement-123',
        contentItemId: 'content-123',
        status: 'completed',
        chunkCount: 7,
        durationMs: 2000,
        averageQualityScore: 0.65,
      };

      // Assert
      expect(result.averageQualityScore).toBeDefined();
      expect(result.averageQualityScore).toBeGreaterThanOrEqual(0);
      expect(result.averageQualityScore).toBeLessThanOrEqual(1);
    });

    it('should handle minimum chunk count (1)', () => {
      // Arrange & Act
      const result: RefineContentResult = {
        refinementId: 'refinement-123',
        contentItemId: 'content-123',
        status: 'completed',
        chunkCount: 1,
        durationMs: 1000,
        averageQualityScore: 0.8,
      };

      // Assert
      expect(result.chunkCount).toBe(1);
    });

    it('should handle maximum chunk count (100)', () => {
      // Arrange & Act
      const result: RefineContentResult = {
        refinementId: 'refinement-123',
        contentItemId: 'content-123',
        status: 'completed',
        chunkCount: 100,
        durationMs: 10000,
        averageQualityScore: 0.7,
      };

      // Assert
      expect(result.chunkCount).toBe(100);
    });

    it('should handle high quality score (0.95)', () => {
      // Arrange & Act
      const result: RefineContentResult = {
        refinementId: 'refinement-123',
        contentItemId: 'content-123',
        status: 'completed',
        chunkCount: 5,
        durationMs: 2000,
        averageQualityScore: 0.95,
      };

      // Assert
      expect(result.averageQualityScore).toBe(0.95);
    });

    it('should handle low quality score (0.3)', () => {
      // Arrange & Act
      const result: RefineContentResult = {
        refinementId: 'refinement-123',
        contentItemId: 'content-123',
        status: 'completed',
        chunkCount: 2,
        durationMs: 1500,
        averageQualityScore: 0.3,
      };

      // Assert
      expect(result.averageQualityScore).toBe(0.3);
    });

    it('should handle fast refinement (< 1 second)', () => {
      // Arrange & Act
      const result: RefineContentResult = {
        refinementId: 'refinement-123',
        contentItemId: 'content-123',
        status: 'completed',
        chunkCount: 2,
        durationMs: 500,
        averageQualityScore: 0.8,
      };

      // Assert
      expect(result.durationMs).toBeLessThan(1000);
    });

    it('should handle slow refinement (> 5 seconds)', () => {
      // Arrange & Act
      const result: RefineContentResult = {
        refinementId: 'refinement-123',
        contentItemId: 'content-123',
        status: 'completed',
        chunkCount: 50,
        durationMs: 8000,
        averageQualityScore: 0.75,
      };

      // Assert
      expect(result.durationMs).toBeGreaterThan(5000);
    });
  });

  describe('failed status', () => {
    it('should create result for failed refinement', () => {
      // Arrange & Act
      const result: RefineContentResult = {
        refinementId: 'refinement-123',
        contentItemId: 'content-123',
        status: 'failed',
        durationMs: 1000,
        error: {
          code: 'CHUNKING_ERROR',
          message: 'Failed to chunk content',
        },
      };

      // Assert
      expect(result.refinementId).toBe('refinement-123');
      expect(result.contentItemId).toBe('content-123');
      expect(result.status).toBe('failed');
      expect(result.durationMs).toBe(1000);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('CHUNKING_ERROR');
      expect(result.error?.message).toBe('Failed to chunk content');
      expect(result.chunkCount).toBeUndefined();
      expect(result.averageQualityScore).toBeUndefined();
      expect(result.rejectionReason).toBeUndefined();
    });

    it('should include error code and message', () => {
      // Arrange & Act
      const result: RefineContentResult = {
        refinementId: 'refinement-123',
        contentItemId: 'content-123',
        status: 'failed',
        error: {
          code: 'ENTITY_EXTRACTION_ERROR',
          message: 'LLM service unavailable',
        },
      };

      // Assert
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('ENTITY_EXTRACTION_ERROR');
      expect(result.error?.message).toBe('LLM service unavailable');
    });

    it('should handle various error codes', () => {
      // Arrange
      const errorCodes = [
        'CHUNKING_ERROR',
        'ENTITY_EXTRACTION_ERROR',
        'TEMPORAL_ANALYSIS_ERROR',
        'QUALITY_ANALYSIS_ERROR',
        'DATABASE_ERROR',
        'UNKNOWN_ERROR',
      ];

      // Act & Assert
      errorCodes.forEach((code) => {
        const result: RefineContentResult = {
          refinementId: 'refinement-123',
          contentItemId: 'content-123',
          status: 'failed',
          error: {
            code,
            message: `Error: ${code}`,
          },
        };

        expect(result.error?.code).toBe(code);
      });
    });

    it('should include duration even when failed', () => {
      // Arrange & Act
      const result: RefineContentResult = {
        refinementId: 'refinement-123',
        contentItemId: 'content-123',
        status: 'failed',
        durationMs: 2500,
        error: {
          code: 'PROCESSING_ERROR',
          message: 'Processing failed',
        },
      };

      // Assert
      expect(result.durationMs).toBeDefined();
      expect(result.durationMs).toBe(2500);
    });

    it('should not include chunk count when failed', () => {
      // Arrange & Act
      const result: RefineContentResult = {
        refinementId: 'refinement-123',
        contentItemId: 'content-123',
        status: 'failed',
        error: {
          code: 'ERROR',
          message: 'Failed',
        },
      };

      // Assert
      expect(result.chunkCount).toBeUndefined();
    });

    it('should not include quality score when failed', () => {
      // Arrange & Act
      const result: RefineContentResult = {
        refinementId: 'refinement-123',
        contentItemId: 'content-123',
        status: 'failed',
        error: {
          code: 'ERROR',
          message: 'Failed',
        },
      };

      // Assert
      expect(result.averageQualityScore).toBeUndefined();
    });
  });

  describe('rejected status', () => {
    it('should create result for rejected refinement', () => {
      // Arrange & Act
      const result: RefineContentResult = {
        refinementId: 'refinement-123',
        contentItemId: 'content-123',
        status: 'rejected',
        rejectionReason: 'Content too short',
      };

      // Assert
      expect(result.refinementId).toBe('refinement-123');
      expect(result.contentItemId).toBe('content-123');
      expect(result.status).toBe('rejected');
      expect(result.rejectionReason).toBe('Content too short');
      expect(result.chunkCount).toBeUndefined();
      expect(result.durationMs).toBeUndefined();
      expect(result.averageQualityScore).toBeUndefined();
      expect(result.error).toBeUndefined();
    });

    it('should include rejection reason', () => {
      // Arrange & Act
      const result: RefineContentResult = {
        refinementId: 'refinement-123',
        contentItemId: 'content-123',
        status: 'rejected',
        rejectionReason: 'Quality score below threshold',
      };

      // Assert
      expect(result.rejectionReason).toBeDefined();
      expect(result.rejectionReason).toBe('Quality score below threshold');
    });

    it('should handle various rejection reasons', () => {
      // Arrange
      const reasons = [
        'Content too short',
        'Quality score below threshold',
        'Too many chunks (> 100)',
        'Spam detected',
        'No crypto entities found',
        'High link ratio',
        'Word repetition detected',
      ];

      // Act & Assert
      reasons.forEach((reason) => {
        const result: RefineContentResult = {
          refinementId: 'refinement-123',
          contentItemId: 'content-123',
          status: 'rejected',
          rejectionReason: reason,
        };

        expect(result.rejectionReason).toBe(reason);
      });
    });

    it('should not include chunk count when rejected', () => {
      // Arrange & Act
      const result: RefineContentResult = {
        refinementId: 'refinement-123',
        contentItemId: 'content-123',
        status: 'rejected',
        rejectionReason: 'Rejected',
      };

      // Assert
      expect(result.chunkCount).toBeUndefined();
    });

    it('should not include quality score when rejected', () => {
      // Arrange & Act
      const result: RefineContentResult = {
        refinementId: 'refinement-123',
        contentItemId: 'content-123',
        status: 'rejected',
        rejectionReason: 'Rejected',
      };

      // Assert
      expect(result.averageQualityScore).toBeUndefined();
    });

    it('should not include error when rejected', () => {
      // Arrange & Act
      const result: RefineContentResult = {
        refinementId: 'refinement-123',
        contentItemId: 'content-123',
        status: 'rejected',
        rejectionReason: 'Rejected',
      };

      // Assert
      expect(result.error).toBeUndefined();
    });
  });

  describe('result structure', () => {
    it('should always include refinementId', () => {
      // Arrange & Act
      const results: RefineContentResult[] = [
        {
          refinementId: 'ref-1',
          contentItemId: 'content-1',
          status: 'completed',
          chunkCount: 5,
          durationMs: 2000,
          averageQualityScore: 0.8,
        },
        {
          refinementId: 'ref-2',
          contentItemId: 'content-2',
          status: 'failed',
          error: { code: 'ERROR', message: 'Failed' },
        },
        {
          refinementId: 'ref-3',
          contentItemId: 'content-3',
          status: 'rejected',
          rejectionReason: 'Rejected',
        },
      ];

      // Assert
      results.forEach((result) => {
        expect(result.refinementId).toBeDefined();
        expect(typeof result.refinementId).toBe('string');
      });
    });

    it('should always include contentItemId', () => {
      // Arrange & Act
      const results: RefineContentResult[] = [
        {
          refinementId: 'ref-1',
          contentItemId: 'content-1',
          status: 'completed',
          chunkCount: 5,
          durationMs: 2000,
          averageQualityScore: 0.8,
        },
        {
          refinementId: 'ref-2',
          contentItemId: 'content-2',
          status: 'failed',
          error: { code: 'ERROR', message: 'Failed' },
        },
        {
          refinementId: 'ref-3',
          contentItemId: 'content-3',
          status: 'rejected',
          rejectionReason: 'Rejected',
        },
      ];

      // Assert
      results.forEach((result) => {
        expect(result.contentItemId).toBeDefined();
        expect(typeof result.contentItemId).toBe('string');
      });
    });

    it('should always include status', () => {
      // Arrange & Act
      const results: RefineContentResult[] = [
        {
          refinementId: 'ref-1',
          contentItemId: 'content-1',
          status: 'completed',
          chunkCount: 5,
          durationMs: 2000,
          averageQualityScore: 0.8,
        },
        {
          refinementId: 'ref-2',
          contentItemId: 'content-2',
          status: 'failed',
          error: { code: 'ERROR', message: 'Failed' },
        },
        {
          refinementId: 'ref-3',
          contentItemId: 'content-3',
          status: 'rejected',
          rejectionReason: 'Rejected',
        },
      ];

      // Assert
      results.forEach((result) => {
        expect(result.status).toBeDefined();
        expect(['completed', 'failed', 'rejected']).toContain(result.status);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle zero duration', () => {
      // Arrange & Act
      const result: RefineContentResult = {
        refinementId: 'refinement-123',
        contentItemId: 'content-123',
        status: 'completed',
        chunkCount: 1,
        durationMs: 0,
        averageQualityScore: 0.8,
      };

      // Assert
      expect(result.durationMs).toBe(0);
    });

    it('should handle perfect quality score (1.0)', () => {
      // Arrange & Act
      const result: RefineContentResult = {
        refinementId: 'refinement-123',
        contentItemId: 'content-123',
        status: 'completed',
        chunkCount: 3,
        durationMs: 1500,
        averageQualityScore: 1.0,
      };

      // Assert
      expect(result.averageQualityScore).toBe(1.0);
    });

    it('should handle minimum quality score (0.0)', () => {
      // Arrange & Act
      const result: RefineContentResult = {
        refinementId: 'refinement-123',
        contentItemId: 'content-123',
        status: 'completed',
        chunkCount: 1,
        durationMs: 1000,
        averageQualityScore: 0.0,
      };

      // Assert
      expect(result.averageQualityScore).toBe(0.0);
    });

    it('should handle empty error message', () => {
      // Arrange & Act
      const result: RefineContentResult = {
        refinementId: 'refinement-123',
        contentItemId: 'content-123',
        status: 'failed',
        error: {
          code: 'UNKNOWN_ERROR',
          message: '',
        },
      };

      // Assert
      expect(result.error?.message).toBe('');
    });

    it('should handle empty rejection reason', () => {
      // Arrange & Act
      const result: RefineContentResult = {
        refinementId: 'refinement-123',
        contentItemId: 'content-123',
        status: 'rejected',
        rejectionReason: '',
      };

      // Assert
      expect(result.rejectionReason).toBe('');
    });

    it('should handle very long error messages', () => {
      // Arrange
      const longMessage = 'Error: ' + 'a'.repeat(1000);

      // Act
      const result: RefineContentResult = {
        refinementId: 'refinement-123',
        contentItemId: 'content-123',
        status: 'failed',
        error: {
          code: 'LONG_ERROR',
          message: longMessage,
        },
      };

      // Assert
      expect(result.error?.message).toBe(longMessage);
      expect(result.error?.message.length).toBeGreaterThan(1000);
    });

    it('should handle very long rejection reasons', () => {
      // Arrange
      const longReason = 'Rejected because: ' + 'a'.repeat(1000);

      // Act
      const result: RefineContentResult = {
        refinementId: 'refinement-123',
        contentItemId: 'content-123',
        status: 'rejected',
        rejectionReason: longReason,
      };

      // Assert
      expect(result.rejectionReason).toBe(longReason);
      expect(result.rejectionReason?.length).toBeGreaterThan(1000);
    });
  });
});
