# Complete Testing Guide for Equity Trading Platform

## Overview

This guide covers all testing capabilities for the Equity Trading Platform frontend, including both the global `claude-test` framework and our custom functional tests.

## Testing Architecture

### 1. Global Claude-Test Framework
Pre-installed Puppeteer testing with AI capabilities:
- **Analysis**: `claude-test analyze`
- **Visual Testing**: `claude-test visual-test`
- **Test Generation**: `claude-test generate-functional`
- **Test Execution**: `claude-test run`

### 2. Custom Functional Tests (.cjs files)
Project-specific tests for actual feature validation:
- **Watchlist Tests**: Add/remove stocks, multi-select, price verification
- **Search Tests**: Search scenarios, duplicate prevention
- **WebSocket Tests**: Real-time updates, connection handling
- **Quick Tests**: Smoke tests for rapid validation

## Available Test Commands

### Quick Start
```bash
# Run all functional tests
./run-functional-tests.sh

# Run specific test suite
./run-functional-tests.sh watchlist     # Main watchlist features
./run-functional-tests.sh search        # Search functionality
./run-functional-tests.sh websocket     # Real-time features
./run-functional-tests.sh quick         # Quick smoke test

# Debug mode (see browser)
./run-functional-tests.sh watchlist --headed --slow

# Continuous testing
./watch-and-test.sh
```

### Test Suites

#### 1. Watchlist Tests (`watchlist`)
Tests all core watchlist functionality:
- ✅ Initial state validation (10 stocks loaded)
- ✅ Stock selection and detail panel updates
- ✅ Multiple stock selection with price verification
- ✅ Remove stocks with confirmation dialog
- ✅ Add stocks via modal search
- ✅ Tab filtering
- ✅ Connection status monitoring
- ✅ Real-time price updates

**Example Output:**
```
📍 Test 6: Multiple Stock Selection & Price Verification
✅ Selected BAC: Watchlist price=45.12, Detail price=45.12
   ✓ Price consistency verified for BAC
✅ Selected MSFT: Watchlist price=469.72, Detail price=469.72
   ✓ Price consistency verified for MSFT
```

#### 2. Search Tests (`search`)
Comprehensive search functionality testing:
- ✅ Search by exact symbol (TSLA)
- ✅ Search by company name (Apple)
- ✅ Handle non-existent symbols
- ✅ Single character search (shows hint)
- ✅ Add multiple stocks quickly
- ✅ Duplicate prevention

**Example Output:**
```
📍 Test: Search by company name
   Query: "Apple"
   ✅ Found 3 results
   ✅ First result: AAPL - Apple Inc
```

#### 3. WebSocket Tests (`websocket`)
Real-time functionality validation:
- ✅ WebSocket connection establishment
- ✅ Message flow analysis
- ✅ Price update streaming
- ✅ Subscription management
- ✅ Connection recovery after network loss

#### 4. Quick Test (`quick`)
Rapid validation test:
- ✅ Page loads correctly
- ✅ Watchlist populated
- ✅ Connection status visible

## What Gets Tested

### User Interactions
1. **Stock Management**
   - Adding stocks through search
   - Removing stocks with confirmation
   - Preventing duplicates

2. **Navigation**
   - Clicking stocks updates detail panel
   - Price consistency across panels
   - Tab filtering functionality

3. **Search Features**
   - Real-time search as you type
   - Multiple result handling
   - Error states (no results)

4. **Real-time Updates**
   - WebSocket connection status
   - Price streaming (when market open)
   - Connection recovery

## Running Tests During Development

### Option 1: Manual Test Runs
```bash
# After making changes, run relevant tests
./run-functional-tests.sh watchlist --headed

# Test everything before commit
./run-functional-tests.sh all
```

### Option 2: Continuous Testing
```bash
# Watches for file changes and runs tests automatically
./watch-and-test.sh
```

### Option 3: Using Claude-Test
```bash
# Generate new functional tests
claude-test generate-functional http://localhost:5173

# Run generated tests
claude-test run --headed --slow
```

## Test Options

All test scripts support these options:
- `--headed` - Show browser window
- `--slow` - Run slowly (250ms delay)
- `--slowmo=1000` - Custom delay
- `--devtools` - Open Chrome DevTools

## Debugging Failed Tests

### Common Issues and Solutions

1. **Selectors Not Found**
   ```javascript
   // Check actual DOM structure
   const element = await page.$('.actual-class-name');
   ```

2. **Timing Issues**
   ```javascript
   // Add explicit waits
   await page.waitForSelector('.element', { timeout: 5000 });
   ```

3. **Modal/Dialog Handling**
   ```javascript
   // Handle confirmation dialogs
   page.once('dialog', async dialog => {
     await dialog.accept();
   });
   ```

### Debug Tools
- Screenshots on failure: `test-results/error-*.png`
- Console output shows exact failure point
- Use `--headed --slow` to watch execution

## Best Practices

1. **Keep Tests Independent**
   - Each test should work alone
   - Don't depend on previous test state

2. **Use Meaningful Assertions**
   ```javascript
   // Good
   console.log(`✅ Selected ${symbol}: Watchlist=${price1}, Detail=${price2}`);
   
   // Bad
   console.log('Test passed');
   ```

3. **Handle Async Properly**
   ```javascript
   // Always await async operations
   await page.click('.button');
   await page.waitForSelector('.result');
   ```

## CI/CD Integration

### GitHub Actions
```yaml
name: Frontend Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run dev &
      - run: npx wait-on http://localhost:5173
      - run: ./run-functional-tests.sh all
```

## Test Coverage Summary

| Feature | Coverage | Test Suite |
|---------|----------|------------|
| Add Stock | ✅ Full | watchlist, search |
| Remove Stock | ✅ Full | watchlist |
| Stock Selection | ✅ Full | watchlist |
| Price Display | ✅ Full | watchlist |
| Search | ✅ Full | search |
| Tab Filtering | ✅ Partial | watchlist |
| WebSocket | ✅ Full | websocket |
| Drag & Drop | ❌ Not Yet | - |
| Persistence | ⚠️ Basic | watchlist |

## Next Steps

1. **Expand Tab Testing** - Test each filter tab thoroughly
2. **Add Drag & Drop Tests** - Test reordering functionality
3. **Performance Testing** - Load testing with many stocks
4. **Cross-browser Testing** - Test on different browsers
5. **Mobile Testing** - Test responsive design