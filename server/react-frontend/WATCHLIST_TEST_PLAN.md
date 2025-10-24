# Comprehensive Watchlist Testing Plan

## Overview
This test plan covers all user interactions with the watchlist feature using the `claude-test` framework capabilities.

## Testing Framework Capabilities Used

### 1. **Functional Testing** (`claude-test run`)
- JSON-based test definitions
- Automated user interactions
- Screenshot capture at key points
- Step-by-step execution with debugging options

### 2. **Visual Regression Testing** (`claude-test visual-test`)
- Capture baseline screenshots
- Compare against future runs
- Detect unintended UI changes

### 3. **Application Analysis** (`claude-test analyze`)
- Discover all interactive elements
- Map application structure
- Identify testable components

### 4. **Test Generation** (`claude-test generate-functional`)
- Auto-generate test cases
- Create boilerplate test JSON

## User Journey Test Scenarios

### Phase 1: Initial State & Navigation
```json
{
  "name": "01-watchlist-initial-state",
  "description": "Verify watchlist loads with default stocks",
  "steps": [
    { "action": "goto", "url": "http://localhost:5173/" },
    { "action": "wait", "time": 3000 },
    { "action": "screenshot", "name": "initial-watchlist" },
    { "action": "exists", "selector": ".watchlist-panel" },
    { "action": "exists", "selector": ".watchlist-item" },
    { "action": "count", "selector": ".watchlist-item", "saveAs": "stockCount" }
  ]
}
```

### Phase 2: Stock Selection & Price Display
```json
{
  "name": "02-stock-selection",
  "description": "User selects different stocks to view details",
  "steps": [
    { "action": "click", "selector": ".watchlist-item:nth-child(1)" },
    { "action": "wait", "time": 2000 },
    { "action": "screenshot", "name": "first-stock-selected" },
    { "action": "exists", "selector": ".stock-detail-panel" },
    { "action": "exists", "selector": ".order-book-panel" },
    { "action": "click", "selector": ".watchlist-item:nth-child(2)" },
    { "action": "wait", "time": 2000 },
    { "action": "screenshot", "name": "second-stock-selected" },
    { "action": "click", "selector": ".watchlist-item:nth-child(3)" },
    { "action": "wait", "time": 2000 },
    { "action": "screenshot", "name": "third-stock-selected" }
  ]
}
```

### Phase 3: Add Stock Workflow
```json
{
  "name": "03-add-stock",
  "description": "User adds a new stock to watchlist",
  "steps": [
    { "action": "click", "selector": "button[aria-label='Add Stock']" },
    { "action": "waitForSelector", "selector": ".modal" },
    { "action": "screenshot", "name": "add-stock-modal" },
    { "action": "fill", "selector": "input[type='search']", "value": "Apple" },
    { "action": "wait", "time": 3000 },
    { "action": "screenshot", "name": "search-results" },
    { "action": "click", "selector": "button:text('Add'):first" },
    { "action": "wait", "time": 2000 },
    { "action": "press", "key": "Escape" },
    { "action": "screenshot", "name": "stock-added" }
  ]
}
```

### Phase 4: Remove Stock Workflow
```json
{
  "name": "04-remove-stock",
  "description": "User removes a stock from watchlist",
  "steps": [
    { "action": "hover", "selector": ".watchlist-item:first-child" },
    { "action": "wait", "time": 500 },
    { "action": "screenshot", "name": "delete-button-visible" },
    { "action": "click", "selector": ".watchlist-item:first-child button.delete-btn" },
    { "action": "wait", "time": 2000 },
    { "action": "screenshot", "name": "stock-removed" }
  ]
}
```

### Phase 5: Real-Time Updates
```json
{
  "name": "05-realtime-updates",
  "description": "Verify real-time price updates",
  "steps": [
    { "action": "screenshot", "name": "prices-initial" },
    { "action": "wait", "time": 30000 },
    { "action": "screenshot", "name": "prices-after-30s" },
    { "action": "wait", "time": 30000 },
    { "action": "screenshot", "name": "prices-after-60s" }
  ]
}
```

### Phase 6: Tab Filtering
```json
{
  "name": "06-tab-filtering",
  "description": "User filters watchlist by tabs",
  "steps": [
    { "action": "click", "selector": "button:text('All')" },
    { "action": "screenshot", "name": "all-stocks" },
    { "action": "click", "selector": "button:text('Stocks')" },
    { "action": "wait", "time": 1000 },
    { "action": "screenshot", "name": "stocks-only" },
    { "action": "click", "selector": "button:text('ETFs')" },
    { "action": "wait", "time": 1000 },
    { "action": "screenshot", "name": "etfs-only" },
    { "action": "click", "selector": "button:text('Favorites')" },
    { "action": "wait", "time": 1000 },
    { "action": "screenshot", "name": "favorites-only" }
  ]
}
```

### Phase 7: Search Within Watchlist
```json
{
  "name": "07-watchlist-search",
  "description": "User searches within watchlist",
  "steps": [
    { "action": "click", "selector": "#search-watchlist-btn" },
    { "action": "waitForSelector", "selector": "input.watchlist-search" },
    { "action": "fill", "selector": "input.watchlist-search", "value": "MS" },
    { "action": "wait", "time": 1000 },
    { "action": "screenshot", "name": "filtered-results" },
    { "action": "fill", "selector": "input.watchlist-search", "value": "" },
    { "action": "screenshot", "name": "search-cleared" }
  ]
}
```

### Phase 8: Sorting Options
```json
{
  "name": "08-sorting",
  "description": "User sorts watchlist",
  "steps": [
    { "action": "click", "selector": "#sort-watchlist-btn" },
    { "action": "click", "selector": "option:text('Price')" },
    { "action": "screenshot", "name": "sorted-by-price" },
    { "action": "click", "selector": "#sort-watchlist-btn" },
    { "action": "click", "selector": "option:text('% Change')" },
    { "action": "screenshot", "name": "sorted-by-change" }
  ]
}
```

### Phase 9: Data Persistence
```json
{
  "name": "09-persistence",
  "description": "Verify watchlist persists after reload",
  "steps": [
    { "action": "screenshot", "name": "before-reload" },
    { "action": "reload" },
    { "action": "wait", "time": 3000 },
    { "action": "screenshot", "name": "after-reload" },
    { "action": "count", "selector": ".watchlist-item", "saveAs": "reloadedCount" }
  ]
}
```

### Phase 10: Error Handling
```json
{
  "name": "10-error-handling",
  "description": "Test error scenarios",
  "steps": [
    { "action": "click", "selector": "button[aria-label='Add Stock']" },
    { "action": "fill", "selector": "input[type='search']", "value": "INVALID123" },
    { "action": "wait", "time": 3000 },
    { "action": "screenshot", "name": "no-results" },
    { "action": "exists", "selector": ".search-no-results" }
  ]
}
```

## Visual Regression Test Suite

```bash
# Capture baseline screenshots
claude-test visual-test http://localhost:5173 \
  --viewport=1920x1080 \
  --viewport=1366x768 \
  --viewport=375x667 \
  --viewport=768x1024

# Run regression tests after changes
claude-test visual-test http://localhost:5173 --compare
```

## Performance Testing

```json
{
  "name": "performance-metrics",
  "description": "Measure watchlist performance",
  "steps": [
    { "action": "goto", "url": "http://localhost:5173/" },
    { "action": "performance", "metric": "firstContentfulPaint", "saveAs": "fcp" },
    { "action": "performance", "metric": "domComplete", "saveAs": "domReady" },
    { "action": "wait", "time": 5000 },
    { "action": "performance", "metric": "memory", "saveAs": "memoryUsage" }
  ]
}
```

## Accessibility Testing

```json
{
  "name": "accessibility-check",
  "description": "Verify watchlist accessibility",
  "steps": [
    { "action": "accessibility", "selector": ".watchlist-panel" },
    { "action": "keyboard", "key": "Tab", "count": 10 },
    { "action": "screenshot", "name": "keyboard-navigation" },
    { "action": "screenReader", "selector": ".watchlist-item:first-child" }
  ]
}
```

## Test Execution Strategy

### 1. **Development Testing**
```bash
# Run all tests with visible browser for debugging
claude-test run --headed --slow

# Run specific test suite
claude-test run puppeteer-tests/functional/watchlist-*.test.json
```

### 2. **CI/CD Pipeline**
```bash
# Headless execution with reports
claude-test run --timeout=60000 --report=junit

# Visual regression with baseline update
claude-test visual-test --update-baseline
```

### 3. **Debug Mode**
```bash
# Run with DevTools open
claude-test run 03-add-stock.test.json --devtools

# Slow motion for presentations
claude-test run --headed --slowmo=500
```

## Test Data Management

### Default Watchlist State
- BAC - Bank of America Corp
- MSFT - Microsoft Corp  
- NVDA - NVIDIA Corp
- SPY - SPDR S&P 500 ETF
- MX - MagnaChip Semiconductor
- STLC - Steel Connect Inc
- NBLY - Nabla Corp
- WCN - Waste Connections
- MTR - Mesa Royalty Trust
- FNV - Franco-Nevada Corp

### Test Stock Symbols
- Add: AAPL, TSLA, AMZN, GOOGL
- Search: "Apple", "Tesla", "Bank"
- Invalid: "XXXX", "123456", "!@#$%"

## Success Criteria

### Functional Requirements
✅ All stocks display with real-time prices
✅ Stock selection updates detail panels
✅ Add/remove stocks works correctly
✅ Search returns relevant results
✅ Tabs filter stocks appropriately
✅ WebSocket stays connected
✅ Prices update in real-time

### Non-Functional Requirements
✅ Page loads in < 3 seconds
✅ No memory leaks after 1 hour
✅ Works on all viewport sizes
✅ Keyboard navigation functional
✅ Screen reader compatible
✅ No console errors

## Reporting

### Test Results Format
```
Test Suite: Watchlist Functionality
Total Tests: 45
Passed: 42
Failed: 3
Duration: 5m 32s

Failed Tests:
- 05-realtime-updates: WebSocket disconnected
- 07-watchlist-search: Search input not found
- 10-error-handling: Error message not displayed

Screenshots: ./puppeteer-screenshots/
Reports: ./puppeteer-reports/
Coverage: 89%
```

## Maintenance

### Weekly Tasks
- Update baseline screenshots
- Review flaky tests
- Update test data
- Check for new UI elements

### Monthly Tasks
- Performance benchmark review
- Accessibility audit
- Cross-browser testing
- Load testing with 100+ stocks

This comprehensive test plan ensures complete coverage of watchlist functionality using all claude-test capabilities.