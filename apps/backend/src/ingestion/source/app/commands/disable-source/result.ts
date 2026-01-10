/**
 * DisableSourceResult
 *
 * Result of the DisableSourceCommand execution.
 *
 * Requirements: 4.5, 4.6
 */
export class DisableSourceResult {
  constructor(
    public readonly success: boolean,
    public readonly message: string,
    public readonly sourceId?: string,
  ) {}

  static disabled(sourceId: string): DisableSourceResult {
    return new DisableSourceResult(
      true,
      'Source disabled successfully',
      sourceId,
    );
  }

  static notFound(sourceId: string): DisableSourceResult {
    return new DisableSourceResult(false, `Source ${sourceId} not found`);
  }

  static alreadyDisabled(sourceId: string): DisableSourceResult {
    return new DisableSourceResult(
      false,
      `Source ${sourceId} is already disabled`,
      sourceId,
    );
  }
}
