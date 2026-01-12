import { IJsRenderingDetector } from '../interfaces/services/js-rendering-detector';

/**
 * Domain service for detecting if a webpage requires JavaScript rendering
 * to properly display its content.
 *
 * Uses multiple heuristics:
 * 1. Known JS-heavy domains (TradingView, DexScreener, etc.)
 * 2. SPA framework markers (Next.js, React, Angular, Vue)
 * 3. Minimal content detection (< 500 chars after parsing)
 */
export class JsRenderingDetector implements IJsRenderingDetector {
  private readonly jsHeavyDomains = [
    'tradingview.com',
    'dexscreener.com',
    'coingecko.com',
    'coinmarketcap.com',
  ];

  private readonly spaMarkers = [
    '__NEXT_DATA__', // Next.js
    'data-reactroot', // React
    'ng-app', // Angular
    'data-v-', // Vue
    '__NUXT__', // Nuxt.js
  ];

  /**
   * Determines if the given HTML content requires JavaScript rendering
   * based on heuristics such as SPA framework markers, minimal content,
   * and known JS-heavy domains.
   *
   * @param html - The raw HTML content to analyze
   * @param url - The URL of the webpage
   * @returns true if JavaScript rendering is needed, false otherwise
   */
  needsJsRendering(html: string, url: string): boolean {
    // 1. Check known JS-heavy domains
    if (this.jsHeavyDomains.some((d) => url.includes(d))) {
      return true;
    }

    // 2. Check for SPA framework markers with minimal content
    if (this.spaMarkers.some((marker) => html.includes(marker))) {
      const textContent = this.extractTextContent(html);
      if (textContent.length < 500) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extracts text content from HTML by removing tags and normalizing whitespace
   *
   * @param html - The HTML content to extract text from
   * @returns The extracted text content
   */
  private extractTextContent(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
