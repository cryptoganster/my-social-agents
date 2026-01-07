import { INestApplicationContext } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { configureFlow } from '../../flows/configure-flow';
import { SourceTypeEnum } from '@/ingestion/source/domain/value-objects/source-type';
import inquirer from 'inquirer';

// Mock dependencies
jest.mock('inquirer');
jest.mock('ora', () => {
  return jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
  }));
});

// Mock template flows
jest.mock('../../flows/template-selection-flow');
jest.mock('../../flows/json-editor-flow');
jest.mock('@/ingestion/source/infra/templates/file-system-template-loader');
jest.mock('@/ingestion/source/infra/templates/json-template-validator');

describe('configureFlow', () => {
  let mockApp: INestApplicationContext;
  let mockCommandBus: CommandBus;

  beforeEach(() => {
    // Create mock CommandBus
    mockCommandBus = {
      execute: jest.fn(),
    } as unknown as CommandBus;

    // Create mock NestJS application context
    mockApp = {
      get: jest.fn().mockReturnValue(mockCommandBus),
    } as unknown as INestApplicationContext;

    // Clear all mocks
    jest.clearAllMocks();

    // Suppress console output during tests
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return "main" when user selects back', async () => {
    // Mock user input: select back
    (inquirer.prompt as unknown as jest.Mock).mockResolvedValueOnce({
      action: 'back',
    });

    const result = await configureFlow(mockApp);

    expect(result).toBe('main');
    expect(mockCommandBus.execute).not.toHaveBeenCalled();
  });

  it('should return "main" when user cancels configuration', async () => {
    // Mock user input: create new source, provide details, then cancel
    (inquirer.prompt as unknown as jest.Mock)
      .mockResolvedValueOnce({ action: 'create' })
      .mockResolvedValueOnce({
        name: 'Test Source',
        type: SourceTypeEnum.WEB,
      })
      .mockResolvedValueOnce({ hasConfig: false })
      .mockResolvedValueOnce({ hasCredentials: false })
      .mockResolvedValueOnce({ isActive: true })
      .mockResolvedValueOnce({ confirm: false });

    const result = await configureFlow(mockApp);

    expect(result).toBe('main');
    expect(mockCommandBus.execute).not.toHaveBeenCalled();
  });

  it('should create new source and return "main"', async () => {
    // Mock successful configuration result
    const mockResult = {
      sourceId: 'source-123',
      isNew: true,
      isActive: true,
    };

    (mockCommandBus.execute as jest.Mock).mockResolvedValue(mockResult);

    // Mock user input: create new source with minimal config
    (inquirer.prompt as unknown as jest.Mock)
      .mockResolvedValueOnce({ action: 'create' })
      .mockResolvedValueOnce({
        name: 'Test Source',
        type: SourceTypeEnum.WEB,
      })
      .mockResolvedValueOnce({ hasConfig: false })
      .mockResolvedValueOnce({ hasCredentials: false })
      .mockResolvedValueOnce({ isActive: true })
      .mockResolvedValueOnce({ confirm: true })
      .mockResolvedValueOnce({ next: 'main' });

    const result = await configureFlow(mockApp);

    expect(result).toBe('main');
    expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
    expect(mockCommandBus.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Source',
        sourceType: SourceTypeEnum.WEB,
      }),
    );
  });

  it('should update existing source and return "exit"', async () => {
    // Mock successful configuration result
    const mockResult = {
      sourceId: 'source-456',
      isNew: false,
      isActive: false,
    };

    (mockCommandBus.execute as jest.Mock).mockResolvedValue(mockResult);

    // Mock user input: update existing source
    (inquirer.prompt as unknown as jest.Mock)
      .mockResolvedValueOnce({ action: 'update' })
      .mockResolvedValueOnce({ sourceId: 'source-456' })
      .mockResolvedValueOnce({
        name: 'Updated Source',
        type: SourceTypeEnum.PDF,
      })
      .mockResolvedValueOnce({ hasConfig: false })
      .mockResolvedValueOnce({ hasCredentials: false })
      .mockResolvedValueOnce({ isActive: false })
      .mockResolvedValueOnce({ confirm: true })
      .mockResolvedValueOnce({ next: 'exit' });

    const result = await configureFlow(mockApp);

    expect(result).toBe('exit');
    expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
  });

  it('should handle configuration with JSON config', async () => {
    // Mock successful configuration result
    const mockResult = {
      sourceId: 'source-789',
      isNew: true,
      isActive: true,
    };

    (mockCommandBus.execute as jest.Mock).mockResolvedValue(mockResult);

    const testConfig = { url: 'https://example.com', timeout: 5000 };

    // Mock user input: create source with JSON config
    (inquirer.prompt as unknown as jest.Mock)
      .mockResolvedValueOnce({ action: 'create' })
      .mockResolvedValueOnce({
        name: 'Test Source',
        type: SourceTypeEnum.WEB,
      })
      .mockResolvedValueOnce({ hasConfig: true })
      .mockResolvedValueOnce({ configJson: JSON.stringify(testConfig) })
      .mockResolvedValueOnce({ hasCredentials: false })
      .mockResolvedValueOnce({ isActive: true })
      .mockResolvedValueOnce({ confirm: true })
      .mockResolvedValueOnce({ next: 'main' });

    const result = await configureFlow(mockApp);

    expect(result).toBe('main');
    expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
  });

  it('should handle configuration with credentials', async () => {
    // Mock successful configuration result
    const mockResult = {
      sourceId: 'source-999',
      isNew: true,
      isActive: true,
    };

    (mockCommandBus.execute as jest.Mock).mockResolvedValue(mockResult);

    // Mock user input: create source with credentials
    (inquirer.prompt as unknown as jest.Mock)
      .mockResolvedValueOnce({ action: 'create' })
      .mockResolvedValueOnce({
        name: 'Test Source',
        type: SourceTypeEnum.SOCIAL_MEDIA,
      })
      .mockResolvedValueOnce({ hasConfig: false })
      .mockResolvedValueOnce({ hasCredentials: true })
      .mockResolvedValueOnce({ credentials: 'secret-api-key' })
      .mockResolvedValueOnce({ isActive: true })
      .mockResolvedValueOnce({ confirm: true })
      .mockResolvedValueOnce({ next: 'main' });

    const result = await configureFlow(mockApp);

    expect(result).toBe('main');
    expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
  });

  it('should handle errors gracefully and return user choice', async () => {
    // Mock command execution error
    const mockError = new Error('Configuration failed: invalid source type');
    (mockCommandBus.execute as jest.Mock).mockRejectedValue(mockError);

    // Mock user input: create source, then handle error
    (inquirer.prompt as unknown as jest.Mock)
      .mockResolvedValueOnce({ action: 'create' })
      .mockResolvedValueOnce({
        name: 'Test Source',
        type: SourceTypeEnum.WEB,
      })
      .mockResolvedValueOnce({ hasConfig: false })
      .mockResolvedValueOnce({ hasCredentials: false })
      .mockResolvedValueOnce({ isActive: true })
      .mockResolvedValueOnce({ confirm: true })
      .mockResolvedValueOnce({ next: 'main' });

    const result = await configureFlow(mockApp);

    expect(result).toBe('main');
    expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
  });
});
