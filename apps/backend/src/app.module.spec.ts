import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AppModule } from './app.module';
import { IngestionContentModule } from './ingestion/content/ingestion-content.module';

// Mock IngestionContentModule with all required providers
@Module({
  imports: [CqrsModule],
  providers: [
    {
      provide: 'ISourceConfigurationFactory',
      useValue: {
        load: jest.fn().mockResolvedValue(null),
      },
    },
    {
      provide: 'IContentItemReadRepository',
      useValue: {
        findById: jest.fn(),
        findByHash: jest.fn(),
        findBySource: jest.fn(),
      },
    },
    {
      provide: 'IContentItemWriteRepository',
      useValue: {
        save: jest.fn(),
      },
    },
    {
      provide: 'SourceAdapter',
      useValue: [],
    },
    {
      provide: 'IHashService',
      useValue: {
        sha256: jest.fn().mockReturnValue('a'.repeat(64)),
      },
    },
  ],
  exports: [
    'ISourceConfigurationFactory',
    'IContentItemReadRepository',
    'IContentItemWriteRepository',
    'SourceAdapter',
    'IHashService',
  ],
})
class MockIngestionContentModule {}

describe('AppModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(IngestionContentModule)
      .useModule(MockIngestionContentModule)
      .compile();
  });

  afterEach(async () => {
    if (module !== null && module !== undefined) {
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
