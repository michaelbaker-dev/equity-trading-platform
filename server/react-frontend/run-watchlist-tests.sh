#!/bin/bash

# Watchlist Test Runner using claude-test
# This script runs the watchlist functional tests

echo "🧪 Watchlist Test Runner"
echo "======================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if server is running
echo "Checking if application is running..."
if curl -s http://localhost:5173 > /dev/null; then
    echo -e "${GREEN}✅ Application is running on port 5173${NC}"
else
    echo -e "${RED}❌ Application not running on http://localhost:5173${NC}"
    echo "Please start the React development server first:"
    echo "  cd server/react-frontend && npm run dev"
    exit 1
fi

# Parse arguments
MODE=""
for arg in "$@"; do
    case $arg in
        --headed)
            MODE="--headed"
            ;;
        --help)
            echo "Usage: ./run-watchlist-tests.sh [options]"
            echo ""
            echo "Options:"
            echo "  --headed    Run tests with visible browser"
            echo "  --help      Show this help message"
            exit 0
            ;;
    esac
done

# Function to run a single test
run_test() {
    local test_file=$1
    local test_name=$(basename "$test_file" .test.json)
    
    echo -e "\n${BLUE}Running: ${test_name}${NC}"
    echo "Command: claude-test run \"$test_file\" $MODE"
    
    # Run the test and capture output
    if claude-test run "$test_file" $MODE; then
        echo -e "${GREEN}✅ PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        return 1
    fi
}

# Main test execution
echo -e "\n${YELLOW}Running Watchlist Tests${NC}"
echo "======================"

TOTAL=0
PASSED=0

# Core watchlist tests
echo -e "\n${YELLOW}Core Watchlist Tests:${NC}"

# Test 1: Framework verification
TOTAL=$((TOTAL + 1))
if run_test "puppeteer-tests/functional/00-verify-framework.test.json"; then
    PASSED=$((PASSED + 1))
fi

# Test 2: Delete stock
TOTAL=$((TOTAL + 1))
if run_test "puppeteer-tests/functional/watchlist-delete-stock.test.json"; then
    PASSED=$((PASSED + 1))
fi

# Test 3: Add stock
TOTAL=$((TOTAL + 1))
if run_test "puppeteer-tests/functional/watchlist-add-apple.test.json"; then
    PASSED=$((PASSED + 1))
fi

# Test 4: Stock selection
TOTAL=$((TOTAL + 1))
if run_test "puppeteer-tests/functional/watchlist-select-stocks.test.json"; then
    PASSED=$((PASSED + 1))
fi

# Summary
echo -e "\n${BLUE}Test Summary${NC}"
echo "============"
echo -e "Total Tests: $TOTAL"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$((TOTAL - PASSED))${NC}"
echo -e "Success Rate: $(( PASSED * 100 / TOTAL ))%"

# Check screenshots
echo -e "\n${YELLOW}Screenshots:${NC}"
if [ -d "puppeteer-screenshots" ]; then
    screenshot_count=$(ls -1 puppeteer-screenshots/*.png 2>/dev/null | wc -l)
    echo "Found $screenshot_count screenshots in puppeteer-screenshots/"
else
    echo "No screenshots directory found"
fi

# Exit with appropriate code
if [ $PASSED -eq $TOTAL ]; then
    echo -e "\n${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}Some tests failed!${NC}"
    exit 1
fi