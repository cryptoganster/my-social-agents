import { TemporalContext } from '@refinement/domain/value-objects/temporal-context';

describe('TemporalContext', () => {
  describe('create', () => {
    it('should create a TemporalContext with only publishedAt', () => {
      const publishedAt = new Date('2024-01-15T10:00:00Z');

      const context = TemporalContext.create(publishedAt);

      expect(context.publishedAt).toEqual(publishedAt);
      expect(context.eventTimestamp).toBeNull();
      expect(context.windowStart).toBeNull();
      expect(context.windowEnd).toBeNull();
    });

    it('should create a TemporalContext with publishedAt and eventTimestamp', () => {
      const publishedAt = new Date('2024-01-15T10:00:00Z');
      const eventTimestamp = new Date('2024-01-10T10:00:00Z');

      const context = TemporalContext.create(publishedAt, eventTimestamp);

      expect(context.publishedAt).toEqual(publishedAt);
      expect(context.eventTimestamp).toEqual(eventTimestamp);
      expect(context.windowStart).toBeNull();
      expect(context.windowEnd).toBeNull();
    });

    it('should throw error for invalid publishedAt', () => {
      const invalidDate = new Date('invalid');

      expect(() => TemporalContext.create(invalidDate)).toThrow(
        'Invalid publishedAt: must be a valid date',
      );
    });

    it('should throw error for invalid eventTimestamp', () => {
      const publishedAt = new Date('2024-01-15T10:00:00Z');
      const invalidDate = new Date('invalid');

      expect(() => TemporalContext.create(publishedAt, invalidDate)).toThrow(
        'Invalid eventTimestamp: must be a valid date or null',
      );
    });
  });

  describe('withWindow', () => {
    it('should create a TemporalContext with temporal window', () => {
      const publishedAt = new Date('2024-01-15T10:00:00Z');
      const windowStart = new Date('2024-01-01T00:00:00Z');
      const windowEnd = new Date('2024-01-31T23:59:59Z');

      const context = TemporalContext.withWindow(
        publishedAt,
        windowStart,
        windowEnd,
      );

      expect(context.publishedAt).toEqual(publishedAt);
      expect(context.windowStart).toEqual(windowStart);
      expect(context.windowEnd).toEqual(windowEnd);
      expect(context.eventTimestamp).toBeNull();
    });

    it('should create a TemporalContext with window and eventTimestamp', () => {
      const publishedAt = new Date('2024-01-15T10:00:00Z');
      const windowStart = new Date('2024-01-01T00:00:00Z');
      const windowEnd = new Date('2024-01-31T23:59:59Z');
      const eventTimestamp = new Date('2024-01-10T10:00:00Z');

      const context = TemporalContext.withWindow(
        publishedAt,
        windowStart,
        windowEnd,
        eventTimestamp,
      );

      expect(context.publishedAt).toEqual(publishedAt);
      expect(context.windowStart).toEqual(windowStart);
      expect(context.windowEnd).toEqual(windowEnd);
      expect(context.eventTimestamp).toEqual(eventTimestamp);
    });

    it('should throw error when windowStart is after windowEnd', () => {
      const publishedAt = new Date('2024-01-15T10:00:00Z');
      const windowStart = new Date('2024-01-31T23:59:59Z');
      const windowEnd = new Date('2024-01-01T00:00:00Z');

      expect(() =>
        TemporalContext.withWindow(publishedAt, windowStart, windowEnd),
      ).toThrow(
        'Invalid temporal window: windowStart must be before windowEnd',
      );
    });

    it('should throw error when windowStart equals windowEnd', () => {
      const publishedAt = new Date('2024-01-15T10:00:00Z');
      const windowStart = new Date('2024-01-15T00:00:00Z');
      const windowEnd = new Date('2024-01-15T00:00:00Z');

      expect(() =>
        TemporalContext.withWindow(publishedAt, windowStart, windowEnd),
      ).toThrow(
        'Invalid temporal window: windowStart must be before windowEnd',
      );
    });

    it('should throw error for invalid windowStart', () => {
      const publishedAt = new Date('2024-01-15T10:00:00Z');
      const invalidDate = new Date('invalid');
      const windowEnd = new Date('2024-01-31T23:59:59Z');

      expect(() =>
        TemporalContext.withWindow(publishedAt, invalidDate, windowEnd),
      ).toThrow('Invalid windowStart: must be a valid date');
    });

    it('should throw error for invalid windowEnd', () => {
      const publishedAt = new Date('2024-01-15T10:00:00Z');
      const windowStart = new Date('2024-01-01T00:00:00Z');
      const invalidDate = new Date('invalid');

      expect(() =>
        TemporalContext.withWindow(publishedAt, windowStart, invalidDate),
      ).toThrow('Invalid windowEnd: must be a valid date');
    });
  });

  describe('isHistorical', () => {
    it('should return true when eventTimestamp is before publishedAt', () => {
      const publishedAt = new Date('2024-01-15T10:00:00Z');
      const eventTimestamp = new Date('2024-01-10T10:00:00Z');

      const context = TemporalContext.create(publishedAt, eventTimestamp);

      expect(context.isHistorical).toBe(true);
    });

    it('should return false when eventTimestamp is after publishedAt', () => {
      const publishedAt = new Date('2024-01-15T10:00:00Z');
      const eventTimestamp = new Date('2024-01-20T10:00:00Z');

      const context = TemporalContext.create(publishedAt, eventTimestamp);

      expect(context.isHistorical).toBe(false);
    });

    it('should return false when eventTimestamp is null', () => {
      const publishedAt = new Date('2024-01-15T10:00:00Z');

      const context = TemporalContext.create(publishedAt);

      expect(context.isHistorical).toBe(false);
    });

    it('should return false when eventTimestamp equals publishedAt', () => {
      const publishedAt = new Date('2024-01-15T10:00:00Z');
      const eventTimestamp = new Date('2024-01-15T10:00:00Z');

      const context = TemporalContext.create(publishedAt, eventTimestamp);

      expect(context.isHistorical).toBe(false);
    });
  });

  describe('isPredictive', () => {
    it('should return true when eventTimestamp is after publishedAt', () => {
      const publishedAt = new Date('2024-01-15T10:00:00Z');
      const eventTimestamp = new Date('2024-01-20T10:00:00Z');

      const context = TemporalContext.create(publishedAt, eventTimestamp);

      expect(context.isPredictive).toBe(true);
    });

    it('should return false when eventTimestamp is before publishedAt', () => {
      const publishedAt = new Date('2024-01-15T10:00:00Z');
      const eventTimestamp = new Date('2024-01-10T10:00:00Z');

      const context = TemporalContext.create(publishedAt, eventTimestamp);

      expect(context.isPredictive).toBe(false);
    });

    it('should return false when eventTimestamp is null', () => {
      const publishedAt = new Date('2024-01-15T10:00:00Z');

      const context = TemporalContext.create(publishedAt);

      expect(context.isPredictive).toBe(false);
    });

    it('should return false when eventTimestamp equals publishedAt', () => {
      const publishedAt = new Date('2024-01-15T10:00:00Z');
      const eventTimestamp = new Date('2024-01-15T10:00:00Z');

      const context = TemporalContext.create(publishedAt, eventTimestamp);

      expect(context.isPredictive).toBe(false);
    });
  });

  describe('hasWindow', () => {
    it('should return true when both windowStart and windowEnd are defined', () => {
      const publishedAt = new Date('2024-01-15T10:00:00Z');
      const windowStart = new Date('2024-01-01T00:00:00Z');
      const windowEnd = new Date('2024-01-31T23:59:59Z');

      const context = TemporalContext.withWindow(
        publishedAt,
        windowStart,
        windowEnd,
      );

      expect(context.hasWindow).toBe(true);
    });

    it('should return false when window is not defined', () => {
      const publishedAt = new Date('2024-01-15T10:00:00Z');

      const context = TemporalContext.create(publishedAt);

      expect(context.hasWindow).toBe(false);
    });
  });

  describe('getters', () => {
    it('should return correct publishedAt', () => {
      const publishedAt = new Date('2024-01-15T10:00:00Z');
      const context = TemporalContext.create(publishedAt);

      expect(context.publishedAt).toEqual(publishedAt);
    });

    it('should return correct eventTimestamp', () => {
      const publishedAt = new Date('2024-01-15T10:00:00Z');
      const eventTimestamp = new Date('2024-01-10T10:00:00Z');
      const context = TemporalContext.create(publishedAt, eventTimestamp);

      expect(context.eventTimestamp).toEqual(eventTimestamp);
    });

    it('should return null for eventTimestamp when not provided', () => {
      const publishedAt = new Date('2024-01-15T10:00:00Z');
      const context = TemporalContext.create(publishedAt);

      expect(context.eventTimestamp).toBeNull();
    });

    it('should return correct windowStart and windowEnd', () => {
      const publishedAt = new Date('2024-01-15T10:00:00Z');
      const windowStart = new Date('2024-01-01T00:00:00Z');
      const windowEnd = new Date('2024-01-31T23:59:59Z');
      const context = TemporalContext.withWindow(
        publishedAt,
        windowStart,
        windowEnd,
      );

      expect(context.windowStart).toEqual(windowStart);
      expect(context.windowEnd).toEqual(windowEnd);
    });
  });

  describe('toString', () => {
    it('should format context with only publishedAt', () => {
      const publishedAt = new Date('2024-01-15T10:00:00Z');
      const context = TemporalContext.create(publishedAt);

      const result = context.toString();

      expect(result).toBe('published:2024-01-15T10:00:00.000Z');
    });

    it('should format context with publishedAt and eventTimestamp', () => {
      const publishedAt = new Date('2024-01-15T10:00:00Z');
      const eventTimestamp = new Date('2024-01-10T10:00:00Z');
      const context = TemporalContext.create(publishedAt, eventTimestamp);

      const result = context.toString();

      expect(result).toBe(
        'published:2024-01-15T10:00:00.000Z event:2024-01-10T10:00:00.000Z',
      );
    });

    it('should format context with temporal window', () => {
      const publishedAt = new Date('2024-01-15T10:00:00Z');
      const windowStart = new Date('2024-01-01T00:00:00Z');
      const windowEnd = new Date('2024-01-31T23:59:59Z');
      const context = TemporalContext.withWindow(
        publishedAt,
        windowStart,
        windowEnd,
      );

      const result = context.toString();

      expect(result).toBe(
        'published:2024-01-15T10:00:00.000Z window:[2024-01-01T00:00:00.000Z,2024-01-31T23:59:59.000Z]',
      );
    });

    it('should format context with all properties', () => {
      const publishedAt = new Date('2024-01-15T10:00:00Z');
      const windowStart = new Date('2024-01-01T00:00:00Z');
      const windowEnd = new Date('2024-01-31T23:59:59Z');
      const eventTimestamp = new Date('2024-01-10T10:00:00Z');
      const context = TemporalContext.withWindow(
        publishedAt,
        windowStart,
        windowEnd,
        eventTimestamp,
      );

      const result = context.toString();

      expect(result).toBe(
        'published:2024-01-15T10:00:00.000Z event:2024-01-10T10:00:00.000Z window:[2024-01-01T00:00:00.000Z,2024-01-31T23:59:59.000Z]',
      );
    });
  });

  describe('equals', () => {
    it('should return true for identical temporal contexts', () => {
      const publishedAt = new Date('2024-01-15T10:00:00Z');
      const eventTimestamp = new Date('2024-01-10T10:00:00Z');

      const context1 = TemporalContext.create(publishedAt, eventTimestamp);
      const context2 = TemporalContext.create(publishedAt, eventTimestamp);

      expect(context1.equals(context2)).toBe(true);
    });

    it('should return false for different publishedAt dates', () => {
      const publishedAt1 = new Date('2024-01-15T10:00:00Z');
      const publishedAt2 = new Date('2024-01-16T10:00:00Z');

      const context1 = TemporalContext.create(publishedAt1);
      const context2 = TemporalContext.create(publishedAt2);

      expect(context1.equals(context2)).toBe(false);
    });

    it('should return false for different eventTimestamps', () => {
      const publishedAt = new Date('2024-01-15T10:00:00Z');
      const eventTimestamp1 = new Date('2024-01-10T10:00:00Z');
      const eventTimestamp2 = new Date('2024-01-11T10:00:00Z');

      const context1 = TemporalContext.create(publishedAt, eventTimestamp1);
      const context2 = TemporalContext.create(publishedAt, eventTimestamp2);

      expect(context1.equals(context2)).toBe(false);
    });

    it('should return true for identical temporal windows', () => {
      const publishedAt = new Date('2024-01-15T10:00:00Z');
      const windowStart = new Date('2024-01-01T00:00:00Z');
      const windowEnd = new Date('2024-01-31T23:59:59Z');

      const context1 = TemporalContext.withWindow(
        publishedAt,
        windowStart,
        windowEnd,
      );
      const context2 = TemporalContext.withWindow(
        publishedAt,
        windowStart,
        windowEnd,
      );

      expect(context1.equals(context2)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle dates at epoch', () => {
      const publishedAt = new Date(0);
      const context = TemporalContext.create(publishedAt);

      expect(context.publishedAt.getTime()).toBe(0);
    });

    it('should handle very old dates', () => {
      const publishedAt = new Date('1970-01-01T00:00:00Z');
      const eventTimestamp = new Date('1969-12-31T23:59:59Z');

      const context = TemporalContext.create(publishedAt, eventTimestamp);

      expect(context.isHistorical).toBe(true);
    });

    it('should handle dates with milliseconds', () => {
      const publishedAt = new Date('2024-01-15T10:00:00.123Z');
      const eventTimestamp = new Date('2024-01-15T10:00:00.456Z');

      const context = TemporalContext.create(publishedAt, eventTimestamp);

      expect(context.isPredictive).toBe(true);
    });

    it('should handle very close dates in temporal window', () => {
      const publishedAt = new Date('2024-01-15T10:00:00Z');
      const windowStart = new Date('2024-01-15T10:00:00.000Z');
      const windowEnd = new Date('2024-01-15T10:00:00.001Z');

      const context = TemporalContext.withWindow(
        publishedAt,
        windowStart,
        windowEnd,
      );

      expect(context.hasWindow).toBe(true);
    });
  });
});
