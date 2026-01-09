import { RefinementStatus } from '@refinement/domain/value-objects/refinement-status';

describe('RefinementStatus', () => {
  describe('factory methods', () => {
    it('should create pending status', () => {
      const status = RefinementStatus.pending();

      expect(status.value).toBe('pending');
      expect(status.isPending).toBe(true);
    });

    it('should create processing status', () => {
      const status = RefinementStatus.processing();

      expect(status.value).toBe('processing');
      expect(status.isProcessing).toBe(true);
    });

    it('should create completed status', () => {
      const status = RefinementStatus.completed();

      expect(status.value).toBe('completed');
      expect(status.isCompleted).toBe(true);
    });

    it('should create failed status', () => {
      const status = RefinementStatus.failed();

      expect(status.value).toBe('failed');
      expect(status.isFailed).toBe(true);
    });

    it('should create rejected status', () => {
      const status = RefinementStatus.rejected();

      expect(status.value).toBe('rejected');
      expect(status.isRejected).toBe(true);
    });
  });

  describe('query methods - isPending', () => {
    it('should return true for pending status', () => {
      const status = RefinementStatus.pending();
      expect(status.isPending).toBe(true);
    });

    it('should return false for non-pending status', () => {
      expect(RefinementStatus.processing().isPending).toBe(false);
      expect(RefinementStatus.completed().isPending).toBe(false);
      expect(RefinementStatus.failed().isPending).toBe(false);
      expect(RefinementStatus.rejected().isPending).toBe(false);
    });
  });

  describe('query methods - isProcessing', () => {
    it('should return true for processing status', () => {
      const status = RefinementStatus.processing();
      expect(status.isProcessing).toBe(true);
    });

    it('should return false for non-processing status', () => {
      expect(RefinementStatus.pending().isProcessing).toBe(false);
      expect(RefinementStatus.completed().isProcessing).toBe(false);
      expect(RefinementStatus.failed().isProcessing).toBe(false);
      expect(RefinementStatus.rejected().isProcessing).toBe(false);
    });
  });

  describe('query methods - isCompleted', () => {
    it('should return true for completed status', () => {
      const status = RefinementStatus.completed();
      expect(status.isCompleted).toBe(true);
    });

    it('should return false for non-completed status', () => {
      expect(RefinementStatus.pending().isCompleted).toBe(false);
      expect(RefinementStatus.processing().isCompleted).toBe(false);
      expect(RefinementStatus.failed().isCompleted).toBe(false);
      expect(RefinementStatus.rejected().isCompleted).toBe(false);
    });
  });

  describe('query methods - isFailed', () => {
    it('should return true for failed status', () => {
      const status = RefinementStatus.failed();
      expect(status.isFailed).toBe(true);
    });

    it('should return false for non-failed status', () => {
      expect(RefinementStatus.pending().isFailed).toBe(false);
      expect(RefinementStatus.processing().isFailed).toBe(false);
      expect(RefinementStatus.completed().isFailed).toBe(false);
      expect(RefinementStatus.rejected().isFailed).toBe(false);
    });
  });

  describe('query methods - isRejected', () => {
    it('should return true for rejected status', () => {
      const status = RefinementStatus.rejected();
      expect(status.isRejected).toBe(true);
    });

    it('should return false for non-rejected status', () => {
      expect(RefinementStatus.pending().isRejected).toBe(false);
      expect(RefinementStatus.processing().isRejected).toBe(false);
      expect(RefinementStatus.completed().isRejected).toBe(false);
      expect(RefinementStatus.failed().isRejected).toBe(false);
    });
  });

  describe('isTerminal', () => {
    it('should return true for completed status', () => {
      const status = RefinementStatus.completed();
      expect(status.isTerminal).toBe(true);
    });

    it('should return true for failed status', () => {
      const status = RefinementStatus.failed();
      expect(status.isTerminal).toBe(true);
    });

    it('should return true for rejected status', () => {
      const status = RefinementStatus.rejected();
      expect(status.isTerminal).toBe(true);
    });

    it('should return false for pending status', () => {
      const status = RefinementStatus.pending();
      expect(status.isTerminal).toBe(false);
    });

    it('should return false for processing status', () => {
      const status = RefinementStatus.processing();
      expect(status.isTerminal).toBe(false);
    });
  });

  describe('canStart', () => {
    it('should return true for pending status', () => {
      const status = RefinementStatus.pending();
      expect(status.canStart).toBe(true);
    });

    it('should return false for non-pending status', () => {
      expect(RefinementStatus.processing().canStart).toBe(false);
      expect(RefinementStatus.completed().canStart).toBe(false);
      expect(RefinementStatus.failed().canStart).toBe(false);
      expect(RefinementStatus.rejected().canStart).toBe(false);
    });
  });

  describe('canComplete', () => {
    it('should return true for processing status', () => {
      const status = RefinementStatus.processing();
      expect(status.canComplete).toBe(true);
    });

    it('should return false for non-processing status', () => {
      expect(RefinementStatus.pending().canComplete).toBe(false);
      expect(RefinementStatus.completed().canComplete).toBe(false);
      expect(RefinementStatus.failed().canComplete).toBe(false);
      expect(RefinementStatus.rejected().canComplete).toBe(false);
    });
  });

  describe('canFail', () => {
    it('should return true for processing status', () => {
      const status = RefinementStatus.processing();
      expect(status.canFail).toBe(true);
    });

    it('should return false for non-processing status', () => {
      expect(RefinementStatus.pending().canFail).toBe(false);
      expect(RefinementStatus.completed().canFail).toBe(false);
      expect(RefinementStatus.failed().canFail).toBe(false);
      expect(RefinementStatus.rejected().canFail).toBe(false);
    });
  });

  describe('canReject', () => {
    it('should return true for processing status', () => {
      const status = RefinementStatus.processing();
      expect(status.canReject).toBe(true);
    });

    it('should return false for non-processing status', () => {
      expect(RefinementStatus.pending().canReject).toBe(false);
      expect(RefinementStatus.completed().canReject).toBe(false);
      expect(RefinementStatus.failed().canReject).toBe(false);
      expect(RefinementStatus.rejected().canReject).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for same status values', () => {
      const status1 = RefinementStatus.pending();
      const status2 = RefinementStatus.pending();

      expect(status1.equals(status2)).toBe(true);
    });

    it('should return false for different status values', () => {
      const status1 = RefinementStatus.pending();
      const status2 = RefinementStatus.processing();

      expect(status1.equals(status2)).toBe(false);
    });

    it('should work for all status combinations', () => {
      const statuses = [
        RefinementStatus.pending(),
        RefinementStatus.processing(),
        RefinementStatus.completed(),
        RefinementStatus.failed(),
        RefinementStatus.rejected(),
      ];

      for (let i = 0; i < statuses.length; i++) {
        for (let j = 0; j < statuses.length; j++) {
          if (i === j) {
            expect(statuses[i].equals(statuses[j])).toBe(true);
          } else {
            expect(statuses[i].equals(statuses[j])).toBe(false);
          }
        }
      }
    });
  });

  describe('toString', () => {
    it('should return status value as string', () => {
      expect(RefinementStatus.pending().toString()).toBe('pending');
      expect(RefinementStatus.processing().toString()).toBe('processing');
      expect(RefinementStatus.completed().toString()).toBe('completed');
      expect(RefinementStatus.failed().toString()).toBe('failed');
      expect(RefinementStatus.rejected().toString()).toBe('rejected');
    });
  });

  describe('immutability', () => {
    it('should not allow modification of value', () => {
      const status = RefinementStatus.pending();

      expect(() => {
        // @ts-expect-error - Testing immutability
        status.value = 'completed';
      }).toThrow();
    });

    it('should create independent instances', () => {
      const status1 = RefinementStatus.pending();
      const status2 = RefinementStatus.completed();

      expect(status1.value).toBe('pending');
      expect(status2.value).toBe('completed');
    });
  });

  describe('state transition validation', () => {
    it('should identify valid pending → processing transition', () => {
      const pending = RefinementStatus.pending();
      expect(pending.canStart).toBe(true);
    });

    it('should identify valid processing → completed transition', () => {
      const processing = RefinementStatus.processing();
      expect(processing.canComplete).toBe(true);
    });

    it('should identify valid processing → failed transition', () => {
      const processing = RefinementStatus.processing();
      expect(processing.canFail).toBe(true);
    });

    it('should identify valid processing → rejected transition', () => {
      const processing = RefinementStatus.processing();
      expect(processing.canReject).toBe(true);
    });

    it('should prevent invalid transitions from terminal states', () => {
      const completed = RefinementStatus.completed();
      expect(completed.canStart).toBe(false);
      expect(completed.canComplete).toBe(false);
      expect(completed.canFail).toBe(false);
      expect(completed.canReject).toBe(false);

      const failed = RefinementStatus.failed();
      expect(failed.canStart).toBe(false);
      expect(failed.canComplete).toBe(false);
      expect(failed.canFail).toBe(false);
      expect(failed.canReject).toBe(false);

      const rejected = RefinementStatus.rejected();
      expect(rejected.canStart).toBe(false);
      expect(rejected.canComplete).toBe(false);
      expect(rejected.canFail).toBe(false);
      expect(rejected.canReject).toBe(false);
    });
  });
});
