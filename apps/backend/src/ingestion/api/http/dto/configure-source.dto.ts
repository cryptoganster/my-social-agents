/**
 * DTO for configuring a content source
 */
export interface ConfigureSourceDto {
  name: string;
  type: string; // WEB_SCRAPER, RSS_FEED, SOCIAL_MEDIA, PDF, OCR, WIKIPEDIA
  config: Record<string, unknown>;
  credentials?: string;
  active?: boolean;
  sourceId?: string; // For updates
}
