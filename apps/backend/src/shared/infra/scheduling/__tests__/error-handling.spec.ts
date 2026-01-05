import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerRegistry } from '@nestjs/schedule';
import { JobSchedulerService } from '../job-scheduler';
import { Logger } from '@nestjs/common';

describe('JobSchedulerService - Error Handling', () => {
  let service: JobSchedulerService;
  let loggerErrorSpy: jest.SpyInstance;

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

    // Spy on logger error method
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    service.cancelAll();
    loggerErrorSpy.mockRestore();
  });

  describe('Callback Error Handling', () => {
    it('should log errors when callback throws', async () => {
      const error = new Error('Test error');
      const callback = jest.fn().mockRejectedValue(error);
      const scheduledAt = new Date(Date.now() + 50);

      service.scheduleOnce('error-job', callback, scheduledAt);

      // Wait for execution
      await new Promise<void>((resolve) => setTimeout(resolve, 100));

      expect(callback).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Job error-job failed'),
        expect.any(String),
      );
    });

    it('should not crash application when callback throws', async () => {
      const callback = jest.fn().mockRejectedValue(new Error('Test error'));
      const scheduledAt = new Date(Date.now() + 50);

      // This should not throw
      expect(() => {
        service.scheduleOnce('error-job', callback, scheduledAt);
      }).not.toThrow();

      // Wait for execution
      await new Promise<void>((resolve) => setTimeout(resolve, 100));

      // Service should still be functional
      expect(service.isScheduled('error-job')).toBe(false);
    });

    it('should continue executing other jobs after one fails', async () => {
      const errorCallback = jest
        .fn()
        .mockRejectedValue(new Error('Test error'));
      const successCallback = jest.fn().mockResolvedValue(undefined);

      service.scheduleOnce(
        'error-job',
        errorCallback,
        new Date(Date.now() + 50),
      );
      service.scheduleOnce(
        'success-job',
        successCallback,
        new Date(Date.now() + 100),
      );

      // Wait for both executions
      await new Promise<void>((resolve) => setTimeout(resolve, 150));

      expect(errorCallback).toHaveBeenCalledTimes(1);
      expect(successCallback).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle errors in recurring jobs without stopping them', async () => {
      let callCount = 0;
      const callback = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First execution error');
        }
        // Second execution succeeds
      });

      service.scheduleRecurring('recurring-error-job', callback, 50);

      // Wait for multiple executions
      await new Promise<void>((resolve) => setTimeout(resolve, 150));

      // Should have executed multiple times despite first error
      expect(callback.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle synchronous errors in callbacks', async () => {
      const callback = jest.fn().mockImplementation(() => {
        throw new Error('Synchronous error');
      });
      const scheduledAt = new Date(Date.now() + 50);

      service.scheduleOnce('sync-error-job', callback, scheduledAt);

      // Wait for execution
      await new Promise<void>((resolve) => setTimeout(resolve, 100));

      expect(callback).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Job sync-error-job failed'),
        expect.any(String),
      );
    });
  });

  describe('Invalid Parameter Errors', () => {
    it('should throw error for duplicate job ID', () => {
      const callback = jest.fn();
      const scheduledAt = new Date(Date.now() + 1000);

      service.scheduleOnce('duplicate-job', callback, scheduledAt);

      expect(() =>
        service.scheduleOnce('duplicate-job', callback, scheduledAt),
      ).toThrow('Job with ID duplicate-job is already scheduled');
    });

    it('should throw error for zero interval', () => {
      const callback = jest.fn();

      expect(() =>
        service.scheduleRecurring('zero-interval', callback, 0),
      ).toThrow('Interval must be positive');
    });

    it('should throw error for negative interval', () => {
      const callback = jest.fn();

      expect(() =>
        service.scheduleRecurring('negative-interval', callback, -100),
      ).toThrow('Interval must be positive');
    });

    it('should not allow scheduling recurring job with same ID as one-time job', () => {
      const callback = jest.fn();
      const scheduledAt = new Date(Date.now() + 1000);

      service.scheduleOnce('conflict-job', callback, scheduledAt);

      expect(() =>
        service.scheduleRecurring('conflict-job', callback, 100),
      ).toThrow('Job with ID conflict-job is already scheduled');
    });

    it('should not allow scheduling one-time job with same ID as recurring job', () => {
      const callback = jest.fn();

      service.scheduleRecurring('recurring-conflict', callback, 100);

      expect(() =>
        service.scheduleOnce(
          'recurring-conflict',
          callback,
          new Date(Date.now() + 1000),
        ),
      ).toThrow('Job with ID recurring-conflict is already scheduled');
    });
  });

  describe('Cleanup After Errors', () => {
    it('should cleanup one-time job after error', async () => {
      const callback = jest.fn().mockRejectedValue(new Error('Test error'));
      const scheduledAt = new Date(Date.now() + 50);

      service.scheduleOnce('cleanup-job', callback, scheduledAt);

      expect(service.isScheduled('cleanup-job')).toBe(true);

      // Wait for execution
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 100);
      });

      // Job should be cleaned up even after error
      expect(service.isScheduled('cleanup-job')).toBe(false);
    });

    it('should allow rescheduling after error and cleanup', async () => {
      const errorCallback = jest
        .fn()
        .mockRejectedValue(new Error('Test error'));
      const successCallback = jest.fn().mockResolvedValue(undefined);
      const scheduledAt = new Date(Date.now() + 50);

      service.scheduleOnce('reschedule-job', errorCallback, scheduledAt);

      // Wait for execution and cleanup
      await new Promise<void>((resolve) => setTimeout(resolve, 100));

      // Should be able to schedule again with same ID
      expect(() =>
        service.scheduleOnce(
          'reschedule-job',
          successCallback,
          new Date(Date.now() + 50),
        ),
      ).not.toThrow();

      // Wait for second execution
      await new Promise<void>((resolve) => setTimeout(resolve, 100));

      expect(successCallback).toHaveBeenCalledTimes(1);
    });
  });
});
