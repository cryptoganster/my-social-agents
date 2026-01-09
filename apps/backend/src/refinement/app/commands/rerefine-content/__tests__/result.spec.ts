import {
  RerefineContentResult,
  RerefineContentCompletedResult,
  RerefineContentRejectedResult,
  RerefineContentFailedResult,
} from '../result';

describe('RerefineContentResult', () => {
  describe('completed result', () => {
    it('should create completed result with all properties', () => {
      const result: RerefineContentCompletedResult = {
        status: 'completed',
        refinementId: 'refinement-456',
        contentItemId: 'content-123',
        reason: 'Algorithm update',
        chunkCount: 5,
        durationMs: 1500,
        averageQualityScore: 0.85,
        previousRefinementId: 'refinement-123',
      };

      expect(result.status).toBe('completed');
      expect(result.refinementId).toBe('refinement-456');
      expect(result.contentItemId).toBe('content-123');
      expect(result.reason).toBe('Algorithm update');
      expect(result.chunkCount).toBe(5);
      expect(result.durationMs).toBe(1500);
      expect(result.averageQualityScore).toBe(0.85);
      expect(result.previousRefinementId).toBe('refinement-123');
    });

    it('should create completed result without previous refinement ID', () => {
      const result: RerefineContentCompletedResult = {
        status: 'completed',
        refinementId: 'refinement-456',
        contentItemId: 'content-123',
        reason: 'Manual reprocessing',
        chunkCount: 3,
        durationMs: 1000,
        averageQualityScore: 0.75,
      };

      expect(result.previousRefinementId).toBeUndefined();
    });

    it('should handle zero chunks', () => {
      const result: RerefineContentCompletedResult = {
        status: 'completed',
        refinementId: 'refinement-456',
        contentItemId: 'content-123',
        reason: 'Test',
        chunkCount: 0,
        durationMs: 100,
        averageQualityScore: 0,
      };

      expect(result.chunkCount).toBe(0);
      expect(result.averageQualityScore).toBe(0);
    });

    it('should handle high quality scores', () => {
      const result: RerefineContentCompletedResult = {
        status: 'completed',
        refinementId: 'refinement-456',
        contentItemId: 'content-123',
        reason: 'Test',
        chunkCount: 10,
        durationMs: 2000,
        averageQualityScore: 0.95,
      };

      expect(result.averageQualityScore).toBe(0.95);
    });
  });

  describe('rejected result', () => {
    it('should create rejected result with all properties', () => {
      const result: RerefineContentRejectedResult = {
        status: 'rejected',
        refinementId: 'refinement-456',
        contentItemId: 'content-123',
        reason: 'Quality check',
        rejectionReason: 'Content too short',
      };

      expect(result.status).toBe('rejected');
      expect(result.refinementId).toBe('refinement-456');
      expect(result.contentItemId).toBe('content-123');
      expect(result.reason).toBe('Quality check');
      expect(result.rejectionReason).toBe('Content too short');
    });

    it('should handle various rejection reasons', () => {
      const reasons = [
        'Content too short',
        'Too many chunks',
        'No valid chunks after quality filtering',
        'Content item not found',
      ];

      reasons.forEach((rejectionReason) => {
        const result: RerefineContentRejectedResult = {
          status: 'rejected',
          refinementId: 'refinement-456',
          contentItemId: 'content-123',
          reason: 'Test',
          rejectionReason,
        };

        expect(result.rejectionReason).toBe(rejectionReason);
      });
    });
  });

  describe('failed result', () => {
    it('should create failed result with all properties', () => {
      const result: RerefineContentFailedResult = {
        status: 'failed',
        refinementId: 'refinement-456',
        contentItemId: 'content-123',
        reason: 'Retry after failure',
        error: {
          code: 'REFINEMENT_ERROR',
          message: 'Chunking failed',
        },
      };

      expect(result.status).toBe('failed');
      expect(result.refinementId).toBe('refinement-456');
      expect(result.contentItemId).toBe('content-123');
      expect(result.reason).toBe('Retry after failure');
      expect(result.error.code).toBe('REFINEMENT_ERROR');
      expect(result.error.message).toBe('Chunking failed');
    });

    it('should handle various error codes', () => {
      const errorCodes = [
        'REFINEMENT_ERROR',
        'DATABASE_ERROR',
        'NETWORK_ERROR',
        'VALIDATION_ERROR',
      ];

      errorCodes.forEach((code) => {
        const result: RerefineContentFailedResult = {
          status: 'failed',
          refinementId: 'refinement-456',
          contentItemId: 'content-123',
          reason: 'Test',
          error: {
            code,
            message: 'Test error',
          },
        };

        expect(result.error.code).toBe(code);
      });
    });
  });

  describe('type discrimination', () => {
    it('should discriminate completed result by status', () => {
      const result: RerefineContentResult = {
        status: 'completed',
        refinementId: 'refinement-456',
        contentItemId: 'content-123',
        reason: 'Test',
        chunkCount: 5,
        durationMs: 1000,
        averageQualityScore: 0.8,
      };

      if (result.status === 'completed') {
        expect(result.chunkCount).toBe(5);
        expect(result.durationMs).toBe(1000);
        expect(result.averageQualityScore).toBe(0.8);
      }
    });

    it('should discriminate rejected result by status', () => {
      const result: RerefineContentResult = {
        status: 'rejected',
        refinementId: 'refinement-456',
        contentItemId: 'content-123',
        reason: 'Test',
        rejectionReason: 'Too short',
      };

      if (result.status === 'rejected') {
        expect(result.rejectionReason).toBe('Too short');
      }
    });

    it('should discriminate failed result by status', () => {
      const result: RerefineContentResult = {
        status: 'failed',
        refinementId: 'refinement-456',
        contentItemId: 'content-123',
        reason: 'Test',
        error: {
          code: 'ERROR',
          message: 'Failed',
        },
      };

      if (result.status === 'failed') {
        expect(result.error.code).toBe('ERROR');
        expect(result.error.message).toBe('Failed');
      }
    });
  });

  describe('result handling patterns', () => {
    it('should handle result with switch statement', () => {
      const results: RerefineContentResult[] = [
        {
          status: 'completed',
          refinementId: 'ref-1',
          contentItemId: 'content-1',
          reason: 'Test',
          chunkCount: 5,
          durationMs: 1000,
          averageQualityScore: 0.8,
        },
        {
          status: 'rejected',
          refinementId: 'ref-2',
          contentItemId: 'content-2',
          reason: 'Test',
          rejectionReason: 'Too short',
        },
        {
          status: 'failed',
          refinementId: 'ref-3',
          contentItemId: 'content-3',
          reason: 'Test',
          error: { code: 'ERROR', message: 'Failed' },
        },
      ];

      results.forEach((result) => {
        switch (result.status) {
          case 'completed':
            expect(result.chunkCount).toBeGreaterThanOrEqual(0);
            break;
          case 'rejected':
            expect(result.rejectionReason).toBeTruthy();
            break;
          case 'failed':
            expect(result.error).toBeTruthy();
            break;
        }
      });
    });
  });

  describe('common properties', () => {
    it('should have refinementId in all result types', () => {
      const completed: RerefineContentResult = {
        status: 'completed',
        refinementId: 'ref-1',
        contentItemId: 'content-1',
        reason: 'Test',
        chunkCount: 5,
        durationMs: 1000,
        averageQualityScore: 0.8,
      };

      const rejected: RerefineContentResult = {
        status: 'rejected',
        refinementId: 'ref-2',
        contentItemId: 'content-2',
        reason: 'Test',
        rejectionReason: 'Too short',
      };

      const failed: RerefineContentResult = {
        status: 'failed',
        refinementId: 'ref-3',
        contentItemId: 'content-3',
        reason: 'Test',
        error: { code: 'ERROR', message: 'Failed' },
      };

      expect(completed.refinementId).toBe('ref-1');
      expect(rejected.refinementId).toBe('ref-2');
      expect(failed.refinementId).toBe('ref-3');
    });

    it('should have contentItemId in all result types', () => {
      const completed: RerefineContentResult = {
        status: 'completed',
        refinementId: 'ref-1',
        contentItemId: 'content-1',
        reason: 'Test',
        chunkCount: 5,
        durationMs: 1000,
        averageQualityScore: 0.8,
      };

      const rejected: RerefineContentResult = {
        status: 'rejected',
        refinementId: 'ref-2',
        contentItemId: 'content-2',
        reason: 'Test',
        rejectionReason: 'Too short',
      };

      const failed: RerefineContentResult = {
        status: 'failed',
        refinementId: 'ref-3',
        contentItemId: 'content-3',
        reason: 'Test',
        error: { code: 'ERROR', message: 'Failed' },
      };

      expect(completed.contentItemId).toBe('content-1');
      expect(rejected.contentItemId).toBe('content-2');
      expect(failed.contentItemId).toBe('content-3');
    });

    it('should have reason in all result types', () => {
      const completed: RerefineContentResult = {
        status: 'completed',
        refinementId: 'ref-1',
        contentItemId: 'content-1',
        reason: 'Algorithm update',
        chunkCount: 5,
        durationMs: 1000,
        averageQualityScore: 0.8,
      };

      const rejected: RerefineContentResult = {
        status: 'rejected',
        refinementId: 'ref-2',
        contentItemId: 'content-2',
        reason: 'Quality check',
        rejectionReason: 'Too short',
      };

      const failed: RerefineContentResult = {
        status: 'failed',
        refinementId: 'ref-3',
        contentItemId: 'content-3',
        reason: 'Retry after failure',
        error: { code: 'ERROR', message: 'Failed' },
      };

      expect(completed.reason).toBe('Algorithm update');
      expect(rejected.reason).toBe('Quality check');
      expect(failed.reason).toBe('Retry after failure');
    });
  });
});
