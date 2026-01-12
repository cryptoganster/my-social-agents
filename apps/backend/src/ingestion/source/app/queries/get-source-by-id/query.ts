import { Query } from '@nestjs/cqrs';
import { GetSourceByIdResponse } from './response';

/**
 * GetSourceByIdQuery
 *
 * Query to retrieve a single source configuration by its ID.
 * Returns a response with health metrics for monitoring and validation.
 *
 * Extends Query<GetSourceByIdResponse | null> for automatic type inference.
 *
 * Requirements: 10.1, 10.2
 * Design: Queries - Source Queries
 */
export class GetSourceByIdQuery extends Query<GetSourceByIdResponse | null> {
  constructor(public readonly sourceId: string) {
    super();
  }
}

// Re-export Response for convenience
export { GetSourceByIdResponse } from './response';
