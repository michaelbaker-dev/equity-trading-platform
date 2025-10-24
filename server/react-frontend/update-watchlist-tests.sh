#!/bin/bash

# Update watchlist tests to work around navigation timeout issue

echo "Updating watchlist tests to work with React SPA..."
echo "=============================================="

# Create working watchlist tests based on what we've learned

# Test 1: Framework verification without navigation
cat > puppeteer-tests/functional/00-verify-framework.test.json << 'EOF'
{
  "name": "Verify Claude-Test Framework",
  "description": "Verify framework works with React app",
  "url": "http://localhost:5173",
  "steps": [
    {
      "action": "wait",
      "time": 3000,
      "description": "Wait for React app to load"
    },
    {
      "action": "waitForSelector",
      "selector": ".watchlist-panel",
      "timeout": 5000,
      "description": "Wait for watchlist panel"
    },
    {
      "action": "screenshot",
      "filename": "framework-test.png"
    },
    {
      "action": "evaluate",
      "expression": "document.title",
      "storeAs": "pageTitle"
    },
    {
      "assert": "variable",
      "name": "pageTitle",
      "equals": "Equity Trading Platform"
    }
  ]
}
EOF

# Test 2: Delete stock with dialog handling
cat > puppeteer-tests/functional/watchlist-delete-stock.test.json << 'EOF'
{
  "name": "Delete Stock from Watchlist",
  "description": "Test removing MSFT stock with confirmation dialog",
  "url": "http://localhost:5173",
  "steps": [
    {
      "action": "wait",
      "time": 3000,
      "description": "Wait for app to load"
    },
    {
      "action": "waitForSelector",
      "selector": ".watchlist-item",
      "timeout": 5000
    },
    {
      "action": "page-on",
      "event": "dialog",
      "handler": "accept",
      "description": "Set up dialog handler"
    },
    {
      "action": "screenshot",
      "filename": "before-delete.png"
    },
    {
      "action": "hover",
      "selector": "div.watchlist-item:has(span:text('MSFT'))",
      "description": "Hover over MSFT"
    },
    {
      "action": "wait",
      "time": 500
    },
    {
      "action": "click",
      "selector": "div.watchlist-item:has(span:text('MSFT')) button.delete-btn",
      "description": "Click delete button"
    },
    {
      "action": "wait",
      "time": 2000
    },
    {
      "action": "screenshot",
      "filename": "after-delete.png"
    }
  ]
}
EOF

# Test 3: Add stock
cat > puppeteer-tests/functional/watchlist-add-apple.test.json << 'EOF'
{
  "name": "Add Apple Stock to Watchlist",
  "description": "Search and add AAPL to watchlist",
  "url": "http://localhost:5173",
  "steps": [
    {
      "action": "wait",
      "time": 3000,
      "description": "Wait for app to load"
    },
    {
      "action": "waitForSelector",
      "selector": ".watchlist-panel",
      "timeout": 5000
    },
    {
      "action": "screenshot",
      "filename": "initial-watchlist.png"
    },
    {
      "action": "click",
      "selector": "button[aria-label='Add Stock']",
      "description": "Open add stock modal"
    },
    {
      "action": "waitForSelector",
      "selector": "#stock-search-input",
      "timeout": 5000
    },
    {
      "action": "fill",
      "selector": "#stock-search-input",
      "value": "AAPL"
    },
    {
      "action": "wait",
      "time": 3000,
      "description": "Wait for search results"
    },
    {
      "action": "screenshot",
      "filename": "search-results.png"
    },
    {
      "action": "click",
      "selector": ".search-result-item:first-child button",
      "description": "Click add on first result"
    },
    {
      "action": "wait",
      "time": 2000
    },
    {
      "action": "screenshot",
      "filename": "after-add.png"
    }
  ]
}
EOF

# Test 4: Stock selection
cat > puppeteer-tests/functional/watchlist-select-stocks.test.json << 'EOF'
{
  "name": "Select Different Stocks",
  "description": "Test stock selection and panel updates",
  "url": "http://localhost:5173",
  "steps": [
    {
      "action": "wait",
      "time": 3000,
      "description": "Wait for app to load"
    },
    {
      "action": "waitForSelector",
      "selector": ".watchlist-item",
      "timeout": 5000
    },
    {
      "action": "screenshot",
      "filename": "initial-state.png"
    },
    {
      "action": "click",
      "selector": ".watchlist-item:first-child",
      "description": "Select first stock"
    },
    {
      "action": "wait",
      "time": 2000
    },
    {
      "action": "screenshot",
      "filename": "first-stock-selected.png"
    },
    {
      "action": "click",
      "selector": ".watchlist-item:nth-child(2)",
      "description": "Select second stock"
    },
    {
      "action": "wait",
      "time": 2000
    },
    {
      "action": "screenshot",
      "filename": "second-stock-selected.png"
    }
  ]
}
EOF

echo ""
echo "✅ Tests updated to work around navigation timeout"
echo ""
echo "Changes made:"
echo "- Removed explicit goto actions (rely on url field)"
echo "- Added longer initial wait for React app"
echo "- Added waitForSelector before interactions"
echo "- Updated storeAs to match self-test format"