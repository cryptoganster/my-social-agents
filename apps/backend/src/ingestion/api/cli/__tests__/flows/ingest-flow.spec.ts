/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { INestApplicationContext } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ingestFlow } from '../../flows/ingest-flow';
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

describe('ingestFlow', () => {
  let mockApp: INestApplicationContext;
  let mockCommandBus: CommandBus;
  let mockReadRepo: {
    findActive: jest.Mock;
  };

  beforeEach(() => {
    // Create mock CommandBus
    mockCommandBus = {
      execute: jest.fn(),
    } as unknown as CommandBus;

    // Create mock read repository
    mockReadRepo = {
      findActive: jest.fn().mockResolvedValue([
        {
          sourceId: 'test-source-123',
          name: 'Test Source',
          sourceType: 'WEB_SCRAPER',
        },
      ]),
    };

    // Create mock NestJS application context
    mockApp = {
      get: jest.fn((token: unknown) => {
        if (token === CommandBus) return mockCommandBus;
        return mockReadRepo;
      }),
    } as unknown as INestApplicationContext;

    // Clear all mocks
    jest.clearAllMocks();

    // Suppress console output during tests
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return "main" when user cancels ingestion', async () => {
    // Mock user input: select source, then cancel
    (inquirer.prompt as unknown as jest.Mock)
      .mockResolvedValueOnce({ sourceId: 'test-source-123' })
      .mockResolvedValueOnce({ confirm: false });

    const result = await ingestFlow(mockApp);

    expect(result).toBe('main');
    expect(mockCommandBus.execute).not.toHaveBeenCalled();
  });

  it('should execute IngestContentCommand and return "main" on success', async () => {
    // Mock successful ingestion result
    const mockResult = {
      itemsCollected: 10,
      itemsPersisted: 8,
      duplicatesDetected: 2,
      validationErrors: 0,
      errors: [],
    };

    (mockCommandBus.execute as jest.Mock).mockResolvedValue(mockResult);

    // Mock user input: select source, confirm, then return to main
    (inquirer.prompt as unknown as jest.Mock)
      .mockResolvedValueOnce({ sourceId: 'test-source-123' })
      .mockResolvedValueOnce({ confirm: true })
      .mockResolvedValueOnce({ next: 'main' });

    const result = await ingestFlow(mockApp);

    expect(result).toBe('main');
    expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
    expect(mockCommandBus.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: 'test-source-123',
      }),
    );
  });

  it('should execute IngestContentCommand and return "exit" when user chooses to exit', async () => {
    // Mock successful ingestion result
    const mockResult = {
      itemsCollected: 5,
      itemsPersisted: 5,
      duplicatesDetected: 0,
      validationErrors: 0,
      errors: [],
    };

    (mockCommandBus.execute as jest.Mock).mockResolvedValue(mockResult);

    // Mock user input: select source, confirm, then exit
    (inquirer.prompt as unknown as jest.Mock)
      .mockResolvedValueOnce({ sourceId: 'test-source-123' })
      .mockResolvedValueOnce({ confirm: true })
      .mockResolvedValueOnce({ next: 'exit' });

    const result = await ingestFlow(mockApp);

    expect(result).toBe('exit');
    expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
  });

  it('should handle errors gracefully and return user choice', async () => {
    // Mock command execution error
    const mockError = new Error('Ingestion failed: source not found');
    (mockCommandBus.execute as jest.Mock).mockRejectedValue(mockError);

    // Mock user input: select source, confirm, then return to main after error
    (inquirer.prompt as unknown as jest.Mock)
      .mockResolvedValueOnce({ sourceId: 'test-source-123' })
      .mockResolvedValueOnce({ confirm: true })
      .mockResolvedValueOnce({ next: 'main' });

    const result = await ingestFlow(mockApp);

    expect(result).toBe('main');
    expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
  });

  it('should display errors when ingestion result contains errors', async () => {
    // Mock ingestion result with errors
    const mockResult = {
      itemsCollected: 10,
      itemsPersisted: 7,
      duplicatesDetected: 1,
      validationErrors: 2,
      errors: [
        { message: 'Failed to parse content from item 3' },
        { message: 'Network timeout for item 8' },
      ],
    };

    (mockCommandBus.execute as jest.Mock).mockResolvedValue(mockResult);

    // Mock user input: select source, confirm, then return to main
    (inquirer.prompt as unknown as jest.Mock)
      .mockResolvedValueOnce({ sourceId: 'test-source-123' })
      .mockResolvedValueOnce({ confirm: true })
      .mockResolvedValueOnce({ next: 'main' });

    const result = await ingestFlow(mockApp);

    expect(result).toBe('main');
    expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
  });

  it('should load and display available sources', async () => {
    // Mock user input: select source, cancel
    (inquirer.prompt as unknown as jest.Mock)
      .mockResolvedValueOnce({ sourceId: 'test-source-123' })
      .mockResolvedValueOnce({ confirm: false });

    await ingestFlow(mockApp);

    // Verify read repository was called
    expect(mockReadRepo.findActive).toHaveBeenCalledTimes(1);
  });
});
