import * as fc from 'fast-check';
import { IngestionStatus, IngestionStatusEnum } from '../ingestion-status';

describe('IngestionStatus', () => {
  describe('Property Tests', () => {
    // Feature: content-ingestion, Property 9: Job Status Transitions
    // Validates: Requirements 4.4
    it('should only allow valid state transitions', () => {
      const statusArbitrary = fc.constantFrom(
        ...Object.values(IngestionStatusEnum),
      );

      fc.assert(
        fc.property(statusArbitrary, statusArbitrary, (from, to) => {
          const fromStatus = IngestionStatus.fromEnum(from);
          const toStatus = IngestionStatus.fromEnum(to);

          const canTransition = fromStatus.canTransitionTo(toStatus);

          // Define valid transitions
          const validTransitions: Record<
            IngestionStatusEnum,
            IngestionStatusEnum[]
          > = {
            [IngestionStatusEnum.PENDING]: [
              IngestionStatusEnum.RUNNING,
              IngestionStatusEnum.FAILED,
            ],
            [IngestionStatusEnum.RUNNING]: [
              IngestionStatusEnum.COMPLETED,
              IngestionStatusEnum.FAILED,
              IngestionStatusEnum.RETRYING,
            ],
            [IngestionStatusEnum.COMPLETED]: [],
            [IngestionStatusEnum.FAILED]: [
              IngestionStatusEnum.RETRYING,
              IngestionStatusEnum.PENDING,
            ],
            [IngestionStatusEnum.RETRYING]: [
              IngestionStatusEnum.RUNNING,
              IngestionStatusEnum.FAILED,
            ],
          };

          const expectedValid = validTransitions[from].includes(to);
          expect(canTransition).toBe(expectedValid);
        }),
        { numRuns: 100 },
      );
    });

    it('should never allow transitions from terminal states', () => {
      const statusArbitrary = fc.constantFrom(
        ...Object.values(IngestionStatusEnum),
      );

      fc.assert(
        fc.property(statusArbitrary, (to) => {
          const completedStatus = IngestionStatus.completed();
          const toStatus = IngestionStatus.fromEnum(to);

          expect(completedStatus.canTransitionTo(toStatus)).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    it('should maintain transitivity for valid paths', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          // Test a valid path: PENDING -> RUNNING -> COMPLETED
          const pending = IngestionStatus.pending();
          const running = IngestionStatus.running();
          const completed = IngestionStatus.completed();

          expect(pending.canTransitionTo(running)).toBe(true);
          expect(running.canTransitionTo(completed)).toBe(true);
          expect(pending.canTransitionTo(completed)).toBe(false); // Not direct
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Unit Tests', () => {
    it('should create status from string', () => {
      const status = IngestionStatus.fromString('PENDING');
      expect(status.getValue()).toBe(IngestionStatusEnum.PENDING);
    });

    it('should create status from enum', () => {
      const status = IngestionStatus.fromEnum(IngestionStatusEnum.RUNNING);
      expect(status.getValue()).toBe(IngestionStatusEnum.RUNNING);
    });

    it('should throw error for invalid status string', () => {
      expect(() => IngestionStatus.fromString('INVALID')).toThrow(
        'Invalid ingestion status',
      );
    });

    it('should create status using factory methods', () => {
      expect(IngestionStatus.pending().getValue()).toBe(
        IngestionStatusEnum.PENDING,
      );
      expect(IngestionStatus.running().getValue()).toBe(
        IngestionStatusEnum.RUNNING,
      );
      expect(IngestionStatus.completed().getValue()).toBe(
        IngestionStatusEnum.COMPLETED,
      );
      expect(IngestionStatus.failed().getValue()).toBe(
        IngestionStatusEnum.FAILED,
      );
      expect(IngestionStatus.retrying().getValue()).toBe(
        IngestionStatusEnum.RETRYING,
      );
    });

    it('should validate PENDING transitions', () => {
      const pending = IngestionStatus.pending();

      expect(pending.canTransitionTo(IngestionStatus.running())).toBe(true);
      expect(pending.canTransitionTo(IngestionStatus.failed())).toBe(true);
      expect(pending.canTransitionTo(IngestionStatus.completed())).toBe(false);
      expect(pending.canTransitionTo(IngestionStatus.retrying())).toBe(false);
    });

    it('should validate RUNNING transitions', () => {
      const running = IngestionStatus.running();

      expect(running.canTransitionTo(IngestionStatus.completed())).toBe(true);
      expect(running.canTransitionTo(IngestionStatus.failed())).toBe(true);
      expect(running.canTransitionTo(IngestionStatus.retrying())).toBe(true);
      expect(running.canTransitionTo(IngestionStatus.pending())).toBe(false);
    });

    it('should validate COMPLETED is terminal', () => {
      const completed = IngestionStatus.completed();

      expect(completed.isTerminal()).toBe(true);
      expect(completed.canTransitionTo(IngestionStatus.pending())).toBe(false);
      expect(completed.canTransitionTo(IngestionStatus.running())).toBe(false);
      expect(completed.canTransitionTo(IngestionStatus.failed())).toBe(false);
      expect(completed.canTransitionTo(IngestionStatus.retrying())).toBe(false);
    });

    it('should validate FAILED transitions', () => {
      const failed = IngestionStatus.failed();

      expect(failed.isFailed()).toBe(true);
      expect(failed.canTransitionTo(IngestionStatus.retrying())).toBe(true);
      expect(failed.canTransitionTo(IngestionStatus.pending())).toBe(true);
      expect(failed.canTransitionTo(IngestionStatus.running())).toBe(false);
      expect(failed.canTransitionTo(IngestionStatus.completed())).toBe(false);
    });

    it('should validate RETRYING transitions', () => {
      const retrying = IngestionStatus.retrying();

      expect(retrying.canTransitionTo(IngestionStatus.running())).toBe(true);
      expect(retrying.canTransitionTo(IngestionStatus.failed())).toBe(true);
      expect(retrying.canTransitionTo(IngestionStatus.pending())).toBe(false);
      expect(retrying.canTransitionTo(IngestionStatus.completed())).toBe(false);
    });

    it('should check equality correctly', () => {
      const status1 = IngestionStatus.pending();
      const status2 = IngestionStatus.pending();
      const status3 = IngestionStatus.running();

      expect(status1.equals(status2)).toBe(true);
      expect(status1.equals(status3)).toBe(false);
    });

    it('should convert to string', () => {
      expect(IngestionStatus.pending().toString()).toBe('PENDING');
      expect(IngestionStatus.running().toString()).toBe('RUNNING');
    });
  });
});
