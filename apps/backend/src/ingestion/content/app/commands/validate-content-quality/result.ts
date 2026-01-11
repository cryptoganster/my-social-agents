/**
 * ValidateContentQualityResult
 *
 * Result of the ValidateContentQualityCommand.
 * Contains validation status, errors (if any), and quality score.
 */
export class ValidateContentQualityResult {
  constructor(
    public readonly isValid: boolean,
    public readonly errors: string[],
    public readonly qualityScore: number,
    public readonly validatedAt: Date,
  ) {}
}
