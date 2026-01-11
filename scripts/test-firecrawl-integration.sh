#!/bin/bash

# Firecrawl Integration Test Script
# Tests the complete integration between backend and Firecrawl

set -e

echo "🧪 Testing Firecrawl Integration..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

FIRECRAWL_URL="${FIRECRAWL_URL:-http://localhost:3002}"

# Test 1: Health Check
echo -e "${BLUE}Test 1: Health Check${NC}"
response=$(curl -s "${FIRECRAWL_URL}/health")
if echo "$response" | grep -q "ok"; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}✗ Health check failed${NC}"
    exit 1
fi
echo ""

# Test 2: Basic Scrape
echo -e "${BLUE}Test 2: Basic Scrape (example.com)${NC}"
response=$(curl -s -X POST "${FIRECRAWL_URL}/v2/scrape" \
    -H "Content-Type: application/json" \
    -d '{"url": "https://example.com", "formats": ["markdown"]}')

if echo "$response" | grep -q "markdown"; then
    echo -e "${GREEN}✓ Basic scrape passed${NC}"
    echo "Sample output:"
    echo "$response" | jq -r '.data.markdown' | head -n 5
else
    echo -e "${RED}✗ Basic scrape failed${NC}"
    echo "Response: $response"
    exit 1
fi
echo ""

# Test 3: Scrape with HTML format
echo -e "${BLUE}Test 3: Scrape with HTML format${NC}"
response=$(curl -s -X POST "${FIRECRAWL_URL}/v2/scrape" \
    -H "Content-Type: application/json" \
    -d '{"url": "https://example.com", "formats": ["html", "markdown"]}')

if echo "$response" | grep -q "html"; then
    echo -e "${GREEN}✓ HTML scrape passed${NC}"
else
    echo -e "${RED}✗ HTML scrape failed${NC}"
    exit 1
fi
echo ""

# Test 4: Metadata extraction
echo -e "${BLUE}Test 4: Metadata Extraction${NC}"
response=$(curl -s -X POST "${FIRECRAWL_URL}/v2/scrape" \
    -H "Content-Type: application/json" \
    -d '{"url": "https://example.com", "formats": ["markdown"]}')

if echo "$response" | grep -q "metadata"; then
    echo -e "${GREEN}✓ Metadata extraction passed${NC}"
    echo "Metadata:"
    echo "$response" | jq '.data.metadata'
else
    echo -e "${RED}✗ Metadata extraction failed${NC}"
    exit 1
fi
echo ""

# Summary
echo -e "${GREEN}✅ All integration tests passed!${NC}"
echo ""
echo "Firecrawl is fully operational and ready for backend integration."
