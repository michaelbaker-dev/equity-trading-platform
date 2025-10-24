#!/bin/bash

# Run functional tests for the watchlist feature

echo "🧪 Running Functional Tests for Watchlist"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
TOTAL=0
PASSED=0
FAILED=0

# Function to run a test and track results
run_test() {
    local test_file=$1
    local test_name=$(basename "$test_file" .test.json)
    
    echo -n "Running $test_name... "
    TOTAL=$((TOTAL + 1))
    
    # Run the test and capture output
    output=$(claude-test run "$test_file" 2>&1)
    exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ PASSED${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAILED${NC}"
        FAILED=$((FAILED + 1))
        echo "  Error: $(echo "$output" | grep -E "failed:|Error:" | head -1)"
    fi
}

# Check if claude-test is available
if ! command -v claude-test &> /dev/null; then
    echo -e "${RED}Error: claude-test command not found${NC}"
    echo "Please ensure the global Puppeteer testing framework is installed"
    exit 1
fi

# Check if the frontend is running
if ! curl -s http://localhost:5173/ > /dev/null; then
    echo -e "${YELLOW}Warning: Frontend doesn't appear to be running on http://localhost:5173/${NC}"
    echo "Starting the frontend might be required for tests to pass"
    echo ""
fi

# Run each test
echo "Running individual tests:"
echo "------------------------"

# Basic tests
run_test "puppeteer-tests/functional/watchlist-websocket-check.test.json"
run_test "puppeteer-tests/functional/watchlist-delete-improved.test.json"
run_test "puppeteer-tests/functional/watchlist-add-improved.test.json"

# Additional tests if they exist
for test_file in puppeteer-tests/functional/*.test.json; do
    if [[ -f "$test_file" ]] && \
       [[ "$test_file" != *"websocket-check"* ]] && \
       [[ "$test_file" != *"delete-improved"* ]] && \
       [[ "$test_file" != *"add-improved"* ]]; then
        run_test "$test_file"
    fi
done

echo ""
echo "Test Summary"
echo "============"
echo -e "Total Tests: $TOTAL"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"

# Generate summary report
echo ""
echo "Generating test report..."
report_file="puppeteer-reports/functional-test-summary-$(date +%Y%m%d-%H%M%S).txt"
mkdir -p puppeteer-reports

cat > "$report_file" << EOF
Functional Test Report
Generated: $(date)

Test Results:
- Total: $TOTAL
- Passed: $PASSED  
- Failed: $FAILED
- Success Rate: $(( PASSED * 100 / TOTAL ))%

Key Findings:
EOF

# Check for specific issues
if grep -q "Disconnected" puppeteer-screenshots/current/*.png 2>/dev/null; then
    echo "- WebSocket connection issue detected (shows 'Disconnected')" >> "$report_file"
fi

echo ""
echo -e "Report saved to: ${YELLOW}$report_file${NC}"

# Exit with appropriate code
if [ $FAILED -gt 0 ]; then
    exit 1
else
    exit 0
fi