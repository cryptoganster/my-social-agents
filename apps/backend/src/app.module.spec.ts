import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerRegistry } from '@nestjs/schedule';
import { AppModule } from './app.module';

describe('AppModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Override IngestionContentModule dependencies that are expected from parent
      .overrideProvider('SourceConfigurationFactory')
      .useValue({
        load: jest.fn().mockResolvedValue(null),
      })
      .overrideProvider('ContentItemReadRepository')
      .useValue({
        findById: jest.fn(),
        findByHash: jest.fn(),
        findBySource: jest.fn(),
      })
      .overrideProvider('ContentItemWriteRepository')
      .useValue({
        save: jest.fn(),
      })
      .overrideProvider('SourceAdapter')
      .useValue([])
      .overrideProvider('IHashService')
      .useValue({
        sha256: jest.fn().mockReturnValue('a'.repeat(64)),
      })
      .compile();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
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
