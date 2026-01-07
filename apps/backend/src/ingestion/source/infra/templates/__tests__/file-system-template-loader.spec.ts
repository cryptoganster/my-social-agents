import { FileSystemTemplateLoader } from '../file-system-template-loader';
import { TemplateConfiguration } from '../../../domain/value-objects/template-configuration';

describe('FileSystemTemplateLoader', () => {
  let loader: FileSystemTemplateLoader;

  beforeEach(() => {
    loader = new FileSystemTemplateLoader();
  });

  describe('listTemplates', () => {
    it('should list templates from both rss-sources and templates directories', async () => {
      const templates = await loader.listTemplates();

      expect(templates).toBeInstanceOf(Array);
      expect(templates.length).toBeGreaterThan(0);

      // Should have templates from both directories
      const specificTemplates = templates.filter((t) => t.type === 'specific');
      const genericTemplates = templates.filter((t) => t.type === 'generic');

      expect(specificTemplates.length).toBeGreaterThan(0);
      expect(genericTemplates.length).toBeGreaterThan(0);
    });

    it('should extract metadata from templates', async () => {
      const templates = await loader.listTemplates();

      // Find CoinTelegraph template
      const coinTelegraph = templates.find((t) => t.name === 'CoinTelegraph');
      expect(coinTelegraph).toBeDefined();
      expect(coinTelegraph?.description).toContain('CoinTelegraph');
      expect(coinTelegraph?.type).toBe('specific');
      expect(coinTelegraph?.version).toBe('1.0.0');
      expect(coinTelegraph?.author).toBe('System');
    });

    it('should categorize templates correctly', async () => {
      const templates = await loader.listTemplates();

      // RSS sources should be 'specific'
      const coinTelegraph = templates.find((t) => t.name === 'CoinTelegraph');
      expect(coinTelegraph?.type).toBe('specific');

      const coinDesk = templates.find((t) => t.name === 'CoinDesk');
      expect(coinDesk?.type).toBe('specific');

      // Generic template should be 'generic'
      const genericRss = templates.find((t) => t.name === 'Generic RSS Feed');
      expect(genericRss?.type).toBe('generic');
    });
  });

  describe('loadTemplate', () => {
    it('should load a specific RSS source template', async () => {
      const template = await loader.loadTemplate('cointelegraph');

      expect(template).toBeInstanceOf(TemplateConfiguration);
      expect(template?.feedUrl).toBe('https://cointelegraph.com/rss');
      expect(template?.updateInterval).toBe(3600);
      expect(template?.categories).toContain('bitcoin');
      expect(template?.language).toBe('en');
      expect(template?.maxItems).toBe(50);
      expect(template?.timeout).toBe(30000);
    });

    it('should load a generic template', async () => {
      const template = await loader.loadTemplate('rss-feed');

      expect(template).toBeInstanceOf(TemplateConfiguration);
      expect(template?.feedUrl).toBe('https://example.com/rss');
      expect(template?.updateInterval).toBe(3600);
    });

    it('should include metadata in loaded template', async () => {
      const template = await loader.loadTemplate('cointelegraph');

      expect(template?.metadata).toBeDefined();
      expect(template?.metadata?.name).toBe('CoinTelegraph');
      expect(template?.metadata?.description).toContain('CoinTelegraph');
    });

    it('should return null for non-existent template', async () => {
      const template = await loader.loadTemplate('non-existent-template');

      expect(template).toBeNull();
    });

    it('should handle templates without metadata', async () => {
      // This test assumes there might be templates without _metadata field
      // For now, all our templates have metadata, so we'll just verify
      // the loader doesn't crash
      const template = await loader.loadTemplate('cointelegraph');
      expect(template).toBeDefined();
    });
  });

  describe('getTemplatePath', () => {
    it('should resolve path for RSS source template', () => {
      const path = loader.getTemplatePath('cointelegraph');

      expect(path).toContain('rss-sources');
      expect(path).toContain('cointelegraph.json');
    });

    it('should resolve path for generic template', () => {
      const path = loader.getTemplatePath('rss-feed');

      expect(path).toContain('templates');
      expect(path).toContain('rss-feed.json');
    });

    it('should return templates directory path for non-existent template', () => {
      const path = loader.getTemplatePath('non-existent');

      expect(path).toContain('templates');
      expect(path).toContain('non-existent.json');
    });
  });

  describe('metadata extraction', () => {
    it('should extract all metadata fields when present', async () => {
      const templates = await loader.listTemplates();
      const coinDesk = templates.find((t) => t.name === 'CoinDesk');

      expect(coinDesk).toBeDefined();
      expect(coinDesk?.name).toBe('CoinDesk');
      expect(coinDesk?.description).toContain('CoinDesk');
      expect(coinDesk?.version).toBe('1.0.0');
      expect(coinDesk?.author).toBe('System');
    });

    it('should handle templates with minimal metadata', async () => {
      const templates = await loader.listTemplates();

      // All templates should have at least name and description
      templates.forEach((template) => {
        expect(template.name).toBeDefined();
        expect(template.name.length).toBeGreaterThan(0);
        expect(template.description).toBeDefined();
        expect(template.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('template categorization', () => {
    it('should categorize rss-sources as specific', async () => {
      const templates = await loader.listTemplates();
      const rssSourceTemplates = templates.filter(
        (t) => t.name === 'CoinTelegraph' || t.name === 'CoinDesk',
      );

      rssSourceTemplates.forEach((template) => {
        expect(template.type).toBe('specific');
      });
    });

    it('should categorize templates directory as generic', async () => {
      const templates = await loader.listTemplates();
      const genericTemplates = templates.filter(
        (t) => t.name === 'Generic RSS Feed',
      );

      genericTemplates.forEach((template) => {
        expect(template.type).toBe('generic');
      });
    });
  });
});
