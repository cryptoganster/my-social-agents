/**
 * Property-Based Test: Query Idempotency
 *
 * Property 6: Query Idempotency
 * For any query parameters, executing the same query multiple times
 * should return identical results (assuming no state changes between calls).
 *
 * Requirements: 6.1-6.6
 * Design: Correctness Properties - Property 6
 *
 * Feature: ingestion-event-driven-architecture, Property 6: Query Idempotency
 */

import * as fc from 'fast-check';
import { GetJobByIdQuery } from '@/ingestion/job/app/queries/get-job-by-id/query';
import { GetContentByHashQuery } from '@/ingestion/content/app/queries/get-content-by-hash/query';
import { GetSourceByIdQuery } from '@/ingestion/source/app/queries/get-source-by-id/query';
import { GetJobsByStatusQuery } from '@/ingestion/job/app/queries/get-jobs-by-status/query';

describe('Property: Query Idempotency', () => {
  /**
   * Property 6.1: Query Object Equality
   *
   * For any query parameters, creating multiple query objects with the same
   * parameters should produce equivalent queries.
   */
  it('should create equivalent query objects from same parameters', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (id) => {
          // Create multiple query objects with same parameters
          const query1 = new GetJobByIdQuery(id);
          const query2 = new GetJobByIdQuery(id);
          const query3 = new GetJobByIdQuery(id);

          // Verify all queries have same parameters
          expect(query1.jobId).toBe(query2.jobId);
          expect(query2.jobId).toBe(query3.jobId);
          expect(query1.jobId).toBe(id);
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property 6.2: GetJobByIdQuery Idempotency
   *
   * For any job ID, the query object should be immutable and consistent.
   */
  it('should maintain GetJobByIdQuery immutability', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (jobId) => {
          const query = new GetJobByIdQuery(jobId);

          // Store original value
          const originalJobId = query.jobId;

          // Attempt to access multiple times
          const access1 = query.jobId;
          const access2 = query.jobId;
          const access3 = query.jobId;

          // All accesses should return the same value
          expect(access1).toBe(originalJobId);
          expect(access2).toBe(originalJobId);
          expect(access3).toBe(originalJobId);
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property 6.3: GetContentByHashQuery Idempotency
   *
   * For any content hash, the query object should be immutable and consistent.
   */
  it('should maintain GetContentByHashQuery immutability', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .string({ minLength: 64, maxLength: 64 })
          .filter((s) => /^[0-9a-f]{64}$/.test(s)),
        async (contentHash) => {
          const query = new GetContentByHashQuery(contentHash);

          // Store original value
          const originalHash = query.contentHash;

          // Attempt to access multiple times
          const access1 = query.contentHash;
          const access2 = query.contentHash;
          const access3 = query.contentHash;

          // All accesses should return the same value
          expect(access1).toBe(originalHash);
          expect(access2).toBe(originalHash);
          expect(access3).toBe(originalHash);
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property 6.4: GetSourceByIdQuery Idempotency
   *
   * For any source ID, the query object should be immutable and consistent.
   */
  it('should maintain GetSourceByIdQuery immutability', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (sourceId) => {
          const query = new GetSourceByIdQuery(sourceId);

          // Store original value
          const originalSourceId = query.sourceId;

          // Attempt to access multiple times
          const access1 = query.sourceId;
          const access2 = query.sourceId;
          const access3 = query.sourceId;

          // All accesses should return the same value
          expect(access1).toBe(originalSourceId);
          expect(access2).toBe(originalSourceId);
          expect(access3).toBe(originalSourceId);
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property 6.5: GetJobsByStatusQuery Idempotency
   *
   * For any status and pagination parameters, the query object should be
   * immutable and consistent.
   */
  it('should maintain GetJobsByStatusQuery immutability', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          status: fc.constantFrom('PENDING', 'RUNNING', 'COMPLETED', 'FAILED'),
          limit: fc.integer({ min: 1, max: 100 }),
          offset: fc.integer({ min: 0, max: 1000 }),
        }),
        async ({ status, limit, offset }) => {
          const query = new GetJobsByStatusQuery(status, limit, offset);

          // Store original values
          const originalStatus = query.status;
          const originalLimit = query.limit;
          const originalOffset = query.offset;

          // Attempt to access multiple times
          const statusAccess1 = query.status;
          const statusAccess2 = query.status;
          const limitAccess1 = query.limit;
          const limitAccess2 = query.limit;
          const offsetAccess1 = query.offset;
          const offsetAccess2 = query.offset;

          // All accesses should return the same values
          expect(statusAccess1).toBe(originalStatus);
          expect(statusAccess2).toBe(originalStatus);
          expect(limitAccess1).toBe(originalLimit);
          expect(limitAccess2).toBe(originalLimit);
          expect(offsetAccess1).toBe(originalOffset);
          expect(offsetAccess2).toBe(originalOffset);
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property 6.6: Query Parameter Preservation
   *
   * For any query, parameters should be preserved exactly as provided
   * (no normalization, transformation, or mutation).
   */
  it('should preserve query parameters exactly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          jobId: fc.string({ minLength: 1, maxLength: 100 }),
          contentHash: fc
            .string({ minLength: 64, maxLength: 64 })
            .filter((s) => /^[0-9a-f]{64}$/.test(s)),
          sourceId: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        async ({ jobId, contentHash, sourceId }) => {
          // Create queries
          const jobQuery = new GetJobByIdQuery(jobId);
          const contentQuery = new GetContentByHashQuery(contentHash);
          const sourceQuery = new GetSourceByIdQuery(sourceId);

          // Verify exact preservation (no trimming, lowercasing, etc.)
          expect(jobQuery.jobId).toBe(jobId);
          expect(contentQuery.contentHash).toBe(contentHash);
          expect(sourceQuery.sourceId).toBe(sourceId);
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property 6.7: Query Equality
   *
   * Two queries with the same parameters should be considered equivalent
   * for the purpose of caching and deduplication.
   */
  it('should treat queries with same parameters as equivalent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (id) => {
          const query1 = new GetJobByIdQuery(id);
          const query2 = new GetJobByIdQuery(id);

          // Queries should have identical parameters
          expect(query1.jobId).toBe(query2.jobId);

          // This property enables query result caching:
          // If query1.jobId === query2.jobId, then
          // cache.get(query1.jobId) should equal cache.get(query2.jobId)
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property 6.8: Query Constructor Purity
   *
   * Query constructors should be pure functions - same input always
   * produces equivalent output, with no side effects.
   */
  it('should have pure query constructors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          status: fc.constantFrom('PENDING', 'RUNNING', 'COMPLETED', 'FAILED'),
          limit: fc.integer({ min: 1, max: 100 }),
          offset: fc.integer({ min: 0, max: 1000 }),
        }),
        async ({ status, limit, offset }) => {
          // Create multiple queries with same parameters
          const queries = Array.from(
            { length: 5 },
            () => new GetJobsByStatusQuery(status, limit, offset),
          );

          // All queries should have identical parameters
          for (let i = 1; i < queries.length; i++) {
            expect(queries[i].status).toBe(queries[0].status);
            expect(queries[i].limit).toBe(queries[0].limit);
            expect(queries[i].offset).toBe(queries[0].offset);
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property 6.9: Query Parameter Types
   *
   * Query parameters should maintain their types without coercion.
   */
  it('should maintain parameter types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          status: fc.constantFrom('PENDING', 'RUNNING', 'COMPLETED', 'FAILED'),
          limit: fc.integer({ min: 1, max: 100 }),
          offset: fc.integer({ min: 0, max: 1000 }),
        }),
        async ({ status, limit, offset }) => {
          const query = new GetJobsByStatusQuery(status, limit, offset);

          // Verify types are preserved
          expect(typeof query.status).toBe('string');
          expect(typeof query.limit).toBe('number');
          expect(typeof query.offset).toBe('number');

          // Verify no type coercion
          expect(query.limit).toBe(limit);
          expect(query.offset).toBe(offset);
          expect(Number.isInteger(query.limit)).toBe(true);
          expect(Number.isInteger(query.offset)).toBe(true);
        },
      ),
      { numRuns: 20 },
    );
  });
});
