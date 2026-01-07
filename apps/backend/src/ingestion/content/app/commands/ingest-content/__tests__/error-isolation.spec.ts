import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import * as fc from 'fast-check';
import { IngestContentCommandHandler } from '../handler';
import { IngestContentCommand } from '../command';
import {
  SourceAdapter,
  RawContent,
} from '@/ingestion/source/domain/interfaces/source-adapter';
import { SourceConfiguration } from '@/ingestion/source/domain/aggregates/source-configuration';
import {
  SourceType,
  SourceTypeEnum,
} from '@/ingestion/source/domain/value-objects/source-type';
import { ContentCollectedEvent } from '@/ingestion/content/domain/events';

/**
 * Property-Based Test: Error Isolation
 *
 * Feature: content-ingestion, Property 16: Error Isolation
 * Validates: Requirements 6.3
 *
 * Property: For any content collection error within a batch, the system should log the error
 * and continue collecting remaining items without failing the entire job.
 *
 * Note: With event-driven architecture, the command handler only collects and publishes events.
 * Processing errors are handled by event handlers, ensuring better isolation.
 */
describe('IngestContentCommandHandler - Error Isolation Property', () => {
  let handler: IngestContentCommandHandler;
  let mockSourceConfigFactory: jest.Mocked<{ load: jest.Mock }>;
  let mockEventBus: jest.Mocked<EventBus>;
  let mockAdapter: jest.Mocked<SourceAdapter>;

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.resetAllMocks();
    jest.clearAllMocks();

    // Create fresh mocks
    mockSourceConfigFactory = {
      load: jest.fn(),
    };

    mockEventBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    mockAdapter = {
      collect: jest.fn(),
      supports: jest.fn(),
      validateConfig: jest.fn(),
    } as jest.Mocked<SourceAdapter>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestContentCommandHandler,
        {
          provide: 'ISourceConfigurationFactory',
          useValue: mockSourceConfigFactory,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
        {
          provide: 'SourceAdapter',
          useValue: [mockAdapter],
        },
      ],
    }).compile();

    handler = module.get<IngestContentCommandHandler>(
      IngestContentCommandHandler,
    );

    // Inject adapters manually since we can't use array injection in testing
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    (handler as any).adapters = [mockAdapter];
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  /**
   * Property Test: Error isolation in event publishing
   *
   * For any batch of content items where some items cause event publishing errors,
   * the system should:
   * 1. Log the error for the failing item
   * 2. Continue publishing events for remaining items
   * 3. Not fail the entire batch
   * 4. Return results indicating which items were collected
   */
  it('should isolate errors and continue publishing events for remaining items', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a batch of content items (3-10 items)
        fc.array(
          fc.record({
            content: fc.string({ minLength: 20, maxLength: 200 }),
            shouldFail: fc.boolean(), // Randomly decide if this item should fail
          }),
          { minLength: 3, maxLength: 10 },
        ),
        async (contentBatch) => {
          // Reset mocks for this iteration
          mockEventBus.publish.mockClear();
          mockSourceConfigFactory.load.mockClear();
          mockAdapter.collect.mockClear();

          // Setup: Create source configuration
          const sourceConfig = SourceConfiguration.create({
            sourceId: 'test-source',
            sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
            name: 'Test Source',
            config: { url: 'https://example.com' },
            credentials: undefined,
            isActive: true,
          });

          mockSourceConfigFactory.load.mockResolvedValue(sourceConfig);
          mockAdapter.supports.mockReturnValue(true);

          // Setup: Prepare raw content items
          const rawContentItems: RawContent[] = contentBatch.map((item) => ({
            content: item.content,
            metadata: {
              title: 'Test Title',
              sourceUrl: 'https://example.com/test',
            },
          }));

          mockAdapter.collect.mockResolvedValue(rawContentItems);

          // Setup: Configure event bus to simulate failures for some items
          let callIndex = 0;
          mockEventBus.publish.mockImplementation(() => {
            const item = contentBatch[callIndex];
            callIndex++;

            if (item?.shouldFail) {
              throw new Error('Event publishing failed for this item');
            }

            return Promise.resolve();
          });

          // Execute
          const command = new IngestContentCommand('test-source');
          const result = await handler.execute(command);

          // Verify: Total items collected should match batch size
          expect(result.itemsCollected).toBe(contentBatch.length);

          // Verify: Number of errors should match items that should fail
          const expectedErrors = contentBatch.filter(
            (item) => item.shouldFail,
          ).length;
          expect(result.errors.length).toBe(expectedErrors);

          // Verify: Event bus was called for each item
          expect(mockEventBus.publish).toHaveBeenCalledTimes(
            contentBatch.length,
          );

          // Verify: Handler did not throw (batch processing continued)
          // If we reach this point, the test passed - no exception was thrown
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property Test: Event publishing completeness
   *
   * For any content item that is collected, a ContentCollectedEvent should be published.
   */
  it('should publish ContentCollectedEvent for each collected item', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 20, maxLength: 200 }), {
          minLength: 1,
          maxLength: 5,
        }),
        async (contentItems) => {
          // Reset mocks for this iteration
          mockEventBus.publish.mockClear();
          mockSourceConfigFactory.load.mockClear();
          mockAdapter.collect.mockClear();

          // Setup
          const sourceConfig = SourceConfiguration.create({
            sourceId: 'test-source',
            sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
            name: 'Test Source',
            config: { url: 'https://example.com' },
            credentials: undefined,
            isActive: true,
          });

          mockSourceConfigFactory.load.mockResolvedValue(sourceConfig);
          mockAdapter.supports.mockReturnValue(true);

          const rawContentItems: RawContent[] = contentItems.map((content) => ({
            content,
            metadata: {
              title: 'Test',
              sourceUrl: 'https://example.com',
            },
          }));

          mockAdapter.collect.mockResolvedValue(rawContentItems);
          mockEventBus.publish.mockResolvedValue(undefined);

          // Execute
          const command = new IngestContentCommand('test-source');
          const result = await handler.execute(command);

          // Verify: All items were collected
          expect(result.itemsCollected).toBe(contentItems.length);

          // Verify: Event was published for each item
          expect(mockEventBus.publish).toHaveBeenCalledTimes(
            contentItems.length,
          );

          // Verify: Each call was with ContentCollectedEvent
          for (let i = 0; i < contentItems.length; i++) {
            const call = mockEventBus.publish.mock.calls[i];
            const event = call?.[0] as ContentCollectedEvent;
            expect(event).toBeInstanceOf(ContentCollectedEvent);
            expect(event.sourceId).toBe('test-source');
            expect(event.rawContent).toBe(contentItems[i]);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property Test: Partial success handling
   *
   * For any batch where some items succeed and some fail event publishing,
   * the result should accurately reflect both successes and failures.
   */
  it('should accurately report partial success in batch collection', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }), // Number of successful items
        fc.integer({ min: 1, max: 10 }), // Number of failing items
        async (successCount, failCount) => {
          // Reset mocks for this iteration
          mockEventBus.publish.mockClear();
          mockSourceConfigFactory.load.mockClear();
          mockAdapter.collect.mockClear();

          // Setup
          const sourceConfig = SourceConfiguration.create({
            sourceId: 'test-source',
            sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
            name: 'Test Source',
            config: { url: 'https://example.com' },
            credentials: undefined,
            isActive: true,
          });

          mockSourceConfigFactory.load.mockResolvedValue(sourceConfig);
          mockAdapter.supports.mockReturnValue(true);

          // Create batch with known success/fail counts
          const totalItems = successCount + failCount;
          const rawContentItems: RawContent[] = Array.from(
            { length: totalItems },
            (_, i) => ({
              content: `Content item ${i}`,
              metadata: {
                title: `Title ${i}`,
                sourceUrl: 'https://example.com',
              },
            }),
          );

          mockAdapter.collect.mockResolvedValue(rawContentItems);

          // Configure event bus: first successCount items succeed, rest fail
          let callIndex = 0;
          mockEventBus.publish.mockImplementation((): Promise<void> => {
            const index = callIndex++;
            if (index >= successCount) {
              throw new Error('Event publishing failed');
            }
            return Promise.resolve();
          });

          // Execute
          const command = new IngestContentCommand('test-source');
          const result = await handler.execute(command);

          // Verify: Counts match expectations
          expect(result.itemsCollected).toBe(totalItems);
          expect(result.errors.length).toBe(failCount);

          // Verify: Event bus was called for all items
          expect(mockEventBus.publish).toHaveBeenCalledTimes(totalItems);
        },
      ),
      { numRuns: 100 },
    );
  });
});
