/**
 * UpdateSourceHealthCommand
 *
 * Command to update source health metrics based on job outcomes.
 * Tracks success/failure rates and consecutive failures to determine
 * source reliability.
 *
 * Requirements: 4.1-4.7
 */
export class UpdateSourceHealthCommand {
  constructor(
    public readonly sourceId: string,
    public readonly jobOutcome: 'success' | 'failure',
    public readonly metrics?: {
      itemsCollected: number;
      duration: number;
    },
  ) {}
}
