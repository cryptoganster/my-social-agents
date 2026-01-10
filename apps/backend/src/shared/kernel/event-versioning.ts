/**
 * Event Versioning Utilities
 *
 * Provides utilities for versioning domain events to support
 * backward compatibility and event schema evolution.
 *
 * Key Principles:
 * - Events are immutable facts
 * - Old event versions must be supported
 * - New versions can add fields but not remove them
 * - Event handlers must handle multiple versions
 */

/**
 * VersionedEvent Interface
 *
 * Base interface for versioned domain events.
 * All events should include a version field for schema evolution.
 */
export interface VersionedEvent {
  /**
   * Event schema version (e.g., "1.0", "2.0")
   * Format: "major.minor"
   * - Major version: Breaking changes
   * - Minor version: Backward-compatible additions
   */
  eventVersion: string;

  /**
   * Event type identifier (e.g., "ContentIngested", "JobCompleted")
   */
  eventType: string;

  /**
   * Unique event identifier
   */
  eventId: string;

  /**
   * When the event occurred
   */
  occurredAt: Date;

  /**
   * ID of the aggregate that produced the event
   */
  aggregateId: string;
}

/**
 * EventVersion Value Object
 *
 * Represents an event schema version with major and minor components.
 * Provides comparison and validation logic.
 */
export class EventVersion {
  private constructor(
    private readonly major: number,
    private readonly minor: number,
  ) {
    this.validate();
  }

  private validate(): void {
    if (!Number.isInteger(this.major) || this.major < 0) {
      throw new Error('Major version must be a non-negative integer');
    }
    if (!Number.isInteger(this.minor) || this.minor < 0) {
      throw new Error('Minor version must be a non-negative integer');
    }
  }

  /**
   * Parse version string (e.g., "1.0", "2.3")
   */
  static parse(version: string): EventVersion {
    const parts = version.split('.');
    if (parts.length !== 2) {
      throw new Error(
        'Invalid version format. Expected "major.minor" (e.g., "1.0")',
      );
    }

    const major = parseInt(parts[0], 10);
    const minor = parseInt(parts[1], 10);

    if (isNaN(major) || isNaN(minor)) {
      throw new Error('Version components must be numbers');
    }

    return new EventVersion(major, minor);
  }

  /**
   * Create initial version (1.0)
   */
  static initial(): EventVersion {
    return new EventVersion(1, 0);
  }

  /**
   * Create version from major and minor numbers
   */
  static create(major: number, minor: number): EventVersion {
    return new EventVersion(major, minor);
  }

  /**
   * Increment major version (breaking change)
   * Resets minor version to 0
   */
  incrementMajor(): EventVersion {
    return new EventVersion(this.major + 1, 0);
  }

  /**
   * Increment minor version (backward-compatible change)
   */
  incrementMinor(): EventVersion {
    return new EventVersion(this.major, this.minor + 1);
  }

  /**
   * Check if this version is compatible with another version
   * Compatible if major versions match
   */
  isCompatibleWith(other: EventVersion): boolean {
    return this.major === other.major;
  }

  /**
   * Check if this version is newer than another version
   */
  isNewerThan(other: EventVersion): boolean {
    if (this.major > other.major) return true;
    if (this.major < other.major) return false;
    return this.minor > other.minor;
  }

  /**
   * Check if this version is older than another version
   */
  isOlderThan(other: EventVersion): boolean {
    if (this.major < other.major) return true;
    if (this.major > other.major) return false;
    return this.minor < other.minor;
  }

  /**
   * Check if versions are equal
   */
  equals(other: EventVersion): boolean {
    return this.major === other.major && this.minor === other.minor;
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return `${this.major}.${this.minor}`;
  }

  /**
   * Get major version number
   */
  getMajor(): number {
    return this.major;
  }

  /**
   * Get minor version number
   */
  getMinor(): number {
    return this.minor;
  }
}

/**
 * EventVersionRegistry
 *
 * Registry for tracking supported event versions and their handlers.
 * Enables graceful handling of multiple event versions.
 */
export class EventVersionRegistry {
  private supportedVersions: Map<string, Set<string>> = new Map();

  /**
   * Register a supported event version
   *
   * @param eventType - The event type (e.g., "ContentIngested")
   * @param version - The version string (e.g., "1.0")
   */
  registerVersion(eventType: string, version: string): void {
    EventVersion.parse(version); // Validate version format

    if (!this.supportedVersions.has(eventType)) {
      this.supportedVersions.set(eventType, new Set());
    }

    this.supportedVersions.get(eventType)!.add(version);
  }

  /**
   * Check if an event version is supported
   */
  isVersionSupported(eventType: string, version: string): boolean {
    const versions = this.supportedVersions.get(eventType);
    return versions ? versions.has(version) : false;
  }

  /**
   * Get all supported versions for an event type
   */
  getSupportedVersions(eventType: string): string[] {
    const versions = this.supportedVersions.get(eventType);
    return versions ? Array.from(versions).sort() : [];
  }

  /**
   * Get the latest supported version for an event type
   */
  getLatestVersion(eventType: string): string | null {
    const versions = this.getSupportedVersions(eventType);
    if (versions.length === 0) return null;

    return versions.reduce((latest, current) => {
      const latestVersion = EventVersion.parse(latest);
      const currentVersion = EventVersion.parse(current);
      return currentVersion.isNewerThan(latestVersion) ? current : latest;
    });
  }

  /**
   * Clear all registered versions (for testing)
   */
  clear(): void {
    this.supportedVersions.clear();
  }
}

/**
 * EventUpgrader Interface
 *
 * Interface for upgrading events from old versions to new versions.
 * Implementations handle the transformation logic.
 */
export interface IEventUpgrader<TOld, TNew> {
  /**
   * The source version this upgrader handles
   */
  fromVersion: string;

  /**
   * The target version this upgrader produces
   */
  toVersion: string;

  /**
   * Upgrade an event from old version to new version
   */
  upgrade(oldEvent: TOld): TNew;
}

/**
 * EventUpgraderChain
 *
 * Chains multiple event upgraders to upgrade events across multiple versions.
 * Example: v1.0 → v1.1 → v2.0
 */
export class EventUpgraderChain<T> {
  private upgraders: IEventUpgrader<any, any>[] = [];

  /**
   * Add an upgrader to the chain
   */
  addUpgrader(upgrader: IEventUpgrader<any, any>): void {
    this.upgraders.push(upgrader);
  }

  /**
   * Upgrade an event through the chain
   *
   * @param event - The event to upgrade
   * @param fromVersion - The current version
   * @param toVersion - The target version
   * @returns The upgraded event
   */
  upgrade(event: T, fromVersion: string, toVersion: string): T {
    const from = EventVersion.parse(fromVersion);
    const to = EventVersion.parse(toVersion);

    if (from.equals(to)) {
      return event; // No upgrade needed
    }

    if (from.isNewerThan(to)) {
      throw new Error('Cannot downgrade events');
    }

    let currentEvent: any = event;
    let currentVersion = from;

    // Apply upgraders in sequence
    for (const upgrader of this.upgraders) {
      const upgraderFrom = EventVersion.parse(upgrader.fromVersion);
      const upgraderTo = EventVersion.parse(upgrader.toVersion);

      if (currentVersion.equals(upgraderFrom)) {
        currentEvent = upgrader.upgrade(currentEvent);
        currentVersion = upgraderTo;

        if (currentVersion.equals(to)) {
          return currentEvent; // Reached target version
        }
      }
    }

    throw new Error(
      `No upgrade path found from ${fromVersion} to ${toVersion}`,
    );
  }
}
