import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AppModule } from './app.module';
import { IngestionContentModule } from './ingestion/content/ingestion-content.module';
import { IngestionJobModule } from './ingestion/job/ingestion-job.module';
import { IngestionSourceModule } from './ingestion/source/ingestion-source.module';
import { IngestionSharedModule } from './ingestion/shared/ingestion-shared.module';
import { IngestionApiModule } from './ingestion/api/ingestion-api.module';

// Mock IngestionSharedModule with all required providers
@Module({
  providers: [
    {
      provide: 'IRetryService',
      useValue: {
        execute: jest.fn().mockResolvedValue({ success: true, value: null }),
      },
    },
    {
      provide: 'ICircuitBreaker',
      useValue: {
        execute: jest.fn().mockResolvedValue(null),
      },
    },
    {
      provide: 'ICredentialEncryption',
      useValue: {
        encrypt: jest.fn().mockReturnValue('encrypted'),
        decrypt: jest.fn().mockReturnValue('decrypted'),
      },
    },
    {
      provide: 'IHashService',
      useValue: {
        sha256: jest.fn().mockReturnValue('a'.repeat(64)),
      },
    },
    {
      provide: 'IEventPublisher',
      useValue: {
        publish: jest.fn(),
        publishBatch: jest.fn(),
      },
    },
  ],
  exports: [
    'IRetryService',
    'ICircuitBreaker',
    'ICredentialEncryption',
    'IHashService',
    'IEventPublisher',
  ],
})
class MockIngestionSharedModule {}

// Mock IngestionSourceModule with all required providers
@Module({
  imports: [CqrsModule],
  providers: [
    {
      provide: 'ISourceConfigurationWriteRepository',
      useValue: {
        save: jest.fn(),
        delete: jest.fn(),
      },
    },
    {
      provide: 'ISourceConfigurationFactory',
      useValue: {
        load: jest.fn().mockResolvedValue(null),
      },
    },
    {
      provide: 'ISourceConfigurationReadRepository',
      useValue: {
        findById: jest.fn(),
        findActive: jest.fn(),
      },
    },
    {
      provide: 'SourceAdapter',
      useValue: [],
    },
  ],
  exports: [
    'ISourceConfigurationWriteRepository',
    'ISourceConfigurationFactory',
    'ISourceConfigurationReadRepository',
    'SourceAdapter',
  ],
})
class MockIngestionSourceModule {}

// Mock IngestionJobModule with all required providers
@Module({
  imports: [CqrsModule],
  providers: [
    {
      provide: 'IIngestionJobWriteRepository',
      useValue: {
        save: jest.fn(),
      },
    },
    {
      provide: 'IIngestionJobFactory',
      useValue: {
        load: jest.fn().mockResolvedValue(null),
      },
    },
    {
      provide: 'IIngestionJobReadRepository',
      useValue: {
        findById: jest.fn(),
        findByStatus: jest.fn(),
        findScheduledJobs: jest.fn(),
      },
    },
  ],
  exports: [
    'IIngestionJobWriteRepository',
    'IIngestionJobFactory',
    'IIngestionJobReadRepository',
  ],
})
class MockIngestionJobModule {}

// Mock IngestionContentModule with all required providers
@Module({
  imports: [CqrsModule],
  providers: [
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
  ],
  exports: ['IContentItemReadRepository', 'IContentItemWriteRepository'],
})
class MockIngestionContentModule {}

// Mock IngestionApiModule
@Module({
  imports: [CqrsModule],
  providers: [
    {
      provide: 'IIngestionJobReadRepository',
      useValue: {
        findById: jest.fn(),
        findByStatus: jest.fn(),
      },
    },
    {
      provide: 'ISourceConfigurationReadRepository',
      useValue: {
        findById: jest.fn(),
        findActive: jest.fn(),
      },
    },
  ],
})
class MockIngestionApiModule {}

describe('AppModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(IngestionSharedModule)
      .useModule(MockIngestionSharedModule)
      .overrideModule(IngestionSourceModule)
      .useModule(MockIngestionSourceModule)
      .overrideModule(IngestionJobModule)
      .useModule(MockIngestionJobModule)
      .overrideModule(IngestionContentModule)
      .useModule(MockIngestionContentModule)
      .overrideModule(IngestionApiModule)
      .useModule(MockIngestionApiModule)
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
