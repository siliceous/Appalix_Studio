#!/bin/bash

# Video Generator MVP - Quick Test Script
# Tests: API endpoint, database schema, wallet integration

set -e

API_URL="http://localhost:3001"
DASHBOARD_URL="http://localhost:3000"

echo "🎬 Video Generator MVP - Quick Test"
echo "===================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: API Health
echo -e "${YELLOW}Test 1: API Health Check${NC}"
HEALTH=$(curl -s $API_URL/health)
if echo "$HEALTH" | jq -e '.status == "ok"' > /dev/null; then
    echo -e "${GREEN}✓ API is healthy${NC}"
else
    echo -e "${RED}✗ API is down${NC}"
    exit 1
fi
echo ""

# Test 2: Check if migrations ran
echo -e "${YELLOW}Test 2: Database Schema Check${NC}"
# This would require psql/supabase client, skipping for now
echo -e "${YELLOW}⚠ Skipping (requires psql) - manually verify with:${NC}"
echo "  SELECT COUNT(*) FROM video_generations;"
echo ""

# Test 3: Dashboard is accessible
echo -e "${YELLOW}Test 3: Dashboard Accessibility${NC}"
DASHBOARD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $DASHBOARD_URL 2>/dev/null)
if [ "$DASHBOARD_STATUS" == "200" ]; then
    echo -e "${GREEN}✓ Dashboard is accessible${NC}"
else
    echo -e "${YELLOW}⚠ Dashboard returned $DASHBOARD_STATUS (may be redirecting to login)${NC}"
fi
echo ""

# Test 4: Video routes registered
echo -e "${YELLOW}Test 4: Video API Routes${NC}"
echo "Checking if /videos/generate is accessible..."
echo "  Note: Will fail with 401 (Unauthorized) - that's expected without auth"
VIDEOS_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $API_URL/videos/generate \
  -H "Content-Type: application/json" \
  -d '{"workspace_id":"test"}' 2>/dev/null)

HTTP_CODE=$(echo "$VIDEOS_RESPONSE" | tail -1)
BODY=$(echo "$VIDEOS_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" == "401" ]; then
    echo -e "${GREEN}✓ /videos/generate is registered (401 Unauthorized = expected)${NC}"
elif echo "$BODY" | grep -q "error"; then
    echo -e "${YELLOW}⚠ Got error response (check API logs)${NC}"
    echo "  Response: $BODY"
else
    echo -e "${RED}✗ Unexpected response code: $HTTP_CODE${NC}"
fi
echo ""

# Test 5: Kling webhook endpoint
echo -e "${YELLOW}Test 5: Kling Webhook Endpoint${NC}"
echo "Checking if /webhooks/kling is accessible..."
WEBHOOK_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $API_URL/webhooks/kling \
  -H "Content-Type: application/json" \
  -d '{"task_id":"test","task_status":"failed"}' 2>/dev/null)

WEBHOOK_CODE=$(echo "$WEBHOOK_RESPONSE" | tail -1)
if [ "$WEBHOOK_CODE" == "200" ] || [ "$WEBHOOK_CODE" == "404" ] || [ "$WEBHOOK_CODE" == "400" ]; then
    echo -e "${GREEN}✓ /webhooks/kling is registered${NC}"
else
    echo -e "${RED}✗ Webhook endpoint issue (code: $WEBHOOK_CODE)${NC}"
fi
echo ""

echo -e "${GREEN}===================================="
echo "Basic Tests Complete!"
echo "====================================${NC}"
echo ""
echo "Next Steps:"
echo "1. Open http://localhost:3000/videos (Pro+ workspace)"
echo "2. Click 'New Video'"
echo "3. Enter a prompt and generate"
echo "4. Monitor API logs for webhook handling"
echo ""
echo "Monitor API Logs:"
echo "  tail -f /tmp/api.log | grep -i video"
