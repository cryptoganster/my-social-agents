/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { displayBanner } from '../banner';

/**
 * Unit tests for banner module
 *
 * Tests that the banner displays without errors and produces output.
 *
 * Requirements: 12.3
 */
describe('Banner Module', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    // Spy on console.log to capture output
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    // Restore console.log
    consoleLogSpy.mockRestore();
  });

  describe('displayBanner', () => {
    it('should display banner without errors', () => {
      // Act & Assert - should not throw
      expect(() => displayBanner()).not.toThrow();
    });

    it('should produce console output', () => {
      // Act
      displayBanner();

      // Assert - should have called console.log multiple times
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleLogSpy.mock.calls.length).toBeGreaterThan(0);
    });

    it('should display application name in output', () => {
      // Act
      displayBanner();

      // Assert - should contain "Content Ingestion CLI" in one of the calls
      const allOutput = consoleLogSpy.mock.calls
        .map((call) => call.join(' '))
        .join('\n');
      expect(allOutput).toContain('Content Ingestion CLI');
    });

    it('should display version in output', () => {
      // Act
      displayBanner();

      // Assert - should contain version number
      const allOutput = consoleLogSpy.mock.calls
        .map((call) => call.join(' '))
        .join('\n');
      expect(allOutput).toContain('v1.0.0');
    });

    it('should display description in output', () => {
      // Act
      displayBanner();

      // Assert - should contain description
      const allOutput = consoleLogSpy.mock.calls
        .map((call) => call.join(' '))
        .join('\n');
      expect(allOutput).toContain(
        'Multi-source cryptocurrency content collection',
      );
    });

    it('should display architecture info in output', () => {
      // Act
      displayBanner();

      // Assert - should contain architecture info
      const allOutput = consoleLogSpy.mock.calls
        .map((call) => call.join(' '))
        .join('\n');
      expect(allOutput).toContain('Clean Architecture');
    });
  });
});
