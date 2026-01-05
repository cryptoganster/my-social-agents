import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerRegistry } from '@nestjs/schedule';
import { AppModule } from './app.module';

describe('AppModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide SchedulerRegistry', () => {
    const schedulerRegistry = module.get<SchedulerRegistry>(SchedulerRegistry);
    expect(schedulerRegistry).toBeDefined();
    expect(schedulerRegistry).toBeInstanceOf(SchedulerRegistry);
  });

  it('should have SchedulerRegistry methods available', () => {
    const schedulerRegistry = module.get<SchedulerRegistry>(SchedulerRegistry);
    expect(typeof schedulerRegistry.addTimeout).toBe('function');
    expect(typeof schedulerRegistry.addInterval).toBe('function');
    expect(typeof schedulerRegistry.deleteTimeout).toBe('function');
    expect(typeof schedulerRegistry.deleteInterval).toBe('function');
    expect(typeof schedulerRegistry.doesExist).toBe('function');
  });
});
