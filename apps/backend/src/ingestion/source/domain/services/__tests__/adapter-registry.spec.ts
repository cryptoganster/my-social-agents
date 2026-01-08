import { AdapterRegistry } from '../adapter-registry';
import { SourceAdapter } from '@/ingestion/source/domain/interfaces/source-adapter';
import { SourceType } from '@/ingestion/source/domain/value-objects/source-type';
import { SourceTypeEnum } from '@/ingestion/source/domain/value-objects/source-type';

describe('AdapterRegistry', () => {
  let registry: AdapterRegistry;
  let mockAdapter: SourceAdapter;

  beforeEach(() => {
    registry = new AdapterRegistry();
    mockAdapter = {
      collect: jest.fn(),
      supports: jest.fn(),
      validateConfig: jest.fn(),
    };
  });

  describe('register', () => {
    it('should register an adapter for a source type', () => {
      // Arrange
      const sourceType = SourceType.fromEnum(SourceTypeEnum.RSS);

      // Act
      registry.register(sourceType, mockAdapter);

      // Assert
      expect(registry.hasAdapter(sourceType)).toBe(true);
    });

    it('should allow registering multiple adapters for different source types', () => {
      // Arrange
      const rssType = SourceType.fromEnum(SourceTypeEnum.RSS);
      const webType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const mockAdapter2: SourceAdapter = {
        collect: jest.fn(),
        supports: jest.fn(),
        validateConfig: jest.fn(),
      };

      // Act
      registry.register(rssType, mockAdapter);
      registry.register(webType, mockAdapter2);

      // Assert
      expect(registry.hasAdapter(rssType)).toBe(true);
      expect(registry.hasAdapter(webType)).toBe(true);
    });

    it('should overwrite existing adapter when registering same source type', () => {
      // Arrange
      const sourceType = SourceType.fromEnum(SourceTypeEnum.RSS);
      const mockAdapter2: SourceAdapter = {
        collect: jest.fn(),
        supports: jest.fn(),
        validateConfig: jest.fn(),
      };

      // Act
      registry.register(sourceType, mockAdapter);
      registry.register(sourceType, mockAdapter2);

      // Assert
      const retrievedAdapter = registry.getAdapter(sourceType);
      expect(retrievedAdapter).toBe(mockAdapter2);
    });
  });

  describe('getAdapter', () => {
    it('should retrieve a registered adapter', () => {
      // Arrange
      const sourceType = SourceType.fromEnum(SourceTypeEnum.RSS);
      registry.register(sourceType, mockAdapter);

      // Act
      const retrievedAdapter = registry.getAdapter(sourceType);

      // Assert
      expect(retrievedAdapter).toBe(mockAdapter);
    });

    it('should throw error when adapter not found', () => {
      // Arrange
      const sourceType = SourceType.fromEnum(SourceTypeEnum.RSS);

      // Act & Assert
      expect(() => registry.getAdapter(sourceType)).toThrow(
        'No adapter registered for source type: RSS',
      );
    });

    it('should throw error with correct source type in message', () => {
      // Arrange
      const sourceType = SourceType.fromEnum(SourceTypeEnum.SOCIAL_MEDIA);

      // Act & Assert
      expect(() => registry.getAdapter(sourceType)).toThrow(
        'No adapter registered for source type: SOCIAL_MEDIA',
      );
    });
  });

  describe('hasAdapter', () => {
    it('should return true when adapter is registered', () => {
      // Arrange
      const sourceType = SourceType.fromEnum(SourceTypeEnum.RSS);
      registry.register(sourceType, mockAdapter);

      // Act
      const result = registry.hasAdapter(sourceType);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when adapter is not registered', () => {
      // Arrange
      const sourceType = SourceType.fromEnum(SourceTypeEnum.RSS);

      // Act
      const result = registry.hasAdapter(sourceType);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for different source type', () => {
      // Arrange
      const rssType = SourceType.fromEnum(SourceTypeEnum.RSS);
      const webType = SourceType.fromEnum(SourceTypeEnum.WEB);
      registry.register(rssType, mockAdapter);

      // Act
      const result = registry.hasAdapter(webType);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getRegisteredTypes', () => {
    it('should return empty array when no adapters registered', () => {
      // Act
      const types = registry.getRegisteredTypes();

      // Assert
      expect(types).toEqual([]);
    });

    it('should return all registered source types', () => {
      // Arrange
      const rssType = SourceType.fromEnum(SourceTypeEnum.RSS);
      const webType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const mockAdapter2: SourceAdapter = {
        collect: jest.fn(),
        supports: jest.fn(),
        validateConfig: jest.fn(),
      };

      registry.register(rssType, mockAdapter);
      registry.register(webType, mockAdapter2);

      // Act
      const types = registry.getRegisteredTypes();

      // Assert
      expect(types).toHaveLength(2);
      expect(types).toContain('RSS');
      expect(types).toContain('WEB');
    });
  });

  describe('clear', () => {
    it('should remove all registered adapters', () => {
      // Arrange
      const rssType = SourceType.fromEnum(SourceTypeEnum.RSS);
      const webType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const mockAdapter2: SourceAdapter = {
        collect: jest.fn(),
        supports: jest.fn(),
        validateConfig: jest.fn(),
      };

      registry.register(rssType, mockAdapter);
      registry.register(webType, mockAdapter2);

      // Act
      registry.clear();

      // Assert
      expect(registry.hasAdapter(rssType)).toBe(false);
      expect(registry.hasAdapter(webType)).toBe(false);
      expect(registry.getRegisteredTypes()).toEqual([]);
    });
  });
});
