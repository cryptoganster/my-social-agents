/**
 * Abstract base class for Value Objects in the domain layer.
 *
 * Value Objects are immutable objects that represent descriptive aspects of the domain
 * with no conceptual identity. They are defined by their attributes rather than a unique ID.
 *
 * @template T - The type of the properties object
 */
export abstract class ValueObject<T> {
  /**
   * Protected constructor enforces use of static factory methods.
   * Freezes the object to ensure immutability.
   *
   * @param props - The properties object for this Value Object
   */
  protected constructor(protected readonly props: T) {
    Object.freeze(this);
  }

  /**
   * Hook for subclasses to implement validation logic.
   * Called automatically during construction.
   * Should throw Error with descriptive message if validation fails.
   */
  protected abstract validate(): void;

  /**
   * Compares this Value Object with another for equality.
   * Uses deep comparison of all properties.
   *
   * @param other - The Value Object to compare with
   * @returns true if all properties are equal
   */
  public equals(other: ValueObject<T>): boolean {
    if (other === null || other === undefined) {
      return false;
    }

    if (other.constructor !== this.constructor) {
      return false;
    }

    return this.deepEquals(this.props, other.props);
  }

  /**
   * Deep equality comparison for nested objects and arrays.
   * Handles Date objects, arrays, and nested objects.
   *
   * @param a - First value to compare
   * @param b - Second value to compare
   * @returns true if values are deeply equal
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private deepEquals(a: any, b: any): boolean {
    // Handle null/undefined
    if (a === b) return true;
    if (a == null || b == null) return false;

    // Handle Date objects
    if (a instanceof Date && b instanceof Date) {
      const timeA = a.getTime();
      const timeB = b.getTime();
      // Handle NaN dates (invalid dates)
      if (Number.isNaN(timeA) && Number.isNaN(timeB)) {
        return true;
      }
      return timeA === timeB;
    }

    // Handle arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return a.every((val, idx) => this.deepEquals(val, b[idx]));
    }

    // Handle objects
    if (typeof a === 'object' && typeof b === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const keysA = Object.keys(a);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const keysB = Object.keys(b);

      if (keysA.length !== keysB.length) return false;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
      return keysA.every((key) => this.deepEquals(a[key], b[key]));
    }

    // Handle primitives (including number comparison with epsilon for floats)
    if (typeof a === 'number' && typeof b === 'number') {
      // Handle NaN case: NaN should equal NaN
      if (Number.isNaN(a) && Number.isNaN(b)) {
        return true;
      }
      // Handle regular number comparison with epsilon
      return Math.abs(a - b) < Number.EPSILON;
    }

    return a === b;
  }

  /**
   * Returns a plain object representation of this Value Object.
   * Useful for serialization and persistence.
   *
   * @returns A shallow copy of the properties object
   */
  public toObject(): T {
    return { ...this.props };
  }
}
