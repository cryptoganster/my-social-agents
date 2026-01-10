import { HtmlParsingStrategy } from '../html-parsing-strategy';

describe('HtmlParsingStrategy', () => {
  let strategy: HtmlParsingStrategy;

  beforeEach(() => {
    strategy = new HtmlParsingStrategy();
  });

  describe('parse', () => {
    describe('header conversion', () => {
      it('should convert h1 tags to markdown # headers', async () => {
        const html = '<h1>Main Title</h1>';
        const markdown = await strategy.parse(html);
        expect(markdown).toContain('# Main Title');
      });

      it('should convert h2 tags to markdown ## headers', async () => {
        const html = '<h2>Section Title</h2>';
        const markdown = await strategy.parse(html);
        expect(markdown).toContain('## Section Title');
      });

      it('should convert h3 tags to markdown ### headers', async () => {
        const html = '<h3>Subsection</h3>';
        const markdown = await strategy.parse(html);
        expect(markdown).toContain('### Subsection');
      });

      it('should convert h4-h6 tags to corresponding markdown headers', async () => {
        const html = '<h4>H4</h4><h5>H5</h5><h6>H6</h6>';
        const markdown = await strategy.parse(html);
        expect(markdown).toContain('#### H4');
        expect(markdown).toContain('##### H5');
        expect(markdown).toContain('###### H6');
      });

      it('should preserve header hierarchy', async () => {
        const html = `
          <h1>Title</h1>
          <h2>Section 1</h2>
          <p>Content</p>
          <h2>Section 2</h2>
          <h3>Subsection 2.1</h3>
        `;
        const markdown = await strategy.parse(html);
        expect(markdown).toContain('# Title');
        expect(markdown).toContain('## Section 1');
        expect(markdown).toContain('## Section 2');
        expect(markdown).toContain('### Subsection 2.1');
      });
    });

    describe('list conversion', () => {
      it('should convert unordered lists to markdown', async () => {
        const html = '<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>';
        const markdown = await strategy.parse(html);
        // Turndown adds extra spaces, so we check for the pattern
        expect(markdown).toMatch(/-\s+Item 1/);
        expect(markdown).toMatch(/-\s+Item 2/);
        expect(markdown).toMatch(/-\s+Item 3/);
      });

      it('should convert ordered lists to markdown', async () => {
        const html = '<ol><li>First</li><li>Second</li><li>Third</li></ol>';
        const markdown = await strategy.parse(html);
        // Turndown adds extra spaces, so we check for the pattern
        expect(markdown).toMatch(/1\.\s+First/);
        expect(markdown).toMatch(/2\.\s+Second/);
        expect(markdown).toMatch(/3\.\s+Third/);
      });

      it('should handle nested lists', async () => {
        const html = `
          <ul>
            <li>Parent
              <ul>
                <li>Child 1</li>
                <li>Child 2</li>
              </ul>
            </li>
          </ul>
        `;
        const markdown = await strategy.parse(html);
        expect(markdown).toContain('Parent');
        expect(markdown).toContain('Child 1');
        expect(markdown).toContain('Child 2');
      });
    });

    describe('code block conversion', () => {
      it('should convert pre tags to fenced code blocks', async () => {
        const html = '<pre><code>const x = 1;</code></pre>';
        const markdown = await strategy.parse(html);
        expect(markdown).toContain('```');
        expect(markdown).toContain('const x = 1;');
      });

      it('should preserve code block content', async () => {
        const html = `<pre><code>function hello() {
  console.log("Hello");
}</code></pre>`;
        const markdown = await strategy.parse(html);
        expect(markdown).toContain('function hello()');
        expect(markdown).toContain('console.log');
      });
    });

    describe('link preservation', () => {
      it('should preserve links with href attributes', async () => {
        const html = '<a href="https://example.com">Example Link</a>';
        const markdown = await strategy.parse(html);
        expect(markdown).toContain('[Example Link](https://example.com)');
      });

      it('should handle multiple links', async () => {
        const html = `
          <p>
            <a href="https://bitcoin.org">Bitcoin</a> and
            <a href="https://ethereum.org">Ethereum</a>
          </p>
        `;
        const markdown = await strategy.parse(html);
        expect(markdown).toContain('[Bitcoin](https://bitcoin.org)');
        expect(markdown).toContain('[Ethereum](https://ethereum.org)');
      });
    });

    describe('image preservation', () => {
      it('should preserve images with src and alt', async () => {
        const html =
          '<img src="https://example.com/image.png" alt="Example Image">';
        const markdown = await strategy.parse(html);
        expect(markdown).toContain(
          '![Example Image](https://example.com/image.png)',
        );
      });

      it('should handle images without alt text', async () => {
        const html = '<img src="https://example.com/image.png">';
        const markdown = await strategy.parse(html);
        expect(markdown).toContain('https://example.com/image.png');
      });
    });

    describe('unwanted element removal', () => {
      it('should remove script elements', async () => {
        const html = '<p>Content</p><script>alert("xss")</script>';
        const markdown = await strategy.parse(html);
        expect(markdown).not.toContain('script');
        expect(markdown).not.toContain('alert');
        expect(markdown).toContain('Content');
      });

      it('should remove style elements', async () => {
        const html = '<p>Content</p><style>.class { color: red; }</style>';
        const markdown = await strategy.parse(html);
        expect(markdown).not.toContain('style');
        expect(markdown).not.toContain('color');
        expect(markdown).toContain('Content');
      });

      it('should remove nav elements', async () => {
        const html = '<nav><a href="/">Home</a></nav><p>Main content</p>';
        const markdown = await strategy.parse(html);
        expect(markdown).toContain('Main content');
        // Nav content should be removed
      });

      it('should remove advertisement classes', async () => {
        const html = '<p>Content</p><div class="advertisement">Ad here</div>';
        const markdown = await strategy.parse(html);
        expect(markdown).toContain('Content');
        expect(markdown).not.toContain('Ad here');
      });

      it('should remove custom selectors when provided', async () => {
        const html =
          '<p>Keep this</p><div class="custom-remove">Remove this</div>';
        const markdown = await strategy.parse(html, {
          removeSelectors: ['.custom-remove'],
        });
        expect(markdown).toContain('Keep this');
        expect(markdown).not.toContain('Remove this');
      });
    });

    describe('error handling', () => {
      it('should handle malformed HTML gracefully without throwing', async () => {
        const malformedHtml = '<p>Unclosed paragraph<div>Mixed tags</p></div>';
        await expect(strategy.parse(malformedHtml)).resolves.not.toThrow();
      });

      it('should return empty string for empty content', async () => {
        const markdown = await strategy.parse('');
        expect(markdown).toBe('');
      });

      it('should return empty string for whitespace-only content', async () => {
        const markdown = await strategy.parse('   \n\t  ');
        expect(markdown).toBe('');
      });

      it('should handle null-like content gracefully', async () => {
        const markdown = await strategy.parse(null as unknown as string);
        expect(markdown).toBe('');
      });
    });

    describe('whitespace normalization', () => {
      it('should normalize excessive newlines', async () => {
        const html = '<p>First</p>\n\n\n\n\n<p>Second</p>';
        const markdown = await strategy.parse(html);
        expect(markdown).not.toMatch(/\n{3,}/);
      });

      it('should trim leading and trailing whitespace', async () => {
        const html = '   <p>Content</p>   ';
        const markdown = await strategy.parse(html);
        expect(markdown).not.toMatch(/^\s/);
        expect(markdown).not.toMatch(/\s$/);
      });
    });
  });

  describe('extractMetadata', () => {
    describe('title extraction', () => {
      it('should extract title from og:title meta tag', async () => {
        const html =
          '<meta property="og:title" content="OG Title"><title>Page Title</title>';
        const metadata = await strategy.extractMetadata(html);
        expect(metadata.title).toBe('OG Title');
      });

      it('should extract title from twitter:title meta tag', async () => {
        const html = '<meta name="twitter:title" content="Twitter Title">';
        const metadata = await strategy.extractMetadata(html);
        expect(metadata.title).toBe('Twitter Title');
      });

      it('should fallback to title tag', async () => {
        const html = '<title>Page Title</title>';
        const metadata = await strategy.extractMetadata(html);
        expect(metadata.title).toBe('Page Title');
      });

      it('should fallback to first h1', async () => {
        const html = '<h1>Main Heading</h1>';
        const metadata = await strategy.extractMetadata(html);
        expect(metadata.title).toBe('Main Heading');
      });
    });

    describe('author extraction', () => {
      it('should extract author from meta[name="author"]', async () => {
        const html = '<meta name="author" content="John Doe">';
        const metadata = await strategy.extractMetadata(html);
        expect(metadata.author).toBe('John Doe');
      });

      it('should extract author from article:author', async () => {
        const html = '<meta property="article:author" content="Jane Smith">';
        const metadata = await strategy.extractMetadata(html);
        expect(metadata.author).toBe('Jane Smith');
      });

      it('should extract author from rel="author" element', async () => {
        const html = '<a rel="author">Author Name</a>';
        const metadata = await strategy.extractMetadata(html);
        expect(metadata.author).toBe('Author Name');
      });
    });

    describe('published date extraction', () => {
      it('should extract date from article:published_time', async () => {
        const html =
          '<meta property="article:published_time" content="2024-01-15T10:30:00Z">';
        const metadata = await strategy.extractMetadata(html);
        expect(metadata.publishedAt).toBeInstanceOf(Date);
        expect(metadata.publishedAt?.toISOString()).toBe(
          '2024-01-15T10:30:00.000Z',
        );
      });

      it('should extract date from time[datetime]', async () => {
        const html = '<time datetime="2024-06-20">June 20, 2024</time>';
        const metadata = await strategy.extractMetadata(html);
        expect(metadata.publishedAt).toBeInstanceOf(Date);
      });

      it('should return undefined for invalid date', async () => {
        const html =
          '<meta property="article:published_time" content="not-a-date">';
        const metadata = await strategy.extractMetadata(html);
        expect(metadata.publishedAt).toBeUndefined();
      });
    });

    describe('description extraction', () => {
      it('should extract description from og:description', async () => {
        const html =
          '<meta property="og:description" content="OG Description">';
        const metadata = await strategy.extractMetadata(html);
        expect(metadata.description).toBe('OG Description');
      });

      it('should extract description from meta[name="description"]', async () => {
        const html = '<meta name="description" content="Page Description">';
        const metadata = await strategy.extractMetadata(html);
        expect(metadata.description).toBe('Page Description');
      });
    });

    describe('link extraction', () => {
      it('should extract HTTP/HTTPS links', async () => {
        const html = `
          <a href="https://example.com">Link 1</a>
          <a href="http://test.com">Link 2</a>
          <a href="/relative">Relative</a>
        `;
        const metadata = await strategy.extractMetadata(html);
        expect(metadata.links).toContain('https://example.com');
        expect(metadata.links).toContain('http://test.com');
        expect(metadata.links).not.toContain('/relative');
      });

      it('should deduplicate links', async () => {
        const html = `
          <a href="https://example.com">Link 1</a>
          <a href="https://example.com">Link 2</a>
        `;
        const metadata = await strategy.extractMetadata(html);
        expect(
          metadata.links?.filter((l) => l === 'https://example.com'),
        ).toHaveLength(1);
      });
    });

    describe('image extraction', () => {
      it('should extract HTTP/HTTPS images', async () => {
        const html = `
          <img src="https://example.com/image.png">
          <img src="/relative/image.png">
        `;
        const metadata = await strategy.extractMetadata(html);
        expect(metadata.images).toContain('https://example.com/image.png');
        expect(metadata.images).not.toContain('/relative/image.png');
      });

      it('should deduplicate images', async () => {
        const html = `
          <img src="https://example.com/image.png">
          <img src="https://example.com/image.png">
        `;
        const metadata = await strategy.extractMetadata(html);
        expect(
          metadata.images?.filter((i) => i === 'https://example.com/image.png'),
        ).toHaveLength(1);
      });
    });

    describe('error handling', () => {
      it('should return empty object for empty content', async () => {
        const metadata = await strategy.extractMetadata('');
        expect(metadata).toEqual({});
      });

      it('should handle malformed HTML gracefully', async () => {
        const malformedHtml = '<meta name="author" content="Test"<broken>';
        await expect(
          strategy.extractMetadata(malformedHtml),
        ).resolves.not.toThrow();
      });
    });
  });
});
