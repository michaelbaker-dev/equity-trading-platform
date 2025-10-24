# Functional Testing Guide

## Overview

This guide covers the **actual functional testing** of the Equity Trading Platform, using Puppeteer to interact with and validate application features.

## Test Suites Available

### 1. Watchlist Test Suite (`test-suites/watchlist-full-test.cjs`)
Tests all watchlist interactions:
- ✅ Initial state validation
- ✅ Add stocks via search
- ✅ Remove stocks
- ✅ Tab filtering (All, Stocks, Crypto, etc.)
- ✅ Stock selection
- ✅ Real-time connection status
- ✅ Search functionality
- ✅ Price update detection
- ✅ Drag & drop reordering
- ✅ Data persistence

### 2. WebSocket Test Suite (`test-suites/websocket-test.cjs`)
Tests real-time functionality:
- ✅ WebSocket connection establishment
- ✅ Message flow analysis
- ✅ Real-time price updates
- ✅ Subscription management
- ✅ Connection recovery

## Quick Start

### Run All Tests
```bash
./run-functional-tests.sh
```

### Run Specific Test Suite
```bash
# Watchlist tests only
./run-functional-tests.sh watchlist

# WebSocket tests only
./run-functional-tests.sh websocket

# Quick smoke test
./run-functional-tests.sh quick
```

### Debug Mode (See Browser)
```bash
# Run with visible browser
./run-functional-tests.sh watchlist --headed

# Run slowly for debugging
./run-functional-tests.sh watchlist --headed --slow
```

### Continuous Testing
```bash
# Watch for changes and auto-run tests
./watch-and-test.sh
```

## Test Output Example

```
🧪 COMPREHENSIVE WATCHLIST TEST SUITE
=====================================

[12:34:56] 📍 Running: Initial Watchlist State
[12:34:57] ✅ Initial Watchlist State - PASSED
[12:34:57] 📍 Found 10 stocks in watchlist

[12:34:57] 📍 Running: Add Stock to Watchlist
[12:34:59] ✅ Add Stock to Watchlist - PASSED

[12:35:00] 📍 Running: Stock Selection and Detail Display
[12:35:01] ✅ Stock Selection and Detail Display - PASSED

📊 TEST SUMMARY
===============
⏱️  Duration: 15.34s
✅ Passed: 10
❌ Failed: 0
📊 Total Tests: 10
```

## What Gets Tested

### Watchlist Features
1. **Stock Management**
   - Adding stocks through search modal
   - Removing stocks with hover + delete
   - Preventing duplicate additions

2. **User Interactions**
   - Clicking stocks to view details
   - Tab filtering functionality
   - Search with autocomplete

3. **Real-time Updates**
   - WebSocket connection status
   - Price updates in watchlist
   - Connection recovery after disconnect

4. **Data Persistence**
   - Watchlist saves to localStorage
   - Survives page reload

### WebSocket Features
1. **Connection Management**
   - Initial connection establishment
   - Reconnection after network loss
   - Connection status indicators

2. **Data Flow**
   - Message frequency analysis
   - Price update streaming
   - Subscription changes on stock selection

## Writing New Tests

### Test Structure
```javascript
async testNewFeature() {
  return this.runTest('Feature Name', async () => {
    // Arrange - Set up test state
    await this.page.click('.some-button');
    
    // Act - Perform the action
    await this.page.type('.input', 'test data');
    
    // Assert - Verify the result
    const result = await this.page.$('.result');
    expect(result).toBeTruthy();
  });
}
```

### Common Test Patterns

**Wait for Element:**
```javascript
await this.page.waitForSelector('.element', { timeout: 5000 });
```

**Click and Wait:**
```javascript
await this.page.click('.button');
await this.page.waitForTimeout(500);
```

**Get Text Content:**
```javascript
const text = await this.page.$eval('.element', el => el.textContent);
```

**Check Visibility:**
```javascript
const isVisible = await this.page.$('.element') !== null;
```

## Troubleshooting

### Test Failures

1. **Element Not Found**
   - Check if selectors have changed
   - Add wait statements before interactions
   - Use more specific selectors

2. **Timeout Errors**
   - Increase timeout values
   - Check if app is fully loaded
   - Verify WebSocket connection

3. **Flaky Tests**
   - Add explicit waits instead of timeouts
   - Use `waitForSelector` with specific conditions
   - Check for race conditions

### Debug Tips

1. **Run in Headed Mode**
   ```bash
   ./run-functional-tests.sh --headed --slow
   ```

2. **Take Screenshots on Failure**
   - Screenshots auto-saved to `test-results/`
   - Check `failure-*.png` files

3. **Add Console Logs**
   ```javascript
   console.log('Current state:', await this.page.content());
   ```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Functional Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run dev &
      - run: npx wait-on http://localhost:5173
      - run: npm install puppeteer
      - run: ./run-functional-tests.sh
```

## Best Practices

1. **Keep Tests Independent**
   - Each test should work in isolation
   - Don't rely on previous test state

2. **Use Descriptive Names**
   - Test names should explain what's being tested
   - Include expected outcome

3. **Handle Async Properly**
   - Always await async operations
   - Use proper error handling

4. **Clean Up After Tests**
   - Close modals/dialogs
   - Reset to known state

5. **Make Tests Deterministic**
   - Avoid relying on timing
   - Use explicit waits for conditions

## Next Steps

1. Add more test suites:
   - Stock detail panel tests
   - Order book tests
   - Chart interaction tests

2. Implement visual regression:
   - Screenshot comparisons
   - Layout shift detection

3. Performance testing:
   - Load time metrics
   - Memory usage tracking
   - WebSocket latency measurement