import * as fc from 'fast-check';
import { ValueObject } from '../value-object';

/**
 * Test Value Object implementation for testing purposes
 */
interface TestVOProps {
  stringField: string;
  numberField: number;
  booleanField: boolean;
  dateField?: Date;
  arrayField?: string[];
  nestedObject?: {
    nested1: string;
    nested2: number;
  };
}

class TestVO extends ValueObject<TestVOProps> {
  private constructor(props: TestVOProps) {
    super(props);
    this.validate();
  }

  static create(props: TestVOProps): TestVO {
    return new TestVO(props);
  }

  protected validate(): void {
    if (!this.props.stringField) {
      throw new Error('stringField is required');
    }
  }

  get stringField(): string {
    return this.props.stringField;
  }

  get numberField(): number {
    return this.props.numberField;
  }

  get booleanField(): boolean {
    return this.props.booleanField;
  }
}

describe('ValueObject', () => {
  describe('Property-Based Tests', () => {
    /**
     * Feature: shared-kernel-value-objects, Property 1: Equality Reflexivity and Symmetry
     * Validates: Requirements 1.2, 2.5
     */
    describe('Property 1: Equality Reflexivity and Symmetry', () => {
      it('should satisfy reflexivity: vo.equals(vo) === true', () => {
        fc.assert(
          fc.property(
            fc.record({
              stringField: fc.string({ minLength: 1 }),
              numberField: fc.float(),
              booleanField: fc.boolean(),
              dateField: fc.option(fc.date(), { nil: undefined }),
              arrayField: fc.option(fc.array(fc.string()), { nil: undefined }),
              nestedObject: fc.option(
                fc.record({
                  nested1: fc.string(),
                  nested2: fc.integer(),
                }),
                { nil: undefined },
              ),
            }),
            (props) => {
              const vo = TestVO.create(props);
              return vo.equals(vo);
            },
          ),
          { numRuns: 100 },
        );
      });

      it('should satisfy symmetry: vo1.equals(vo2) === vo2.equals(vo1)', () => {
        fc.assert(
          fc.property(
            fc.record({
              stringField: fc.string({ minLength: 1 }),
              numberField: fc.float(),
              booleanField: fc.boolean(),
              dateField: fc.option(fc.date(), { nil: undefined }),
              arrayField: fc.option(fc.array(fc.string()), { nil: undefined }),
              nestedObject: fc.option(
                fc.record({
                  nested1: fc.string(),
                  nested2: fc.integer(),
                }),
                { nil: undefined },
              ),
            }),
            (props) => {
              const vo1 = TestVO.create(props);
              const vo2 = TestVO.create(props);
              return vo1.equals(vo2) === vo2.equals(vo1);
            },
          ),
          { numRuns: 100 },
        );
      });

      it('should handle nested objects correctly', () => {
        fc.assert(
          fc.property(
            fc.record({
              stringField: fc.string({ minLength: 1 }),
              numberField: fc.float(),
              booleanField: fc.boolean(),
              nestedObject: fc.record({
                nested1: fc.string(),
                nested2: fc.integer(),
              }),
            }),
            (props) => {
              const vo1 = TestVO.create(props);
              const vo2 = TestVO.create(props);
              return vo1.equals(vo2) && vo2.equals(vo1);
            },
          ),
          { numRuns: 100 },
        );
      });

      it('should handle arrays correctly', () => {
        fc.assert(
          fc.property(
            fc.record({
              stringField: fc.string({ minLength: 1 }),
              numberField: fc.float(),
              booleanField: fc.boolean(),
              arrayField: fc.array(fc.string()),
            }),
            (props) => {
              const vo1 = TestVO.create(props);
              const vo2 = TestVO.create(props);
              return vo1.equals(vo2) && vo2.equals(vo1);
            },
          ),
          { numRuns: 100 },
        );
      });

      it('should handle Date objects correctly', () => {
        fc.assert(
          fc.property(
            fc.record({
              stringField: fc.string({ minLength: 1 }),
              numberField: fc.float(),
              booleanField: fc.boolean(),
              dateField: fc.date(),
            }),
            (props) => {
              const vo1 = TestVO.create(props);
              const vo2 = TestVO.create(props);
              return vo1.equals(vo2) && vo2.equals(vo1);
            },
          ),
          { numRuns: 100 },
        );
      });
    });

    /**
     * Feature: shared-kernel-value-objects, Property 2: Equality Transitivity
     * Validates: Requirements 1.2
     */
    describe('Property 2: Equality Transitivity', () => {
      it('should satisfy transitivity: if vo1.equals(vo2) and vo2.equals(vo3), then vo1.equals(vo3)', () => {
        fc.assert(
          fc.property(
            fc.record({
              stringField: fc.string({ minLength: 1 }),
              numberField: fc.float(),
              booleanField: fc.boolean(),
              dateField: fc.option(fc.date(), { nil: undefined }),
              arrayField: fc.option(fc.array(fc.string()), { nil: undefined }),
              nestedObject: fc.option(
                fc.record({
                  nested1: fc.string(),
                  nested2: fc.integer(),
                }),
                { nil: undefined },
              ),
            }),
            (props) => {
              const vo1 = TestVO.create(props);
              const vo2 = TestVO.create(props);
              const vo3 = TestVO.create(props);

              const vo1EqualsVo2 = vo1.equals(vo2);
              const vo2EqualsVo3 = vo2.equals(vo3);
              const vo1EqualsVo3 = vo1.equals(vo3);

              // If vo1 equals vo2 and vo2 equals vo3, then vo1 must equal vo3
              return !vo1EqualsVo2 || !vo2EqualsVo3 || vo1EqualsVo3;
            },
          ),
          { numRuns: 100 },
        );
      });
    });

    /**
     * Feature: shared-kernel-value-objects, Property 3: Serialization Round-Trip
     * Validates: Requirements 2.2
     */
    describe('Property 3: Serialization Round-Trip', () => {
      it('should preserve equality after toObject() → create() round-trip', () => {
        fc.assert(
          fc.property(
            fc.record({
              stringField: fc.string({ minLength: 1 }),
              numberField: fc.float(),
              booleanField: fc.boolean(),
              dateField: fc.option(fc.date(), { nil: undefined }),
              arrayField: fc.option(fc.array(fc.string()), { nil: undefined }),
              nestedObject: fc.option(
                fc.record({
                  nested1: fc.string(),
                  nested2: fc.integer(),
                }),
                { nil: undefined },
              ),
            }),
            (props) => {
              const original = TestVO.create(props);
              const serialized = original.toObject();
              const deserialized = TestVO.create(serialized);

              return original.equals(deserialized);
            },
          ),
          { numRuns: 100 },
        );
      });
    });
  });

  describe('Unit Tests - Edge Cases', () => {
    /**
     * Different Test Value Object for testing type inequality
     */
    class DifferentVO extends ValueObject<{ field: string }> {
      private constructor(props: { field: string }) {
        super(props);
        this.validate();
      }

      static create(props: { field: string }): DifferentVO {
        return new DifferentVO(props);
      }

      protected validate(): void {
        if (!this.props.field) {
          throw new Error('field is required');
        }
      }
    }

    describe('equals() edge cases', () => {
      it('should return false when comparing with null', () => {
        const vo = TestVO.create({
          stringField: 'test',
          numberField: 42,
          booleanField: true,
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
        expect(vo.equals(null as any)).toBe(false);
      });

      it('should return false when comparing with undefined', () => {
        const vo = TestVO.create({
          stringField: 'test',
          numberField: 42,
          booleanField: true,
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
        expect(vo.equals(undefined as any)).toBe(false);
      });

      it('should return false when comparing different VO types', () => {
        const testVO = TestVO.create({
          stringField: 'test',
          numberField: 42,
          booleanField: true,
        });

        const differentVO = DifferentVO.create({
          field: 'test',
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
        expect(testVO.equals(differentVO as any)).toBe(false);
      });

      it('should return false when properties differ', () => {
        const vo1 = TestVO.create({
          stringField: 'test1',
          numberField: 42,
          booleanField: true,
        });

        const vo2 = TestVO.create({
          stringField: 'test2',
          numberField: 42,
          booleanField: true,
        });

        expect(vo1.equals(vo2)).toBe(false);
      });
    });

    describe('Object.freeze() immutability', () => {
      it('should freeze the Value Object instance', () => {
        const vo = TestVO.create({
          stringField: 'test',
          numberField: 42,
          booleanField: true,
        });

        expect(Object.isFrozen(vo)).toBe(true);
      });

      it('should prevent modification of the instance', () => {
        const vo = TestVO.create({
          stringField: 'test',
          numberField: 42,
          booleanField: true,
        });

        // Attempting to add a new property should throw in strict mode
        expect(() => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
          (vo as any).newProperty = 'value';
        }).toThrow(TypeError);
      });
    });

    describe('toObject() returns a copy', () => {
      it('should return a shallow copy of props', () => {
        const vo = TestVO.create({
          stringField: 'test',
          numberField: 42,
          booleanField: true,
        });

        const obj1 = vo.toObject();
        const obj2 = vo.toObject();

        // Should be equal but not the same reference
        expect(obj1).toEqual(obj2);
        expect(obj1).not.toBe(obj2);
      });

      it('should allow modification of returned object without affecting VO', () => {
        const vo = TestVO.create({
          stringField: 'test',
          numberField: 42,
          booleanField: true,
        });

        const obj = vo.toObject();
        obj.stringField = 'modified';

        // Original VO should be unchanged
        expect(vo.stringField).toBe('test');
        expect(obj.stringField).toBe('modified');
      });
    });

    describe('NaN handling', () => {
      it('should consider two NaN values as equal', () => {
        const vo1 = TestVO.create({
          stringField: 'test',
          numberField: NaN,
          booleanField: true,
        });

        const vo2 = TestVO.create({
          stringField: 'test',
          numberField: NaN,
          booleanField: true,
        });

        expect(vo1.equals(vo2)).toBe(true);
      });

      it('should handle NaN in round-trip serialization', () => {
        const original = TestVO.create({
          stringField: 'test',
          numberField: NaN,
          booleanField: true,
        });

        const serialized = original.toObject();
        const deserialized = TestVO.create(serialized);

        expect(original.equals(deserialized)).toBe(true);
      });
    });
  });
});
