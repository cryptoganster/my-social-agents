import {
  EventVersion,
  EventVersionRegistry,
  EventUpgraderChain,
  IEventUpgrader,
} from '../event-versioning';

describe('EventVersion', () => {
  describe('parse', () => {
    it('should parse valid version string', () => {
      const version = EventVersion.parse('1.0');
      expect(version.toString()).toBe('1.0');
      expect(version.getMajor()).toBe(1);
      expect(version.getMinor()).toBe(0);
    });

    it('should parse version with multiple digits', () => {
      const version = EventVersion.parse('12.34');
      expect(version.toString()).toBe('12.34');
      expect(version.getMajor()).toBe(12);
      expect(version.getMinor()).toBe(34);
    });

    it('should throw error for invalid format', () => {
      expect(() => EventVersion.parse('1')).toThrow(
        'Invalid version format. Expected "major.minor"',
      );
      expect(() => EventVersion.parse('1.0.0')).toThrow(
        'Invalid version format. Expected "major.minor"',
      );
      expect(() => EventVersion.parse('invalid')).toThrow(
        'Invalid version format. Expected "major.minor"',
      );
    });

    it('should throw error for non-numeric components', () => {
      expect(() => EventVersion.parse('a.b')).toThrow(
        'Version components must be numbers',
      );
      expect(() => EventVersion.parse('1.b')).toThrow(
        'Version components must be numbers',
      );
    });
  });

  describe('initial', () => {
    it('should create version 1.0', () => {
      const version = EventVersion.initial();
      expect(version.toString()).toBe('1.0');
    });
  });

  describe('create', () => {
    it('should create version from numbers', () => {
      const version = EventVersion.create(2, 5);
      expect(version.toString()).toBe('2.5');
    });

    it('should throw error for negative numbers', () => {
      expect(() => EventVersion.create(-1, 0)).toThrow(
        'Major version must be a non-negative integer',
      );
      expect(() => EventVersion.create(1, -1)).toThrow(
        'Minor version must be a non-negative integer',
      );
    });

    it('should throw error for non-integers', () => {
      expect(() => EventVersion.create(1.5, 0)).toThrow(
        'Major version must be a non-negative integer',
      );
      expect(() => EventVersion.create(1, 0.5)).toThrow(
        'Minor version must be a non-negative integer',
      );
    });
  });

  describe('incrementMajor', () => {
    it('should increment major version and reset minor', () => {
      const v1 = EventVersion.parse('1.5');
      const v2 = v1.incrementMajor();
      expect(v2.toString()).toBe('2.0');
    });
  });

  describe('incrementMinor', () => {
    it('should increment minor version', () => {
      const v1 = EventVersion.parse('1.5');
      const v2 = v1.incrementMinor();
      expect(v2.toString()).toBe('1.6');
    });
  });

  describe('isCompatibleWith', () => {
    it('should return true for same major version', () => {
      const v1 = EventVersion.parse('1.0');
      const v2 = EventVersion.parse('1.5');
      expect(v1.isCompatibleWith(v2)).toBe(true);
      expect(v2.isCompatibleWith(v1)).toBe(true);
    });

    it('should return false for different major versions', () => {
      const v1 = EventVersion.parse('1.0');
      const v2 = EventVersion.parse('2.0');
      expect(v1.isCompatibleWith(v2)).toBe(false);
      expect(v2.isCompatibleWith(v1)).toBe(false);
    });
  });

  describe('isNewerThan', () => {
    it('should return true when major version is higher', () => {
      const v1 = EventVersion.parse('2.0');
      const v2 = EventVersion.parse('1.5');
      expect(v1.isNewerThan(v2)).toBe(true);
    });

    it('should return true when major is same and minor is higher', () => {
      const v1 = EventVersion.parse('1.5');
      const v2 = EventVersion.parse('1.3');
      expect(v1.isNewerThan(v2)).toBe(true);
    });

    it('should return false when versions are equal', () => {
      const v1 = EventVersion.parse('1.5');
      const v2 = EventVersion.parse('1.5');
      expect(v1.isNewerThan(v2)).toBe(false);
    });

    it('should return false when version is older', () => {
      const v1 = EventVersion.parse('1.3');
      const v2 = EventVersion.parse('1.5');
      expect(v1.isNewerThan(v2)).toBe(false);
    });
  });

  describe('isOlderThan', () => {
    it('should return true when major version is lower', () => {
      const v1 = EventVersion.parse('1.5');
      const v2 = EventVersion.parse('2.0');
      expect(v1.isOlderThan(v2)).toBe(true);
    });

    it('should return true when major is same and minor is lower', () => {
      const v1 = EventVersion.parse('1.3');
      const v2 = EventVersion.parse('1.5');
      expect(v1.isOlderThan(v2)).toBe(true);
    });

    it('should return false when versions are equal', () => {
      const v1 = EventVersion.parse('1.5');
      const v2 = EventVersion.parse('1.5');
      expect(v1.isOlderThan(v2)).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for equal versions', () => {
      const v1 = EventVersion.parse('1.5');
      const v2 = EventVersion.parse('1.5');
      expect(v1.equals(v2)).toBe(true);
    });

    it('should return false for different versions', () => {
      const v1 = EventVersion.parse('1.5');
      const v2 = EventVersion.parse('1.6');
      expect(v1.equals(v2)).toBe(false);
    });
  });
});

describe('EventVersionRegistry', () => {
  let registry: EventVersionRegistry;

  beforeEach(() => {
    registry = new EventVersionRegistry();
  });

  describe('registerVersion', () => {
    it('should register a version for an event type', () => {
      registry.registerVersion('ContentIngested', '1.0');
      expect(registry.isVersionSupported('ContentIngested', '1.0')).toBe(true);
    });

    it('should register multiple versions for same event type', () => {
      registry.registerVersion('ContentIngested', '1.0');
      registry.registerVersion('ContentIngested', '1.1');
      registry.registerVersion('ContentIngested', '2.0');

      expect(registry.isVersionSupported('ContentIngested', '1.0')).toBe(true);
      expect(registry.isVersionSupported('ContentIngested', '1.1')).toBe(true);
      expect(registry.isVersionSupported('ContentIngested', '2.0')).toBe(true);
    });

    it('should throw error for invalid version format', () => {
      expect(() =>
        registry.registerVersion('ContentIngested', 'invalid'),
      ).toThrow();
    });
  });

  describe('isVersionSupported', () => {
    it('should return false for unregistered event type', () => {
      expect(registry.isVersionSupported('UnknownEvent', '1.0')).toBe(false);
    });

    it('should return false for unregistered version', () => {
      registry.registerVersion('ContentIngested', '1.0');
      expect(registry.isVersionSupported('ContentIngested', '2.0')).toBe(false);
    });
  });

  describe('getSupportedVersions', () => {
    it('should return empty array for unregistered event type', () => {
      expect(registry.getSupportedVersions('UnknownEvent')).toEqual([]);
    });

    it('should return sorted versions', () => {
      registry.registerVersion('ContentIngested', '2.0');
      registry.registerVersion('ContentIngested', '1.0');
      registry.registerVersion('ContentIngested', '1.5');

      const versions = registry.getSupportedVersions('ContentIngested');
      expect(versions).toEqual(['1.0', '1.5', '2.0']);
    });
  });

  describe('getLatestVersion', () => {
    it('should return null for unregistered event type', () => {
      expect(registry.getLatestVersion('UnknownEvent')).toBeNull();
    });

    it('should return latest version', () => {
      registry.registerVersion('ContentIngested', '1.0');
      registry.registerVersion('ContentIngested', '2.0');
      registry.registerVersion('ContentIngested', '1.5');

      expect(registry.getLatestVersion('ContentIngested')).toBe('2.0');
    });
  });

  describe('clear', () => {
    it('should clear all registered versions', () => {
      registry.registerVersion('ContentIngested', '1.0');
      registry.registerVersion('JobCompleted', '1.0');

      registry.clear();

      expect(registry.getSupportedVersions('ContentIngested')).toEqual([]);
      expect(registry.getSupportedVersions('JobCompleted')).toEqual([]);
    });
  });
});

describe('EventUpgraderChain', () => {
  interface EventV1 {
    eventVersion: string;
    eventType: string;
    eventId: string;
    occurredAt: Date;
    aggregateId: string;
    data: string;
  }

  interface EventV2 {
    eventVersion: string;
    eventType: string;
    eventId: string;
    occurredAt: Date;
    aggregateId: string;
    data: string;
    newField: string;
  }

  interface EventV3 {
    eventVersion: string;
    eventType: string;
    eventId: string;
    occurredAt: Date;
    aggregateId: string;
    data: string;
    newField: string;
    anotherField: number;
  }

  class V1ToV2Upgrader implements IEventUpgrader<EventV1, EventV2> {
    fromVersion = '1.0';
    toVersion = '2.0';

    upgrade(oldEvent: EventV1): EventV2 {
      return {
        ...oldEvent,
        eventVersion: '2.0',
        newField: 'default',
      };
    }
  }

  class V2ToV3Upgrader implements IEventUpgrader<EventV2, EventV3> {
    fromVersion = '2.0';
    toVersion = '3.0';

    upgrade(oldEvent: EventV2): EventV3 {
      return {
        ...oldEvent,
        eventVersion: '3.0',
        anotherField: 0,
      };
    }
  }

  let chain: EventUpgraderChain<any>;

  beforeEach(() => {
    chain = new EventUpgraderChain();
  });

  describe('upgrade', () => {
    it('should return same event if versions are equal', () => {
      const event: EventV1 = {
        eventVersion: '1.0',
        eventType: 'Test',
        eventId: '1',
        occurredAt: new Date(),
        aggregateId: 'agg-1',
        data: 'test',
      };

      const result = chain.upgrade(event, '1.0', '1.0');
      expect(result).toBe(event);
    });

    it('should upgrade through single upgrader', () => {
      chain.addUpgrader(new V1ToV2Upgrader());

      const event: EventV1 = {
        eventVersion: '1.0',
        eventType: 'Test',
        eventId: '1',
        occurredAt: new Date(),
        aggregateId: 'agg-1',
        data: 'test',
      };

      const result = chain.upgrade(event, '1.0', '2.0') as EventV2;
      expect(result.eventVersion).toBe('2.0');
      expect(result.newField).toBe('default');
      expect(result.data).toBe('test');
    });

    it('should upgrade through multiple upgraders', () => {
      chain.addUpgrader(new V1ToV2Upgrader());
      chain.addUpgrader(new V2ToV3Upgrader());

      const event: EventV1 = {
        eventVersion: '1.0',
        eventType: 'Test',
        eventId: '1',
        occurredAt: new Date(),
        aggregateId: 'agg-1',
        data: 'test',
      };

      const result = chain.upgrade(event, '1.0', '3.0') as EventV3;
      expect(result.eventVersion).toBe('3.0');
      expect(result.newField).toBe('default');
      expect(result.anotherField).toBe(0);
      expect(result.data).toBe('test');
    });

    it('should throw error when trying to downgrade', () => {
      expect(() => chain.upgrade({} as any, '2.0', '1.0')).toThrow(
        'Cannot downgrade events',
      );
    });

    it('should throw error when no upgrade path exists', () => {
      const event: EventV1 = {
        eventVersion: '1.0',
        eventType: 'Test',
        eventId: '1',
        occurredAt: new Date(),
        aggregateId: 'agg-1',
        data: 'test',
      };

      expect(() => chain.upgrade(event, '1.0', '2.0')).toThrow(
        'No upgrade path found from 1.0 to 2.0',
      );
    });
  });
});
