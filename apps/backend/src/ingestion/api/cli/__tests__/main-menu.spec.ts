import { INestApplicationContext } from '@nestjs/common';
import { showMainMenu } from '../main-menu';
import inquirer from 'inquirer';
import * as flows from '../flows';

// Mock dependencies
jest.mock('inquirer');
jest.mock('../flows');

describe('showMainMenu', () => {
  let mockApp: INestApplicationContext;

  beforeEach(() => {
    // Create mock NestJS application context
    mockApp = {
      get: jest.fn(),
    } as unknown as INestApplicationContext;

    // Clear all mocks
    jest.clearAllMocks();

    // Suppress console output during tests
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return "exit" when user selects exit', async () => {
    // Mock user input: select exit
    (inquirer.prompt as unknown as jest.Mock).mockResolvedValueOnce({
      action: 'exit',
    });

    const result = await showMainMenu(mockApp);

    expect(result).toBe('exit');
    expect(flows.ingestFlow).not.toHaveBeenCalled();
    expect(flows.scheduleFlow).not.toHaveBeenCalled();
    expect(flows.configureFlow).not.toHaveBeenCalled();
  });

  it('should delegate to ingestFlow and return "continue" when flow returns "main"', async () => {
    // Mock user input: select ingest
    (inquirer.prompt as unknown as jest.Mock).mockResolvedValueOnce({
      action: 'ingest',
    });

    // Mock ingestFlow to return 'main'
    (flows.ingestFlow as jest.Mock).mockResolvedValueOnce('main');

    const result = await showMainMenu(mockApp);

    expect(result).toBe('continue');
    expect(flows.ingestFlow).toHaveBeenCalledWith(mockApp);
    expect(flows.ingestFlow).toHaveBeenCalledTimes(1);
  });

  it('should delegate to scheduleFlow and return "continue" when flow returns "main"', async () => {
    // Mock user input: select schedule
    (inquirer.prompt as unknown as jest.Mock).mockResolvedValueOnce({
      action: 'schedule',
    });

    // Mock scheduleFlow to return 'main'
    (flows.scheduleFlow as jest.Mock).mockResolvedValueOnce('main');

    const result = await showMainMenu(mockApp);

    expect(result).toBe('continue');
    expect(flows.scheduleFlow).toHaveBeenCalledWith(mockApp);
    expect(flows.scheduleFlow).toHaveBeenCalledTimes(1);
  });

  it('should delegate to configureFlow and return "continue" when flow returns "main"', async () => {
    // Mock user input: select configure
    (inquirer.prompt as unknown as jest.Mock).mockResolvedValueOnce({
      action: 'configure',
    });

    // Mock configureFlow to return 'main'
    (flows.configureFlow as jest.Mock).mockResolvedValueOnce('main');

    const result = await showMainMenu(mockApp);

    expect(result).toBe('continue');
    expect(flows.configureFlow).toHaveBeenCalledWith(mockApp);
    expect(flows.configureFlow).toHaveBeenCalledTimes(1);
  });

  it('should return "exit" when flow returns "exit"', async () => {
    // Mock user input: select ingest
    (inquirer.prompt as unknown as jest.Mock).mockResolvedValueOnce({
      action: 'ingest',
    });

    // Mock ingestFlow to return 'exit'
    (flows.ingestFlow as jest.Mock).mockResolvedValueOnce('exit');

    const result = await showMainMenu(mockApp);

    expect(result).toBe('exit');
    expect(flows.ingestFlow).toHaveBeenCalledWith(mockApp);
  });

  it('should handle unknown action by returning "continue"', async () => {
    // Mock user input: unknown action
    (inquirer.prompt as unknown as jest.Mock).mockResolvedValueOnce({
      action: 'unknown',
    });

    const result = await showMainMenu(mockApp);

    expect(result).toBe('continue');
    expect(flows.ingestFlow).not.toHaveBeenCalled();
    expect(flows.scheduleFlow).not.toHaveBeenCalled();
    expect(flows.configureFlow).not.toHaveBeenCalled();
  });
});
