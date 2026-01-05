import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ScheduleModule } from '../schedule.module';
import { JobSchedulerService } from '../job-scheduler';

describe('ScheduleModule', () => {
  let module: TestingModule;
  let schedulerService: JobSchedulerService;
  let schedulerRegistry: SchedulerRegistry;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ScheduleModule],
    }).compile();

    schedulerService = module.get<JobSchedulerService>(JobSchedulerService);
    schedulerRegistry = module.get<SchedulerRegistry>(SchedulerRegistry);
  });

  afterEach(async () => {
    if (schedulerService !== null && schedulerService !== undefined) {
      schedulerService.cancelAll();
    }
    if (module !== null && module !== undefined) {
      await module.close();
    }
  });

  describe('Module Initialization', () => {
    it('should initialize the module successfully', () => {
      expect(module).toBeDefined();
    });

    it('should provide JobSchedulerService', () => {
      expect(schedulerService).toBeDefined();
      expect(schedulerService).toBeInstanceOf(JobSchedulerService);
    });

    it('should provide SchedulerRegistry', () => {
      expect(schedulerRegistry).toBeDefined();
      expect(schedulerRegistry).toBeInstanceOf(SchedulerRegistry);
    });
  });

  describe('Dependency Injection', () => {
    it('should inject JobSchedulerService into other services', async () => {
      // Create a test service that depends on JobSchedulerService
      class TestService {
        constructor(public readonly scheduler: JobSchedulerService) {}
      }

      const testModule = await Test.createTestingModule({
        imports: [ScheduleModule],
        providers: [
          {
            provide: TestService,
            useFactory: (scheduler: JobSchedulerService): TestService => {
              return new TestService(scheduler);
            },
            inject: [JobSchedulerService],
          },
        ],
      }).compile();

      const testService = testModule.get<TestService>(TestService);

      expect(testService).toBeDefined();
      expect(testService.scheduler).toBeDefined();
      expect(testService.scheduler).toBeInstanceOf(JobSchedulerService);

      await testModule.close();
    });

    it('should allow scheduling jobs through injected service', async () => {
      const callback = jest.fn();
      const scheduledAt = new Date(Date.now() + 100);

      schedulerService.scheduleOnce('integration-test', callback, scheduledAt);

      // Wait for execution
      await new Promise<void>((resolve) => setTimeout(resolve, 150));

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('SchedulerRegistry Integration', () => {
    it('should register jobs in SchedulerRegistry', () => {
      const callback = jest.fn();
      const scheduledAt = new Date(Date.now() + 1000);

      schedulerService.scheduleOnce('registry-test', callback, scheduledAt);

      // Verify job is registered in SchedulerRegistry
      expect(schedulerRegistry.doesExist('timeout', 'registry-test')).toBe(
        true,
      );
    });

    it('should remove jobs from SchedulerRegistry on cancel', () => {
      const callback = jest.fn();
      const scheduledAt = new Date(Date.now() + 1000);

      schedulerService.scheduleOnce('cancel-test', callback, scheduledAt);
      expect(schedulerRegistry.doesExist('timeout', 'cancel-test')).toBe(true);

      schedulerService.cancel('cancel-test');
      expect(schedulerRegistry.doesExist('timeout', 'cancel-test')).toBe(false);
    });
  });
});
