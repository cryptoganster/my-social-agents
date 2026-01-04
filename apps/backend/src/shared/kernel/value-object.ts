/**
 * Abstract base class for Value Objects in the domain layer.
 *
 * Value Objects are immutable objects that represent descriptive aspects of the domain
 * with no conceptual identity. They are defined by their attributes rather than a unique ID.
 *
 * ## Key Characteristics
 * - **Immutability**: Once created, cannot be changed
 * - **Value Equality**: Two VOs are equal if all properties are equal
 * - **Self-Validating**: Validates its own invariants
 * - **No Identity**: Unlike Entities, VOs have no unique identifier
 *
 * ## Usage Example
 *
 * ```typescript
 * // 1. Define properties interface
 * export interface EmailProps {
 *   address: string;
 * }
 *
 * // 2. Extend ValueObject
 * export class Email extends ValueObject<EmailProps> {
 *   // 3. Private constructor
 *   private constructor(props: EmailProps) {
 *     super(props);
 *     this.validate();
 *   }
 *
 *   // 4. Implement validation
 *   protected validate(): void {
 *     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 *     if (!emailRegex.test(this.props.address)) {
 *       throw new Error('Invalid email address format');
 *     }
 *   }
 *
 *   // 5. Static factory method
 *   static create(address: string): Email {
 *     return new Email({ address: address.toLowerCase() });
 *   }
 *
 *   // 6. Getters
 *   get address(): string {
 *     return this.props.address;
 *   }
 *
 *   // 7. Domain methods (return new instances)
 *   withDomain(newDomain: string): Email {
 *     const [localPart] = this.props.address.split('@');
 *     return Email.create(`${localPart}@${newDomain}`);
 *   }
 * }
 *
 * // Usage
 * const email1 = Email.create('user@example.com');
 * const email2 = Email.create('user@example.com');
 * console.log(email1.equals(email2)); // true (value equality)
 * console.log(email1 === email2);     // false (different instances)
 * ```
 *
 * ## What You Get for Free
 * - **Immutability**: Object.freeze() prevents modification
 * - **Deep Equality**: equals() with support for nested objects, arrays, Dates
 * - **Serialization**: toObject() returns plain object representation
 * - **Type Safety**: Generic type parameter ensures compile-time safety
 *
 * @template T - The type of the properties object
 *
 * @see {@link https://martinfowler.com/bliki/ValueObject.html} for more on Value Objects
 */
export abstract class ValueObject<T> {
  /**
   * Protected constructor enforces use of static factory methods.
   * Freezes the object to ensure immutability.
   *
   * **Important**: Always call this from your subclass constructor:
   * ```typescript
   * private constructor(props: MyProps) {
   *   super(props);      // Call parent constructor
   *   this.validate();   // Then validate
   * }
   * ```
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
   *
   * **Example**:
   * ```typescript
   * protected validate(): void {
   *   if (!this.props.email) {
   *     throw new Error('Email is required');
   *   }
   *   if (this.props.email.length > 255) {
   *     throw new Error('Email must be at most 255 characters');
   *   }
   *   if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.props.email)) {
   *     throw new Error('Invalid email format');
   *   }
   * }
   * ```
   *
   * **Rules**:
   * - Throw descriptive errors for invalid states
   * - Validate ALL invariants
   * - Keep validation pure (no side effects, no dependencies)
   * - If validation requires external data, use a Domain Service instead
   */
  protected abstract validate(): void;

  /**
   * Compares this Value Object with another for equality.
   * Uses deep comparison of all properties.
   *
   * **Example**:
   * ```typescript
   * const money1 = Money.create(100, 'USD');
   * const money2 = Money.create(100, 'USD');
   * const money3 = Money.create(100, 'EUR');
   *
   * console.log(money1.equals(money2)); // true (same values)
   * console.log(money1.equals(money3)); // false (different currency)
   * console.log(money1 === money2);     // false (different instances)
   * ```
   *
   * **Handles**:
   * - Null/undefined (returns false)
   * - Different types (returns false)
   * - Nested objects (deep comparison)
   * - Arrays (element-by-element comparison)
   * - Dates (compares timestamps)
   * - Numbers (with epsilon for floating point)
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
   * **Example**:
   * ```typescript
   * const address = Address.create({
   *   street: '123 Main St',
   *   city: 'Springfield',
   *   zipCode: '12345'
   * });
   *
   * const obj = address.toObject();
   * // { street: '123 Main St', city: 'Springfield', zipCode: '12345' }
   *
   * // Can be used for JSON serialization
   * const json = JSON.stringify(address.toObject());
   *
   * // Or for database persistence
   * await repository.save(address.toObject());
   * ```
   *
   * **Note**: Returns a shallow copy to prevent external mutation of internal state.
   *
   * @returns A shallow copy of the properties object
   */
  public toObject(): T {
    return { ...this.props };
  }
}
