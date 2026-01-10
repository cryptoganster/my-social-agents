import {
  ReadModelUpdater,
  IdempotentReadModelUpdater,
} from '../read-model-updater';
import { ReadModel, IReadModelRepository } from '../read-model';
import { VersionedEvent } from '../event-versioning';

// Test event
interface TestEvent extends VersionedEvent {
  eventVersion: string;
  eventType: string;
  eventId: string;
  occurredAt: Date;
  aggregateId: string;
  data: string;
}

// Test read model
interface TestReadModel extends ReadModel {
  id: string;
  updatedAt: Date;
  version: number;
  data: string;
}

// Mock repository
class MockRepository implements IReadModelRepository<TestReadModel> {
  private models: Map<string, TestReadModel> = new Map();

  async findById(id: string): Promise<TestReadModel | null> {
    return this.models.get(id) || null;
  }

  async save(model: TestReadModel): Promise<void> {
    this.models.set(model.id, model);
  }

  async delete(id: string): Promise<void> {
    this.models.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    return this.models.has(id);
  }

  clear(): void {
    this.models.clear();
  }
}

// Test updater
class TestReadModelUpdater extends ReadModelUpdater<TestEvent, TestReadModel> {
  updateCalled = false;
  lastEvent: TestEvent | null = null;

  protected async updateReadModel(event: TestEvent): Promise<void> {
    this.updateCalled = true;
    this.lastEvent = event;

    const existing = await this.repository.findById(event.aggregateId);

    const readModel: TestReadModel = {
      id: event.aggregateId,
      data: event.data,
      updatedAt: event.occurredAt,
      version: existing ? existing.version + 1 : 1,
    };

    await this.repository.save(readModel);
  }
}

// Test idempotent updater
class TestIdempotentUpdater extends IdempotentReadModelUpdater<
  TestEvent,
  TestReadModel
> {
  updateCalled = false;
  lastEvent: TestEvent | null = null;

  protected async doUpdateReadModel(event: TestEvent): Promise<void> {
    this.updateCalled = true;
    this.lastEvent = event;

    const existing = await this.repository.findById(event.aggregateId);

    const readModel: TestReadModel = {
      id: event.aggregateId,
      data: event.data,
      updatedAt: event.occurredAt,
      version: existing ? existing.version + 1 : 1,
    };

    await this.repository.save(readModel);
  }
}

describe('ReadModelUpdater', () => {
  let repository: MockRepository;
  let updater: TestReadModelUpdater;

  beforeEach(() => {
    repository = new MockRepository();
    updater = new TestReadModelUpdater(repository, 'TestUpdater');
  });

  describe('handle', () => {
    it('should update read model when event is processed', async () => {
      const event: TestEvent = {
        eventVersion: '1.0',
        eventType: 'TestEvent',
        eventId: 'evt-1',
        occurredAt: new Date(),
        aggregateId: 'agg-1',
        data: 'test data',
      };

      await updater.handle(event);

      expect(updater.updateCalled).toBe(true);
      expect(updater.lastEvent).toBe(event);

      const readModel = await repository.findById('agg-1');
      expect(readModel).toBeDefined();
      expect(readModel!.data).toBe('test data');
      expect(readModel!.version).toBe(1);
    });

    it('should increment version on subsequent updates', async () => {
      const event1: TestEvent = {
        eventVersion: '1.0',
        eventType: 'TestEvent',
        eventId: 'evt-1',
        occurredAt: new Date(),
        aggregateId: 'agg-1',
        data: 'first',
      };

      const event2: TestEvent = {
        eventVersion: '1.0',
        eventType: 'TestEvent',
        eventId: 'evt-2',
        occurredAt: new Date(),
        aggregateId: 'agg-1',
        data: 'second',
      };

      await updater.handle(event1);
      await updater.handle(event2);

      const readModel = await repository.findById('agg-1');
      expect(readModel!.data).toBe('second');
      expect(readModel!.version).toBe(2);
    });

    it('should not throw error when update fails', async () => {
      // Create updater that throws error
      class FailingUpdater extends ReadModelUpdater<TestEvent, TestReadModel> {
        protected async updateReadModel(_event: TestEvent): Promise<void> {
          throw new Error('Update failed');
        }
      }

      const failingUpdater = new FailingUpdater(repository, 'FailingUpdater');

      const event: TestEvent = {
        eventVersion: '1.0',
        eventType: 'TestEvent',
        eventId: 'evt-1',
        occurredAt: new Date(),
        aggregateId: 'agg-1',
        data: 'test',
      };

      // Should not throw
      await expect(failingUpdater.handle(event)).resolves.not.toThrow();
    });
  });
});

describe('IdempotentReadModelUpdater', () => {
  let repository: MockRepository;
  let updater: TestIdempotentUpdater;

  beforeEach(() => {
    repository = new MockRepository();
    updater = new TestIdempotentUpdater(repository, 'TestIdempotentUpdater');
  });

  describe('handle', () => {
    it('should update read model on first event', async () => {
      const event: TestEvent = {
        eventVersion: '1.0',
        eventType: 'TestEvent',
        eventId: 'evt-1',
        occurredAt: new Date(),
        aggregateId: 'agg-1',
        data: 'test data',
      };

      await updater.handle(event);

      expect(updater.updateCalled).toBe(true);
      const readModel = await repository.findById('agg-1');
      expect(readModel!.data).toBe('test data');
    });

    it('should skip duplicate event with same ID', async () => {
      const event: TestEvent = {
        eventVersion: '1.0',
        eventType: 'TestEvent',
        eventId: 'evt-1',
        occurredAt: new Date(),
        aggregateId: 'agg-1',
        data: 'test data',
      };

      // Process first time
      await updater.handle(event);
      expect(updater.updateCalled).toBe(true);

      // Reset flag
      updater.updateCalled = false;

      // Process again with same event ID
      await updater.handle(event);
      expect(updater.updateCalled).toBe(false); // Should skip
    });

    it('should skip event if read model was updated after event occurred', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 1000);

      // Create read model with recent update
      await repository.save({
        id: 'agg-1',
        data: 'existing',
        updatedAt: now,
        version: 1,
      });

      // Try to process old event
      const oldEvent: TestEvent = {
        eventVersion: '1.0',
        eventType: 'TestEvent',
        eventId: 'evt-1',
        occurredAt: past,
        aggregateId: 'agg-1',
        data: 'old data',
      };

      await updater.handle(oldEvent);

      // Should skip because read model is newer
      expect(updater.updateCalled).toBe(false);

      const readModel = await repository.findById('agg-1');
      expect(readModel!.data).toBe('existing'); // Unchanged
    });

    it('should process event if read model is older', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 1000);

      // Create read model with old update
      await repository.save({
        id: 'agg-1',
        data: 'old',
        updatedAt: past,
        version: 1,
      });

      // Process new event
      const newEvent: TestEvent = {
        eventVersion: '1.0',
        eventType: 'TestEvent',
        eventId: 'evt-1',
        occurredAt: now,
        aggregateId: 'agg-1',
        data: 'new data',
      };

      await updater.handle(newEvent);

      expect(updater.updateCalled).toBe(true);

      const readModel = await repository.findById('agg-1');
      expect(readModel!.data).toBe('new data');
    });
  });
});
