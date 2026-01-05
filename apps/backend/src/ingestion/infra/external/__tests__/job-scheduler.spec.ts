import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerRegistry } from '@nestjs/schedule';
import { JobSchedulerService } from '../job-scheduler';

describe('JobSchedulerService', () => {
  let service: JobSchedulerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobSchedulerService,
        {
          provide: SchedulerRegistry,
          useValue: new SchedulerRegistry(),
        },
      ],
    }).compile();

    service = module.get<JobSchedulerService>(JobSchedulerService);
  });

  afterEach(() => {
    service.cancelAll();
  });

  describe('Unit Tests', () => {
    it('should schedule a job for future execution', async () => {
      const callback = jest.fn();
      const scheduledAt = new Date(Date.now() + 100);

      service.scheduleOnce('test-job', callback, scheduledAt);

      // Job should not execute immediately
      expect(callback).not.toHaveBeenCalled();

      // Wait for job to execute
      await new Promise<void>((resolve) => setTimeout(resolve, 150));

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should execute job immediately if scheduled in the past', async () => {
      const callback = jest.fn();
      const scheduledAt = new Date(Date.now() - 1000);

      service.scheduleOnce('test-job', callback, scheduledAt);

      // Wait a bit for execution
      await new Promise<void>((resolve) => setTimeout(resolve, 50));

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should throw error for duplicate job ID', () => {
      const callback = jest.fn();
      const scheduledAt = new Date(Date.now() + 1000);

      service.scheduleOnce('test-job', callback, scheduledAt);

      expect(() =>
        service.scheduleOnce('test-job', callback, scheduledAt),
      ).toThrow('Job with ID test-job is already scheduled');
    });

    it('should cancel a scheduled job', async () => {
      const callback = jest.fn();
      const scheduledAt = new Date(Date.now() + 100);

      service.scheduleOnce('test-job', callback, scheduledAt);
      service.cancel('test-job');

      // Wait past scheduled time
      await new Promise<void>((resolve) => setTimeout(resolve, 150));

      // Job should not have executed
      expect(callback).not.toHaveBeenCalled();
    });

    it('should schedule recurring job', async () => {
      const callback = jest.fn();

      service.scheduleRecurring('recurring-job', callback, 50);

      // Wait for multiple executions
      await new Promise<void>((resolve) => setTimeout(resolve, 180));

      // Should have executed multiple times
      expect(callback.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('should cancel recurring job', async () => {
      const callback = jest.fn();

      service.scheduleRecurring('recurring-job', callback, 50);

      // Wait for one execution
      await new Promise<void>((resolve) => setTimeout(resolve, 70));

      const callsBeforeCancel = callback.mock.calls.length;

      service.cancel('recurring-job');

      // Wait more time
      await new Promise<void>((resolve) => setTimeout(resolve, 100));

      // Should not have executed more times
      expect(callback.mock.calls.length).toBe(callsBeforeCancel);
    });

    it('should throw error for invalid interval', () => {
      const callback = jest.fn();

      expect(() => service.scheduleRecurring('test-job', callback, 0)).toThrow(
        'Interval must be positive',
      );

      expect(() =>
        service.scheduleRecurring('test-job', callback, -100),
      ).toThrow('Interval must be positive');
    });

    it('should cancel all jobs', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      service.scheduleOnce('job1', callback1, new Date(Date.now() + 100));
      service.scheduleRecurring('job2', callback2, 50);

      service.cancelAll();

      // Wait past scheduled times
      await new Promise<void>((resolve) => setTimeout(resolve, 200));

      // No jobs should have executed
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });
});
