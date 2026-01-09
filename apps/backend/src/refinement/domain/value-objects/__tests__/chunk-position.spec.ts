import { ChunkPosition } from '@refinement/domain/value-objects/chunk-position';

describe('ChunkPosition', () => {
  describe('create', () => {
    it('should create a valid ChunkPosition', () => {
      const position = ChunkPosition.create(0, 0, 100);

      expect(position.index).toBe(0);
      expect(position.startOffset).toBe(0);
      expect(position.endOffset).toBe(100);
      expect(position.length).toBe(100);
    });

    it('should create ChunkPosition with non-zero index', () => {
      const position = ChunkPosition.create(5, 500, 800);

      expect(position.index).toBe(5);
      expect(position.startOffset).toBe(500);
      expect(position.endOffset).toBe(800);
      expect(position.length).toBe(300);
    });

    it('should throw error if index is negative', () => {
      expect(() => ChunkPosition.create(-1, 0, 100)).toThrow(
        'Invalid index: must be a non-negative integer (>= 0)',
      );
    });

    it('should throw error if index is not an integer', () => {
      expect(() => ChunkPosition.create(1.5, 0, 100)).toThrow(
        'Invalid index: must be a non-negative integer (>= 0)',
      );
    });

    it('should throw error if startOffset is negative', () => {
      expect(() => ChunkPosition.create(0, -1, 100)).toThrow(
        'Invalid startOffset: must be a non-negative integer (>= 0)',
      );
    });

    it('should throw error if startOffset is not an integer', () => {
      expect(() => ChunkPosition.create(0, 0.5, 100)).toThrow(
        'Invalid startOffset: must be a non-negative integer (>= 0)',
      );
    });

    it('should throw error if endOffset is negative', () => {
      expect(() => ChunkPosition.create(0, 0, -1)).toThrow(
        'Invalid endOffset: must be a non-negative integer (>= 0)',
      );
    });

    it('should throw error if endOffset is not an integer', () => {
      expect(() => ChunkPosition.create(0, 0, 100.5)).toThrow(
        'Invalid endOffset: must be a non-negative integer (>= 0)',
      );
    });

    it('should throw error if endOffset equals startOffset', () => {
      expect(() => ChunkPosition.create(0, 100, 100)).toThrow(
        'Invalid position: endOffset must be greater than startOffset',
      );
    });

    it('should throw error if endOffset is less than startOffset', () => {
      expect(() => ChunkPosition.create(0, 100, 50)).toThrow(
        'Invalid position: endOffset must be greater than startOffset',
      );
    });
  });

  describe('getters', () => {
    it('should return correct index', () => {
      const position = ChunkPosition.create(3, 300, 600);
      expect(position.index).toBe(3);
    });

    it('should return correct startOffset', () => {
      const position = ChunkPosition.create(0, 100, 200);
      expect(position.startOffset).toBe(100);
    });

    it('should return correct endOffset', () => {
      const position = ChunkPosition.create(0, 100, 200);
      expect(position.endOffset).toBe(200);
    });

    it('should calculate correct length', () => {
      const position = ChunkPosition.create(0, 100, 350);
      expect(position.length).toBe(250);
    });

    it('should calculate length for zero-based position', () => {
      const position = ChunkPosition.create(0, 0, 100);
      expect(position.length).toBe(100);
    });
  });

  describe('isBefore', () => {
    it('should return true when this position comes before other', () => {
      const position1 = ChunkPosition.create(0, 0, 100);
      const position2 = ChunkPosition.create(1, 100, 200);

      expect(position1.isBefore(position2)).toBe(true);
    });

    it('should return false when this position comes after other', () => {
      const position1 = ChunkPosition.create(1, 100, 200);
      const position2 = ChunkPosition.create(0, 0, 100);

      expect(position1.isBefore(position2)).toBe(false);
    });

    it('should return false when positions have same index', () => {
      const position1 = ChunkPosition.create(0, 0, 100);
      const position2 = ChunkPosition.create(0, 100, 200);

      expect(position1.isBefore(position2)).toBe(false);
    });
  });

  describe('isAfter', () => {
    it('should return true when this position comes after other', () => {
      const position1 = ChunkPosition.create(1, 100, 200);
      const position2 = ChunkPosition.create(0, 0, 100);

      expect(position1.isAfter(position2)).toBe(true);
    });

    it('should return false when this position comes before other', () => {
      const position1 = ChunkPosition.create(0, 0, 100);
      const position2 = ChunkPosition.create(1, 100, 200);

      expect(position1.isAfter(position2)).toBe(false);
    });

    it('should return false when positions have same index', () => {
      const position1 = ChunkPosition.create(0, 0, 100);
      const position2 = ChunkPosition.create(0, 100, 200);

      expect(position1.isAfter(position2)).toBe(false);
    });
  });

  describe('isAdjacentTo', () => {
    it('should return true when this chunk ends where other starts', () => {
      const position1 = ChunkPosition.create(0, 0, 100);
      const position2 = ChunkPosition.create(1, 100, 200);

      expect(position1.isAdjacentTo(position2)).toBe(true);
    });

    it('should return true when other chunk ends where this starts', () => {
      const position1 = ChunkPosition.create(1, 100, 200);
      const position2 = ChunkPosition.create(0, 0, 100);

      expect(position1.isAdjacentTo(position2)).toBe(true);
    });

    it('should return false when chunks have gap between them', () => {
      const position1 = ChunkPosition.create(0, 0, 100);
      const position2 = ChunkPosition.create(1, 150, 250);

      expect(position1.isAdjacentTo(position2)).toBe(false);
    });

    it('should return false when chunks overlap', () => {
      const position1 = ChunkPosition.create(0, 0, 150);
      const position2 = ChunkPosition.create(1, 100, 200);

      expect(position1.isAdjacentTo(position2)).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for positions with same values', () => {
      const position1 = ChunkPosition.create(0, 0, 100);
      const position2 = ChunkPosition.create(0, 0, 100);

      expect(position1.equals(position2)).toBe(true);
    });

    it('should return false for positions with different index', () => {
      const position1 = ChunkPosition.create(0, 0, 100);
      const position2 = ChunkPosition.create(1, 0, 100);

      expect(position1.equals(position2)).toBe(false);
    });

    it('should return false for positions with different startOffset', () => {
      const position1 = ChunkPosition.create(0, 0, 100);
      const position2 = ChunkPosition.create(0, 50, 100);

      expect(position1.equals(position2)).toBe(false);
    });

    it('should return false for positions with different endOffset', () => {
      const position1 = ChunkPosition.create(0, 0, 100);
      const position2 = ChunkPosition.create(0, 0, 150);

      expect(position1.equals(position2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return formatted string representation', () => {
      const position = ChunkPosition.create(2, 200, 500);
      const str = position.toString();

      expect(str).toContain('index=2');
      expect(str).toContain('start=200');
      expect(str).toContain('end=500');
      expect(str).toContain('length=300');
    });
  });

  describe('immutability', () => {
    it('should not allow modification of properties', () => {
      const position = ChunkPosition.create(0, 0, 100);

      expect(() => {
        // @ts-expect-error - Testing immutability
        position.index = 5;
      }).toThrow();
    });

    it('should create independent instances', () => {
      const position1 = ChunkPosition.create(0, 0, 100);
      const position2 = ChunkPosition.create(1, 100, 200);

      expect(position1.index).toBe(0);
      expect(position2.index).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle large offset values', () => {
      const position = ChunkPosition.create(0, 1000000, 2000000);

      expect(position.startOffset).toBe(1000000);
      expect(position.endOffset).toBe(2000000);
      expect(position.length).toBe(1000000);
    });

    it('should handle single character chunk', () => {
      const position = ChunkPosition.create(0, 0, 1);

      expect(position.length).toBe(1);
    });

    it('should handle high index values', () => {
      const position = ChunkPosition.create(999, 0, 100);

      expect(position.index).toBe(999);
    });
  });
});
