#!/bin/bash

# Firecrawl Service Verification Script
# This script verifies that Firecrawl is running correctly

set -e

echo "🔍 Verifying Firecrawl Service..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
FIRECRAWL_URL="${FIRECRAWL_URL:-http://localhost:3002}"
TIMEOUT=5

# Function to check if service is running
check_service() {
    local service_name=$1
    local url=$2
    
    echo -n "Checking ${service_name}... "
    
    if curl -f -s --max-time $TIMEOUT "${url}" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        return 1
    fi
}

# Function to test scrape endpoint
test_scrape() {
    echo -n "Testing scrape endpoint... "
    
    response=$(curl -s --max-time 30 -X POST "${FIRECRAWL_URL}/v2/scrape" \
        -H "Content-Type: application/json" \
        -d '{"url": "https://example.com", "formats": ["markdown"]}' 2>&1)
    
    if echo "$response" | grep -q "markdown"; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Main verification
echo "1. Checking Firecrawl API health..."
check_service "Firecrawl API" "${FIRECRAWL_URL}/health"
echo ""

echo "2. Testing scrape functionality..."
test_scrape
echo ""

echo -e "${GREEN}✅ All checks passed!${NC}"
echo ""
echo "Firecrawl is ready to use at: ${FIRECRAWL_URL}"
echo "Admin panel: ${FIRECRAWL_URL}/admin/YOUR_BULL_AUTH_KEY/queues"
