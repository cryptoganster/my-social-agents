import { Test, TestingModule } from '@nestjs/testing';
import { NotifyAdminsOnSourceUnhealthy } from '../notify-admins-on-source-unhealthy';
import { SourceUnhealthyEvent } from '@/ingestion/source/domain/events';

describe('NotifyAdminsOnSourceUnhealthy', () => {
  let handler: NotifyAdminsOnSourceUnhealthy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotifyAdminsOnSourceUnhealthy],
    }).compile();

    handler = module.get<NotifyAdminsOnSourceUnhealthy>(
      NotifyAdminsOnSourceUnhealthy,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should log alert placeholder message', () => {
      // Arrange
      const event = new SourceUnhealthyEvent(
        'source-123',
        75.5,
        5,
        new Date('2024-01-15T10:00:00Z'),
      );

      const loggerWarnSpy = jest.spyOn(handler['logger'], 'warn');

      // Act
      handler.handle(event);

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ALERT PLACEHOLDER]'),
      );
    });

    it('should include source ID in alert message', () => {
      // Arrange
      const event = new SourceUnhealthyEvent(
        'source-456',
        80.0,
        3,
        new Date('2024-01-15T10:00:00Z'),
      );

      const loggerWarnSpy = jest.spyOn(handler['logger'], 'warn');

      // Act
      handler.handle(event);

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Source source-456 requires attention'),
      );
    });

    it('should include failure metrics in alert message', () => {
      // Arrange
      const event = new SourceUnhealthyEvent(
        'source-123',
        90.5,
        10,
        new Date('2024-01-15T10:00:00Z'),
      );

      const loggerWarnSpy = jest.spyOn(handler['logger'], 'warn');

      // Act
      handler.handle(event);

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('90.50% failure rate'),
      );
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('10 consecutive failures'),
      );
    });

    it('should not throw on error (error isolation)', () => {
      // Arrange
      const event = new SourceUnhealthyEvent(
        'source-123',
        80.0,
        3,
        new Date('2024-01-15T10:00:00Z'),
      );

      // Mock logger to throw
      jest.spyOn(handler['logger'], 'warn').mockImplementation(() => {
        throw new Error('Logger failed');
      });

      // Act & Assert - should not throw
      expect(() => handler.handle(event)).not.toThrow();
    });
  });
});
