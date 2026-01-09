import { INestApplicationContext } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { scheduleFlow } from '../../flows/schedule-flow';
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

describe('scheduleFlow', () => {
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

  it('should return "main" when user cancels scheduling', async () => {
    // Mock user input: provide source ID, select schedule option, then cancel
    (inquirer.prompt as unknown as jest.Mock)
      .mockResolvedValueOnce({ sourceId: 'test-source-123' })
      .mockResolvedValueOnce({ scheduleOption: 'now' })
      .mockResolvedValueOnce({ confirm: false });

    const result = await scheduleFlow(mockApp);

    expect(result).toBe('main');
    expect(mockCommandBus.execute).not.toHaveBeenCalled();
  });

  it('should schedule job for immediate execution and return "main"', async () => {
    // Mock successful scheduling result
    const mockResult = {
      jobId: 'job-123',
      sourceId: 'test-source-123',
      scheduledAt: new Date('2026-01-07T10:00:00Z'),
    };

    (mockCommandBus.execute as jest.Mock).mockResolvedValue(mockResult);

    // Mock user input: provide source ID, select "now", confirm, then return to main
    (inquirer.prompt as unknown as jest.Mock)
      .mockResolvedValueOnce({ sourceId: 'test-source-123' })
      .mockResolvedValueOnce({ scheduleOption: 'now' })
      .mockResolvedValueOnce({ confirm: true })
      .mockResolvedValueOnce({ next: 'main' });

    const result = await scheduleFlow(mockApp);

    expect(result).toBe('main');
    expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
    expect(mockCommandBus.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: 'test-source-123',
      }),
    );
  });

  it('should schedule job for custom date/time and return "exit"', async () => {
    // Mock successful scheduling result
    const customDate = new Date('2026-02-15T14:30:00Z');
    const mockResult = {
      jobId: 'job-456',
      sourceId: 'test-source-456',
      scheduledAt: customDate,
    };

    (mockCommandBus.execute as jest.Mock).mockResolvedValue(mockResult);

    // Mock user input: provide source ID, select custom, provide datetime, confirm, then exit
    (inquirer.prompt as unknown as jest.Mock)
      .mockResolvedValueOnce({ sourceId: 'test-source-456' })
      .mockResolvedValueOnce({ scheduleOption: 'custom' })
      .mockResolvedValueOnce({ datetime: '2026-02-15T14:30:00Z' })
      .mockResolvedValueOnce({ confirm: true })
      .mockResolvedValueOnce({ next: 'exit' });

    const result = await scheduleFlow(mockApp);

    expect(result).toBe('exit');
    expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
  });

  it('should handle errors gracefully and return user choice', async () => {
    // Mock command execution error
    const mockError = new Error('Scheduling failed: invalid source');
    (mockCommandBus.execute as jest.Mock).mockRejectedValue(mockError);

    // Mock user input: provide source ID, select now, confirm, then return to main after error
    (inquirer.prompt as unknown as jest.Mock)
      .mockResolvedValueOnce({ sourceId: 'invalid-source' })
      .mockResolvedValueOnce({ scheduleOption: 'now' })
      .mockResolvedValueOnce({ confirm: true })
      .mockResolvedValueOnce({ next: 'main' });

    const result = await scheduleFlow(mockApp);

    expect(result).toBe('main');
    expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
  });

  it('should validate source ID is not empty', async () => {
    // Mock user input
    const promptMock = inquirer.prompt as unknown as jest.Mock;
    promptMock
      .mockResolvedValueOnce({ sourceId: 'valid-source' })
      .mockResolvedValueOnce({ scheduleOption: 'now' })
      .mockResolvedValueOnce({ confirm: true })
      .mockResolvedValueOnce({ next: 'main' });

    // Mock command execution
    (mockCommandBus.execute as jest.Mock).mockResolvedValue({
      jobId: 'job-789',
      sourceId: 'valid-source',
      scheduledAt: new Date(),
    });

    // Execute flow to capture prompt calls
    await scheduleFlow(mockApp);

    // Get the validation function from the first prompt call
    const firstCall = promptMock.mock.calls[0][0];
    const validateFn = firstCall[0].validate;

    // Test validation
    expect(validateFn('')).toBe('Source ID is required');
    expect(validateFn('   ')).toBe('Source ID is required');
    expect(validateFn('valid-id')).toBe(true);
  });

  it('should validate custom datetime format', async () => {
    // Mock user input
    const promptMock = inquirer.prompt as unknown as jest.Mock;
    promptMock
      .mockResolvedValueOnce({ sourceId: 'test-source' })
      .mockResolvedValueOnce({ scheduleOption: 'custom' })
      .mockResolvedValueOnce({ datetime: '2026-01-07T10:00:00' })
      .mockResolvedValueOnce({ confirm: true })
      .mockResolvedValueOnce({ next: 'main' });

    // Mock command execution
    (mockCommandBus.execute as jest.Mock).mockResolvedValue({
      jobId: 'job-999',
      sourceId: 'test-source',
      scheduledAt: new Date('2026-01-07T10:00:00'),
    });

    // Execute flow to capture prompt calls
    await scheduleFlow(mockApp);

    // Get the validation function from the datetime prompt call (third call)
    const datetimeCall = promptMock.mock.calls[2][0];
    const validateFn = datetimeCall[0].validate;

    // Test validation
    expect(validateFn('invalid-date')).toContain('Invalid date format');
    expect(validateFn('2026-01-07T10:00:00')).toBe(true);
    expect(validateFn('2026-01-07T10:00:00Z')).toBe(true);
  });
});
