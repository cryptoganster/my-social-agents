/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { bootstrap } from '../bootstrap';
import chalk from 'chalk';
import ora from 'ora';

/**
 * Unit tests for bootstrap module
 *
 * Tests successful initialization and error handling.
 *
 * Requirements: 12.4
 */

// Mock dependencies
jest.mock('@nestjs/core');
jest.mock('ora');
jest.mock('chalk', () => ({
  green: jest.fn((text) => text),
  red: jest.fn((text) => text),
  blue: jest.fn((text) => text),
  cyan: jest.fn((text) => text),
  yellow: jest.fn((text) => text),
  gray: jest.fn((text) => text),
  white: jest.fn((text) => text),
  magenta: jest.fn((text) => text),
}));

describe('Bootstrap Module', () => {
  let mockSpinner: {
    start: jest.Mock;
    stop: jest.Mock;
    succeed: jest.Mock;
    fail: jest.Mock;
  };
  let mockApp: INestApplicationContext;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock spinner
    mockSpinner = {
      start: jest.fn().mockReturnThis(),
      stop: jest.fn(),
      succeed: jest.fn(),
      fail: jest.fn(),
    };

    // Mock ora to return our mock spinner
    (ora as unknown as jest.Mock).mockReturnValue(mockSpinner);

    // Create mock application context
    mockApp = {
      get: jest.fn(),
      select: jest.fn(),
      close: jest.fn(),
      init: jest.fn(),
      enableShutdownHooks: jest.fn(),
    } as unknown as INestApplicationContext;
  });

  describe('bootstrap', () => {
    it('should successfully initialize NestJS application context', async () => {
      // Arrange
      (NestFactory.createApplicationContext as jest.Mock).mockResolvedValue(
        mockApp,
      );

      // Act
      const result = await bootstrap();

      // Assert
      expect(result).toBe(mockApp);
      expect(NestFactory.createApplicationContext).toHaveBeenCalledWith(
        expect.anything(),
        { logger: ['error', 'warn', 'log', 'debug'] },
      );
    });

    it('should display loading spinner during initialization', async () => {
      // Arrange
      (NestFactory.createApplicationContext as jest.Mock).mockResolvedValue(
        mockApp,
      );

      // Act
      await bootstrap();

      // Assert
      expect(ora).toHaveBeenCalledWith({
        text: 'Initializing application context...',
        color: 'cyan',
      });
      expect(mockSpinner.start).toHaveBeenCalled();
    });

    it('should stop spinner when initialization completes', async () => {
      // Arrange
      (NestFactory.createApplicationContext as jest.Mock).mockResolvedValue(
        mockApp,
      );
      mockSpinner.stop = jest.fn();

      // Act
      await bootstrap();

      // Assert
      expect(mockSpinner.stop).toHaveBeenCalled();
    });

    it('should enable logging for debugging', async () => {
      // Arrange
      (NestFactory.createApplicationContext as jest.Mock).mockResolvedValue(
        mockApp,
      );

      // Act
      await bootstrap();

      // Assert
      expect(NestFactory.createApplicationContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ logger: ['error', 'warn', 'log', 'debug'] }),
      );
    });

    it('should handle initialization errors gracefully', async () => {
      // Arrange
      const error = new Error('Initialization failed');
      (NestFactory.createApplicationContext as jest.Mock).mockRejectedValue(
        error,
      );

      // Act & Assert
      await expect(bootstrap()).rejects.toThrow('Initialization failed');
      expect(mockSpinner.fail).toHaveBeenCalled();
      expect(chalk.red).toHaveBeenCalledWith(
        'Failed to initialize application',
      );
    });

    it('should show failure message when initialization fails', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      (NestFactory.createApplicationContext as jest.Mock).mockRejectedValue(
        error,
      );

      // Act
      try {
        await bootstrap();
      } catch {
        // Expected to throw
      }

      // Assert
      expect(mockSpinner.fail).toHaveBeenCalled();
    });

    it('should throw the original error when initialization fails', async () => {
      // Arrange
      const originalError = new Error('Custom error message');
      (NestFactory.createApplicationContext as jest.Mock).mockRejectedValue(
        originalError,
      );

      // Act & Assert
      await expect(bootstrap()).rejects.toBe(originalError);
    });
  });
});
