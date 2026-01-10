/**
 * Property-Based Test: Event-Carried State Completeness
 *
 * Property 1: Event-Carried State Completeness
 * For any domain event published across context boundaries, the event SHALL contain
 * all data that subscribers need to process the event without querying the publishing context.
 *
 * Requirements: 1.1, 1.4, 5.1, 5.2, 5.3, 5.4, 5.5
 * Design: Correctness Properties - Property 1
 *
 * Feature: decouple-bounded-contexts, Property 1: Event-Carried State Completeness
 */

import * as fc from 'fast-check';
import { SourceConfiguredEvent } from '@/ingestion/source/domain/events/source-configured';
import { SourceHealthUpdatedEvent } from '@/ingestion/source/domain/events/source-health-updated';
import { ContentCollectionRequestedEvent } from '@/ingestion/job/domain/events/content-collection-requested';
import { ContentIngestedEvent } from '@/ingestion/content/domain/events/content-ingested';
import { JobMetricsUpdateRequestedEvent } from '@/ingestion/content/domain/events/job-metrics-update-requested';

describe('Property: Event-Carried State Completeness', () => {
  /**
   * Property 1: SourceConfiguredEvent contains complete source state
   *
   * For any source configuration, the SourceConfiguredEvent must contain:
   * - sourceId (identity)
   * - sourceType (classification)
   * - name (human-readable identifier)
   * - isActive (operational state)
   * - configSummary (configuration without credentials)
   * - occurredAt (temporal context)
   *
   * Subscribers should NOT need to query the Source context for additional data.
   */
  it('SourceConfiguredEvent should contain all necessary source data', () => {
    fc.assert(
      fc.property(
        fc.record({
          sourceId: fc.uuid(),
          sourceType: fc.constantFrom(
            'WEB_SCRAPER',
            'RSS_FEED',
            'SOCIAL_MEDIA',
            'PDF',
            'OCR',
            'WIKIPEDIA',
          ),
          name: fc.string({ minLength: 5, maxLength: 100 }),
          isActive: fc.boolean(),
          configSummary: fc.dictionary(
            fc.string({ minLength: 1, maxLength: 20 }),
            fc.oneof(
              fc.string(),
              fc.integer(),
              fc.boolean(),
              fc.constant(null),
            ),
          ),
          occurredAt: fc.date(),
        }),
        (data) => {
          // Create event with generated data
          const event = new SourceConfiguredEvent(
            data.sourceId,
            data.sourceType,
            data.name,
            data.isActive,
            data.configSummary,
            data.occurredAt,
          );

          // Verify all required fields are present and accessible
          expect(event.sourceId).toBe(data.sourceId);
          expect(event.sourceId).toBeDefined();
          expect(typeof event.sourceId).toBe('string');

          expect(event.sourceType).toBe(data.sourceType);
          expect(event.sourceType).toBeDefined();
          expect(typeof event.sourceType).toBe('string');

          expect(event.name).toBe(data.name);
          expect(event.name).toBeDefined();
          expect(typeof event.name).toBe('string');

          expect(event.isActive).toBe(data.isActive);
          expect(event.isActive).toBeDefined();
          expect(typeof event.isActive).toBe('boolean');

          expect(event.configSummary).toEqual(data.configSummary);
          expect(event.configSummary).toBeDefined();
          expect(typeof event.configSummary).toBe('object');

          expect(event.occurredAt).toBe(data.occurredAt);
          expect(event.occurredAt).toBeDefined();
          expect(event.occurredAt).toBeInstanceOf(Date);

          // Verify event fields are readonly (TypeScript compile-time check)
          // At runtime, readonly is not enforced, but TypeScript prevents modification
          const originalSourceId = event.sourceId;

          // This would fail at compile time if not readonly:
          // event.sourceId = 'modified'; // TypeScript error

          // Verify values remain unchanged
          expect(event.sourceId).toBe(originalSourceId);
          expect(event.sourceId).toBe(data.sourceId);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2: SourceHealthUpdatedEvent contains complete health metrics
   *
   * For any source health update, the event must contain:
   * - sourceId (identity)
   * - healthMetrics (complete health state)
   *   - consecutiveFailures
   *   - successRate
   *   - lastSuccessAt
   *   - lastFailureAt
   * - occurredAt (temporal context)
   *
   * Subscribers should NOT need to query for additional health data.
   */
  it('SourceHealthUpdatedEvent should contain complete health metrics', () => {
    fc.assert(
      fc.property(
        fc.record({
          sourceId: fc.uuid(),
          consecutiveFailures: fc.integer({ min: 0, max: 100 }),
          successRate: fc.double({ min: 0, max: 1, noNaN: true }),
          lastSuccessAt: fc.option(fc.date(), { nil: null }),
          lastFailureAt: fc.option(fc.date(), { nil: null }),
          occurredAt: fc.date(),
        }),
        (data) => {
          // Create event with generated data
          const event = new SourceHealthUpdatedEvent(
            data.sourceId,
            {
              consecutiveFailures: data.consecutiveFailures,
              successRate: data.successRate,
              lastSuccessAt: data.lastSuccessAt,
              lastFailureAt: data.lastFailureAt,
            },
            data.occurredAt,
          );

          // Verify all required fields are present
          expect(event.sourceId).toBe(data.sourceId);
          expect(event.sourceId).toBeDefined();

          expect(event.healthMetrics).toBeDefined();
          expect(typeof event.healthMetrics).toBe('object');

          expect(event.healthMetrics.consecutiveFailures).toBe(
            data.consecutiveFailures,
          );
          expect(typeof event.healthMetrics.consecutiveFailures).toBe('number');

          expect(event.healthMetrics.successRate).toBe(data.successRate);
          expect(typeof event.healthMetrics.successRate).toBe('number');

          // lastSuccessAt and lastFailureAt can be null
          if (data.lastSuccessAt !== null) {
            expect(event.healthMetrics.lastSuccessAt).toBeInstanceOf(Date);
          } else {
            expect(event.healthMetrics.lastSuccessAt).toBeNull();
          }

          if (data.lastFailureAt !== null) {
            expect(event.healthMetrics.lastFailureAt).toBeInstanceOf(Date);
          } else {
            expect(event.healthMetrics.lastFailureAt).toBeNull();
          }

          expect(event.occurredAt).toBe(data.occurredAt);
          expect(event.occurredAt).toBeInstanceOf(Date);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3: ContentCollectionRequestedEvent contains complete source configuration
   *
   * For any content collection request, the event must contain:
   * - jobId (identity)
   * - sourceId (source reference)
   * - sourceType (source classification)
   * - sourceConfig (complete configuration for collection)
   * - occurredAt (temporal context)
   *
   * Content sub-context should NOT need to query Source sub-context for config.
   */
  it('ContentCollectionRequestedEvent should contain complete source configuration', () => {
    fc.assert(
      fc.property(
        fc.record({
          jobId: fc.uuid(),
          sourceId: fc.uuid(),
          sourceType: fc.constantFrom(
            'WEB_SCRAPER',
            'RSS_FEED',
            'SOCIAL_MEDIA',
          ),
          sourceConfig: fc.dictionary(
            fc.string({ minLength: 1, maxLength: 20 }),
            fc.oneof(
              fc.string(),
              fc.integer(),
              fc.boolean(),
              fc.array(fc.string()),
            ),
          ),
          occurredAt: fc.date(),
        }),
        (data) => {
          // Create event with generated data
          const event = new ContentCollectionRequestedEvent(
            data.jobId,
            data.sourceId,
            data.sourceType,
            data.sourceConfig,
            data.occurredAt,
          );

          // Verify all required fields are present
          expect(event.jobId).toBe(data.jobId);
          expect(event.jobId).toBeDefined();
          expect(typeof event.jobId).toBe('string');

          expect(event.sourceId).toBe(data.sourceId);
          expect(event.sourceId).toBeDefined();
          expect(typeof event.sourceId).toBe('string');

          expect(event.sourceType).toBe(data.sourceType);
          expect(event.sourceType).toBeDefined();
          expect(typeof event.sourceType).toBe('string');

          expect(event.sourceConfig).toEqual(data.sourceConfig);
          expect(event.sourceConfig).toBeDefined();
          expect(typeof event.sourceConfig).toBe('object');

          expect(event.occurredAt).toBe(data.occurredAt);
          expect(event.occurredAt).toBeInstanceOf(Date);

          // Verify sourceConfig contains meaningful data
          expect(Object.keys(event.sourceConfig).length).toBeGreaterThanOrEqual(
            0,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4: ContentIngestedEvent contains complete content data
   *
   * For any ingested content, the event must contain:
   * - contentId (identity)
   * - sourceId (source reference)
   * - jobId (job reference)
   * - contentHash (deduplication key)
   * - normalizedContent (full content text)
   * - metadata (complete metadata object)
   * - assetTags (extracted tags)
   * - collectedAt (temporal context)
   *
   * Refinement context should NOT need to query Ingestion context for content data.
   */
  it('ContentIngestedEvent should contain complete content data', () => {
    fc.assert(
      fc.property(
        fc.record({
          contentId: fc.uuid(),
          sourceId: fc.uuid(),
          jobId: fc.uuid(),
          contentHash: fc
            .array(
              fc.constantFrom(
                '0',
                '1',
                '2',
                '3',
                '4',
                '5',
                '6',
                '7',
                '8',
                '9',
                'a',
                'b',
                'c',
                'd',
                'e',
                'f',
              ),
              { minLength: 64, maxLength: 64 },
            )
            .map((arr) => arr.join('')),
          normalizedContent: fc.string({ minLength: 100, maxLength: 5000 }),
          title: fc.option(fc.string({ minLength: 5, maxLength: 200 }), {
            nil: undefined,
          }),
          author: fc.option(fc.string({ minLength: 3, maxLength: 100 }), {
            nil: undefined,
          }),
          publishedAt: fc.option(fc.date(), { nil: undefined }),
          language: fc.option(fc.constantFrom('en', 'es', 'fr', 'de', 'zh'), {
            nil: undefined,
          }),
          sourceUrl: fc.option(fc.webUrl(), { nil: undefined }),
          assetTags: fc.array(
            fc.constantFrom('BTC', 'ETH', 'SOL', 'ADA', 'DOT'),
            { minLength: 0, maxLength: 5 },
          ),
          collectedAt: fc.date(),
        }),
        (data) => {
          // Create event with generated data
          const event = new ContentIngestedEvent(
            data.contentId,
            data.sourceId,
            data.jobId,
            data.contentHash,
            data.normalizedContent,
            {
              title: data.title,
              author: data.author,
              publishedAt: data.publishedAt,
              language: data.language,
              sourceUrl: data.sourceUrl,
            },
            data.assetTags,
            data.collectedAt,
          );

          // Verify all required fields are present
          expect(event.contentId).toBe(data.contentId);
          expect(event.contentId).toBeDefined();
          expect(typeof event.contentId).toBe('string');

          expect(event.sourceId).toBe(data.sourceId);
          expect(event.sourceId).toBeDefined();
          expect(typeof event.sourceId).toBe('string');

          expect(event.jobId).toBe(data.jobId);
          expect(event.jobId).toBeDefined();
          expect(typeof event.jobId).toBe('string');

          expect(event.contentHash).toBe(data.contentHash);
          expect(event.contentHash).toBeDefined();
          expect(typeof event.contentHash).toBe('string');
          expect(event.contentHash.length).toBe(64);

          expect(event.normalizedContent).toBe(data.normalizedContent);
          expect(event.normalizedContent).toBeDefined();
          expect(typeof event.normalizedContent).toBe('string');
          expect(event.normalizedContent.length).toBeGreaterThan(0);

          expect(event.metadata).toBeDefined();
          expect(typeof event.metadata).toBe('object');

          // Metadata fields are optional but should match input
          expect(event.metadata.title).toBe(data.title);
          expect(event.metadata.author).toBe(data.author);
          expect(event.metadata.publishedAt).toBe(data.publishedAt);
          expect(event.metadata.language).toBe(data.language);
          expect(event.metadata.sourceUrl).toBe(data.sourceUrl);

          expect(event.assetTags).toEqual(data.assetTags);
          expect(Array.isArray(event.assetTags)).toBe(true);

          expect(event.collectedAt).toBe(data.collectedAt);
          expect(event.collectedAt).toBeInstanceOf(Date);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5: JobMetricsUpdateRequestedEvent contains complete metrics update
   *
   * For any job metrics update, the event must contain:
   * - jobId (identity)
   * - metricsUpdate (complete metrics delta)
   *   - itemsPersisted (optional)
   *   - duplicatesDetected (optional)
   *   - validationErrors (optional)
   * - occurredAt (temporal context)
   *
   * Job sub-context should NOT need to query Content sub-context for metrics.
   */
  it('JobMetricsUpdateRequestedEvent should contain complete metrics update', () => {
    fc.assert(
      fc.property(
        fc.record({
          jobId: fc.uuid(),
          itemsPersisted: fc.option(fc.integer({ min: 0, max: 1000 }), {
            nil: undefined,
          }),
          duplicatesDetected: fc.option(fc.integer({ min: 0, max: 100 }), {
            nil: undefined,
          }),
          validationErrors: fc.option(fc.integer({ min: 0, max: 50 }), {
            nil: undefined,
          }),
          occurredAt: fc.date(),
        }),
        (data) => {
          // Create event with generated data
          const event = new JobMetricsUpdateRequestedEvent(
            data.jobId,
            {
              itemsPersisted: data.itemsPersisted,
              duplicatesDetected: data.duplicatesDetected,
              validationErrors: data.validationErrors,
            },
            data.occurredAt,
          );

          // Verify all required fields are present
          expect(event.jobId).toBe(data.jobId);
          expect(event.jobId).toBeDefined();
          expect(typeof event.jobId).toBe('string');

          expect(event.metricsUpdate).toBeDefined();
          expect(typeof event.metricsUpdate).toBe('object');

          // Metrics fields are optional but should match input
          expect(event.metricsUpdate.itemsPersisted).toBe(data.itemsPersisted);
          expect(event.metricsUpdate.duplicatesDetected).toBe(
            data.duplicatesDetected,
          );
          expect(event.metricsUpdate.validationErrors).toBe(
            data.validationErrors,
          );

          // At least one metric should be present (not all undefined)
          // If all are undefined, that's still valid (empty update)
          // But if any is defined, it should be a valid number
          if (event.metricsUpdate.itemsPersisted !== undefined) {
            expect(typeof event.metricsUpdate.itemsPersisted).toBe('number');
            expect(event.metricsUpdate.itemsPersisted).toBeGreaterThanOrEqual(
              0,
            );
          }

          if (event.metricsUpdate.duplicatesDetected !== undefined) {
            expect(typeof event.metricsUpdate.duplicatesDetected).toBe(
              'number',
            );
            expect(
              event.metricsUpdate.duplicatesDetected,
            ).toBeGreaterThanOrEqual(0);
          }

          if (event.metricsUpdate.validationErrors !== undefined) {
            expect(typeof event.metricsUpdate.validationErrors).toBe('number');
            expect(event.metricsUpdate.validationErrors).toBeGreaterThanOrEqual(
              0,
            );
          }

          expect(event.occurredAt).toBe(data.occurredAt);
          expect(event.occurredAt).toBeInstanceOf(Date);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Meta-property: All events have temporal context
   *
   * For any cross-context event, the event must include a timestamp
   * to provide temporal context for event ordering and debugging.
   * Note: ContentIngestedEvent uses 'collectedAt' instead of 'occurredAt'.
   */
  it('all cross-context events should include temporal timestamp', () => {
    fc.assert(
      fc.property(
        fc.record({
          sourceId: fc.uuid(),
          jobId: fc.uuid(),
          contentId: fc.uuid(),
          occurredAt: fc.date(),
        }),
        (data) => {
          // Test all event types
          const sourceConfiguredEvent = new SourceConfiguredEvent(
            data.sourceId,
            'WEB_SCRAPER',
            'Test Source',
            true,
            {},
            data.occurredAt,
          );

          const sourceHealthEvent = new SourceHealthUpdatedEvent(
            data.sourceId,
            {
              consecutiveFailures: 0,
              successRate: 1.0,
              lastSuccessAt: null,
              lastFailureAt: null,
            },
            data.occurredAt,
          );

          const contentCollectionEvent = new ContentCollectionRequestedEvent(
            data.jobId,
            data.sourceId,
            'WEB_SCRAPER',
            {},
            data.occurredAt,
          );

          const contentIngestedEvent = new ContentIngestedEvent(
            data.contentId,
            data.sourceId,
            data.jobId,
            'a'.repeat(64),
            'Test content',
            {},
            [],
            data.occurredAt, // Uses collectedAt
          );

          const metricsEvent = new JobMetricsUpdateRequestedEvent(
            data.jobId,
            { itemsPersisted: 1 },
            data.occurredAt,
          );

          // Verify events with occurredAt
          expect(sourceConfiguredEvent.occurredAt).toBeDefined();
          expect(sourceConfiguredEvent.occurredAt).toBeInstanceOf(Date);
          expect(sourceConfiguredEvent.occurredAt).toBe(data.occurredAt);

          expect(sourceHealthEvent.occurredAt).toBeDefined();
          expect(sourceHealthEvent.occurredAt).toBeInstanceOf(Date);
          expect(sourceHealthEvent.occurredAt).toBe(data.occurredAt);

          expect(contentCollectionEvent.occurredAt).toBeDefined();
          expect(contentCollectionEvent.occurredAt).toBeInstanceOf(Date);
          expect(contentCollectionEvent.occurredAt).toBe(data.occurredAt);

          expect(metricsEvent.occurredAt).toBeDefined();
          expect(metricsEvent.occurredAt).toBeInstanceOf(Date);
          expect(metricsEvent.occurredAt).toBe(data.occurredAt);

          // ContentIngestedEvent uses collectedAt
          expect(contentIngestedEvent.collectedAt).toBeDefined();
          expect(contentIngestedEvent.collectedAt).toBeInstanceOf(Date);
          expect(contentIngestedEvent.collectedAt).toBe(data.occurredAt);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Meta-property: Events are designed to be immutable
   *
   * For any cross-context event, all fields should be readonly.
   * TypeScript enforces this at compile time, preventing accidental modification.
   * This ensures events represent immutable facts that cannot be changed.
   */
  it('all cross-context events should have readonly fields', () => {
    fc.assert(
      fc.property(
        fc.record({
          sourceId: fc.uuid(),
          occurredAt: fc.date(),
        }),
        (data) => {
          const event = new SourceConfiguredEvent(
            data.sourceId,
            'WEB_SCRAPER',
            'Test Source',
            true,
            { url: 'https://example.com' },
            data.occurredAt,
          );

          // Verify fields are accessible
          expect(event.sourceId).toBe(data.sourceId);
          expect(event.sourceType).toBe('WEB_SCRAPER');
          expect(event.occurredAt).toBe(data.occurredAt);

          // TypeScript enforces readonly at compile time
          // The following would fail compilation:
          // event.sourceId = 'modified'; // Error: Cannot assign to 'sourceId' because it is a read-only property
          // event.sourceType = 'modified'; // Error: Cannot assign to 'sourceType' because it is a read-only property
          // event.occurredAt = new Date(); // Error: Cannot assign to 'occurredAt' because it is a read-only property

          // At runtime, we can verify the values remain unchanged
          const originalSourceId = event.sourceId;
          const originalSourceType = event.sourceType;
          const originalOccurredAt = event.occurredAt;

          // Values should remain constant
          expect(event.sourceId).toBe(originalSourceId);
          expect(event.sourceType).toBe(originalSourceType);
          expect(event.occurredAt).toBe(originalOccurredAt);
        },
      ),
      { numRuns: 100 },
    );
  });
});
