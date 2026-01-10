import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { DisableSourceOnSourceUnhealthy } from '../disable-source-on-source-unhealthy';
import { SourceUnhealthyEvent } from '@/ingestion/source/domain/events';
import { DisableSourceCommand } from '@/ingestion/source/app/commands/disable-source/command';

describe('DisableSourceOnSourceUnhealthy', () => {
  let handler: DisableSourceOnSourceUnhealthy;
  let commandBus: { execute: jest.Mock };

  beforeEach(async () => {
    const mockCommandBus = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisableSourceOnSourceUnhealthy,
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
      ],
    }).compile();

    handler = module.get<DisableSourceOnSourceUnhealthy>(
      DisableSourceOnSourceUnhealthy,
    );
    commandBus = mockCommandBus;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should execute DisableSourceCommand when SourceUnhealthyEvent is received', async () => {
      // Arrange
      const event = new SourceUnhealthyEvent(
        'source-123',
        75.5,
        5,
        new Date('2024-01-15T10:00:00Z'),
      );

      commandBus.execute.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(DisableSourceCommand),
      );

      const executedCommand = commandBus.execute.mock
        .calls[0][0] as DisableSourceCommand;
      expect(executedCommand.sourceId).toBe('source-123');
      expect(executedCommand.reason).toContain('75.50% failure rate');
      expect(executedCommand.reason).toContain('5 consecutive failures');
    });

    it('should format reason with correct failure metrics', async () => {
      // Arrange
      const event = new SourceUnhealthyEvent(
        'source-456',
        90.0,
        10,
        new Date('2024-01-15T10:00:00Z'),
      );

      commandBus.execute.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      const executedCommand = commandBus.execute.mock
        .calls[0][0] as DisableSourceCommand;
      expect(executedCommand.reason).toBe(
        'Automatic disable: 90.00% failure rate, 10 consecutive failures',
      );
    });

    it('should not throw when command execution fails (error isolation)', async () => {
      // Arrange
      const event = new SourceUnhealthyEvent(
        'source-123',
        80.0,
        3,
        new Date('2024-01-15T10:00:00Z'),
      );

      commandBus.execute.mockRejectedValue(new Error('Command failed'));

      // Act & Assert - should not throw
      await expect(handler.handle(event)).resolves.not.toThrow();
    });

    it('should log error when command execution fails', async () => {
      // Arrange
      const event = new SourceUnhealthyEvent(
        'source-123',
        80.0,
        3,
        new Date('2024-01-15T10:00:00Z'),
      );

      commandBus.execute.mockRejectedValue(new Error('Command failed'));
      const loggerErrorSpy = jest.spyOn(handler['logger'], 'error');

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error disabling source source-123'),
        expect.any(String),
      );
    });
  });
});
