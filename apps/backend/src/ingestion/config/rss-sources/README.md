# RSS Source Templates

This directory contains predefined RSS source configurations for popular cryptocurrency news sources. These templates provide optimal default values and can be used directly or customized for your needs.

## Available RSS Sources

### CoinTelegraph (`cointelegraph.json`)

- **Feed URL**: https://cointelegraph.com/rss
- **Update Interval**: 3600 seconds (1 hour)
- **Categories**: bitcoin, ethereum, defi, altcoin, blockchain
- **Language**: English (en)
- **Max Items**: 50 per update
- **Timeout**: 30 seconds

### CoinDesk (`coindesk.json`)

- **Feed URL**: https://www.coindesk.com/arc/outboundfeeds/rss/
- **Update Interval**: 3600 seconds (1 hour)
- **Categories**: bitcoin, ethereum, markets, policy, technology
- **Language**: English (en)
- **Max Items**: 50 per update
- **Timeout**: 30 seconds

## Template Fields

### Required Fields

#### `feedUrl` (string)

- **Purpose**: The URL of the RSS/Atom feed
- **Format**: Valid HTTP or HTTPS URL
- **Example**: `"https://example.com/rss"`
- **Validation**: Must be a valid URL starting with http:// or https://

#### `updateInterval` (number)

- **Purpose**: Time in seconds between feed updates
- **Format**: Positive integer
- **Example**: `3600` (1 hour)
- **Validation**: Must be a positive integer greater than 0
- **Recommended**:
  - High-frequency sources: 1800-3600 (30 min - 1 hour)
  - Medium-frequency sources: 3600-7200 (1-2 hours)
  - Low-frequency sources: 7200+ (2+ hours)

### Optional Fields

#### `categories` (array of strings)

- **Purpose**: Content categories to filter or tag
- **Format**: Array of lowercase strings
- **Example**: `["bitcoin", "ethereum", "defi"]`
- **Validation**: Must be an array of strings
- **Usage**: Used for filtering and organizing content

#### `language` (string)

- **Purpose**: Primary language of the feed content
- **Format**: ISO 639-1 two-letter language code
- **Example**: `"en"` (English), `"es"` (Spanish), `"fr"` (French)
- **Validation**: Must be exactly 2 lowercase letters
- **Common codes**:
  - `en` - English
  - `es` - Spanish
  - `fr` - French
  - `de` - German
  - `ja` - Japanese
  - `zh` - Chinese
  - `ko` - Korean

#### `maxItems` (number)

- **Purpose**: Maximum number of items to fetch per update
- **Format**: Positive integer
- **Example**: `50`
- **Validation**: Must be a positive integer greater than 0
- **Recommended**: 20-100 depending on feed frequency and content volume

#### `timeout` (number)

- **Purpose**: Request timeout in milliseconds
- **Format**: Positive integer
- **Example**: `30000` (30 seconds)
- **Validation**: Must be a positive integer greater than 0
- **Recommended**: 15000-60000 (15-60 seconds)

### Metadata Fields

#### `_metadata` (object)

- **Purpose**: Template information for display in CLI
- **Note**: This field is automatically excluded when saving to database
- **Fields**:
  - `name` (string): Human-readable template name
  - `description` (string): Brief description of the template
  - `version` (string, optional): Template version
  - `author` (string, optional): Template author

## Example Configurations

### Minimal Configuration

```json
{
  "feedUrl": "https://example.com/rss",
  "updateInterval": 3600
}
```

### Full Configuration

```json
{
  "_metadata": {
    "name": "My Custom Feed",
    "description": "Custom RSS feed for crypto news",
    "version": "1.0.0"
  },
  "feedUrl": "https://example.com/rss",
  "updateInterval": 3600,
  "categories": ["bitcoin", "ethereum"],
  "language": "en",
  "maxItems": 50,
  "timeout": 30000
}
```

## Validation Rules

### URL Validation

- Must start with `http://` or `https://`
- Must be a valid URL format
- Should be accessible and return RSS/Atom content

### Integer Validation

- `updateInterval`: Must be > 0
- `maxItems`: Must be > 0
- `timeout`: Must be > 0

### Language Code Validation

- Must be exactly 2 characters
- Must be lowercase letters only
- Should follow ISO 639-1 standard

### Categories Validation

- Must be an array
- Each element must be a string
- Recommended to use lowercase for consistency

## Adding New RSS Sources

To add a new RSS source configuration:

1. **Create a new JSON file** in this directory (`rss-sources/`)
   - Use a descriptive filename (e.g., `bitcoin-magazine.json`)
   - Use lowercase with hyphens for multi-word names

2. **Include required fields**:

   ```json
   {
     "feedUrl": "https://your-source.com/rss",
     "updateInterval": 3600
   }
   ```

3. **Add metadata** for CLI display:

   ```json
   {
     "_metadata": {
       "name": "Your Source Name",
       "description": "Brief description of the source"
     },
     "feedUrl": "https://your-source.com/rss",
     "updateInterval": 3600
   }
   ```

4. **Add optional fields** as needed:
   - Categories relevant to the source
   - Language code if not English
   - Custom maxItems or timeout if defaults aren't suitable

5. **Test the configuration**:
   - Verify the feed URL is accessible
   - Check that the feed returns valid RSS/Atom content
   - Test with the CLI to ensure it loads correctly

## Generic Templates

Generic templates are stored in `../templates/` directory and provide reusable starting points for custom configurations. The main difference:

- **RSS Sources** (`rss-sources/`): Specific, ready-to-use configurations for known sources
- **Generic Templates** (`templates/`): Reusable templates with placeholder values

## Troubleshooting

### "Template file not found"

- Check that the file exists in the `rss-sources/` directory
- Verify the filename matches exactly (case-sensitive)
- Ensure the file has `.json` extension

### "Invalid JSON in template"

- Validate JSON syntax using a JSON validator
- Check for missing commas, brackets, or quotes
- Ensure all strings are properly quoted

### "Missing required fields"

- Verify `feedUrl` is present
- Verify `updateInterval` is present
- Check field names are spelled correctly (case-sensitive)

### "Invalid value for feedUrl"

- Ensure URL starts with `http://` or `https://`
- Check for typos in the URL
- Verify the URL is accessible

### "Invalid value for language"

- Use ISO 639-1 two-letter codes only
- Ensure lowercase letters only
- Common mistake: using `eng` instead of `en`

### "Invalid value for updateInterval"

- Must be a positive integer
- Cannot be 0 or negative
- Remove quotes if present (should be a number, not a string)

## Best Practices

1. **Update Intervals**: Choose appropriate intervals based on source update frequency
   - Don't poll too frequently (respect source servers)
   - Don't poll too infrequently (miss timely content)

2. **Categories**: Use consistent, lowercase category names
   - Helps with filtering and organization
   - Makes it easier to query content later

3. **Timeouts**: Set reasonable timeouts
   - Too short: May fail on slow connections
   - Too long: Blocks other operations

4. **Testing**: Always test new configurations
   - Verify feed URL is accessible
   - Check content is being ingested correctly
   - Monitor for errors in logs

5. **Documentation**: Add clear metadata
   - Helps users understand the source
   - Makes templates easier to discover and use

## Related Documentation

- **Generic Templates**: See `../templates/README.md` for generic template documentation
- **CLI Usage**: See main ingestion CLI documentation for usage instructions
- **Source Adapters**: See adapter documentation for RSS feed adapter details
