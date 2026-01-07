import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppModule } from './app.module';
import { IngestionModule } from './ingestion/ingestion.module';

// Mock IngestionModule with all required providers from all sub-modules
@Module({
  imports: [CqrsModule],
  providers: [
    // Shared infrastructure
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
    // Source configuration
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
    // Ingestion jobs
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
    // Content items
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
      provide: 'IContentItemFactory',
      useValue: {
        load: jest.fn().mockResolvedValue(null),
      },
    },
  ],
  exports: [
    'IRetryService',
    'ICircuitBreaker',
    'ICredentialEncryption',
    'IHashService',
    'IEventPublisher',
    'ISourceConfigurationWriteRepository',
    'ISourceConfigurationFactory',
    'ISourceConfigurationReadRepository',
    'SourceAdapter',
    'IIngestionJobWriteRepository',
    'IIngestionJobFactory',
    'IIngestionJobReadRepository',
    'IContentItemReadRepository',
    'IContentItemWriteRepository',
    'IContentItemFactory',
  ],
})
class MockIngestionModule {}

// Mock TypeOrmModule
@Module({
  providers: [],
  exports: [],
})
class MockTypeOrmModule {}

describe('AppModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(TypeOrmModule)
      .useModule(MockTypeOrmModule)
      .overrideModule(IngestionModule)
      .useModule(MockIngestionModule)
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
