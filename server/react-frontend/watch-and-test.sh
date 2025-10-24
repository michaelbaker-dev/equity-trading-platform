#!/bin/bash

# Continuous Testing Script for Development
# Watches for changes and runs relevant tests automatically

echo "👁️  Equity Trading Platform - Continuous Testing"
echo "============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check dependencies
check_dependencies() {
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is required but not installed${NC}"
        exit 1
    fi
    
    if [ ! -d "node_modules/puppeteer" ]; then
        echo -e "${YELLOW}📦 Installing Puppeteer...${NC}"
        npm install puppeteer
    fi
    
    if ! curl -s http://localhost:5173 > /dev/null; then
        echo -e "${RED}❌ React app not running on port 5173${NC}"
        echo "Please start it with: npm run dev"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All dependencies ready${NC}"
}

# Run specific test based on changed file
run_relevant_test() {
    local changed_file=$1
    echo -e "\n${BLUE}File changed: $changed_file${NC}"
    
    # Determine which test to run
    if [[ $changed_file == *"watchlist"* ]]; then
        echo -e "${YELLOW}Running watchlist tests...${NC}"
        node test-suites/watchlist-full-test.cjs --headed
    elif [[ $changed_file == *"websocket"* ]] || [[ $changed_file == *"useWebSocket"* ]]; then
        echo -e "${YELLOW}Running WebSocket tests...${NC}"
        node test-suites/websocket-test.cjs --headed
    else
        echo -e "${YELLOW}Running quick smoke test...${NC}"
        ./run-functional-tests.sh quick
    fi
    
    echo -e "${GREEN}Test run complete${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Main watch loop
main() {
    check_dependencies
    
    echo -e "\n${BLUE}🔍 Watching for changes...${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}\n"
    
    # Initial test run
    echo -e "${YELLOW}Running initial test suite...${NC}"
    ./run-functional-tests.sh quick
    echo -e "\n${GREEN}Ready for development!${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Watch for changes using fswatch or inotifywait
    if command -v fswatch &> /dev/null; then
        # macOS with fswatch
        fswatch -o src/ test-suites/ | while read num ; do
            run_relevant_test "src/component"
        done
    elif command -v inotifywait &> /dev/null; then
        # Linux with inotify-tools
        while true; do
            inotifywait -r -e modify,create,delete src/ test-suites/ 2>/dev/null | while read path action file; do
                if [[ "$file" =~ \.(js|jsx|ts|tsx)$ ]]; then
                    run_relevant_test "$path$file"
                fi
            done
        done
    else
        # Fallback: Simple polling
        echo -e "${YELLOW}Note: Install fswatch (Mac) or inotify-tools (Linux) for better performance${NC}"
        
        last_modified=$(find src test-suites -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" | xargs stat -f "%m" 2>/dev/null | sort -n | tail -1)
        
        while true; do
            sleep 2
            current_modified=$(find src test-suites -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" | xargs stat -f "%m" 2>/dev/null | sort -n | tail -1)
            
            if [ "$current_modified" != "$last_modified" ]; then
                run_relevant_test "file"
                last_modified=$current_modified
            fi
        done
    fi
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${YELLOW}Stopping continuous testing...${NC}"; exit 0' INT

# Run main function
main