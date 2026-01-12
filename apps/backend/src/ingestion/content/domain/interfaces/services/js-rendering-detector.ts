/**
 * Interface for detecting if a webpage requires JavaScript rendering
 * to properly display its content.
 */
export interface IJsRenderingDetector {
  /**
   * Determines if the given HTML content requires JavaScript rendering
   * based on heuristics such as SPA framework markers, minimal content,
   * and known JS-heavy domains.
   *
   * @param html - The raw HTML content to analyze
   * @param url - The URL of the webpage
   * @returns true if JavaScript rendering is needed, false otherwise
   */
  needsJsRendering(html: string, url: string): boolean;
}
