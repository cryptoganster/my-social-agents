import { SourceAdapter } from '@/ingestion/source/domain/interfaces/source-adapter';
import { SourceType } from '@/ingestion/source/domain/value-objects/source-type';

/**
 * AdapterRegistry Domain Service
 *
 * Centralized registry for source adapters.
 * Manages adapter registration and retrieval by source type.
 *
 * Requirements: 10.1, 10.2, 10.3
 * Design: Domain Services - AdapterRegistry
 */
export class AdapterRegistry {
  private readonly adapters: Map<string, SourceAdapter> = new Map();

  /**
   * Registers an adapter for a source type
   *
   * @param sourceType - The source type this adapter handles
   * @param adapter - The adapter implementation
   */
  register(sourceType: SourceType, adapter: SourceAdapter): void {
    const key = sourceType.toString();
    this.adapters.set(key, adapter);
  }

  /**
   * Retrieves an adapter for a given source type
   *
   * @param sourceType - The source type to get adapter for
   * @returns The registered adapter
   * @throws Error if no adapter is registered for the source type
   */
  getAdapter(sourceType: SourceType): SourceAdapter {
    const key = sourceType.toString();
    const adapter = this.adapters.get(key);

    if (!adapter) {
      throw new Error(
        `No adapter registered for source type: ${sourceType.toString()}`,
      );
    }

    return adapter;
  }

  /**
   * Checks if an adapter is registered for a source type
   *
   * @param sourceType - The source type to check
   * @returns True if an adapter is registered, false otherwise
   */
  hasAdapter(sourceType: SourceType): boolean {
    const key = sourceType.toString();
    return this.adapters.has(key);
  }

  /**
   * Returns all registered source types
   *
   * @returns Array of registered source type strings
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Clears all registered adapters (useful for testing)
   */
  clear(): void {
    this.adapters.clear();
  }
}
