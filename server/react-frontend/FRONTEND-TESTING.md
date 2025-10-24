# Frontend Testing Documentation

## Overview

This document outlines the comprehensive testing strategy for the Equity Trading Platform's React frontend using the globally installed `claude-test` Puppeteer framework.

## Testing Architecture

### Tools Used
- **claude-test**: Global Puppeteer testing framework (no local installation needed)
- **Test Types**: E2E, Visual Regression, Performance, Accessibility
- **Output Locations**:
  - `./puppeteer-screenshots/` - Visual regression images
  - `./puppeteer-reports/` - Test plans and coverage reports
  - `./puppeteer-tests/` - Generated test code
  - `./test-results/` - Test execution results

### What Each Test Actually Does

#### 1. `claude-test analyze`
- Loads the page and analyzes DOM structure
- Counts interactive elements (buttons, links, inputs)
- Identifies potential test areas
- Suggests testing priorities
- **Does NOT** interact with the application

#### 2. `claude-test visual-test`
- Takes a full-page screenshot
- Compares with baseline image (if exists)
- Reports visual differences as percentages
- Saves diff images showing changes
- **Does NOT** click or interact with elements

#### 3. `claude-test test-plan`
- Analyzes the application structure
- Generates a markdown test plan
- Suggests test scenarios and priorities
- Creates accessibility and performance test ideas
- **Does NOT** run any actual tests

#### 4. `claude-test generate-tests`
- Creates boilerplate Puppeteer test code
- Generates basic test structure
- Includes viewport and accessibility tests
- Saves test files for customization
- **Does NOT** test specific features

## Quick Start

### 1. Basic Test Run
```bash
# Ensure React app is running
npm run dev

# Run all frontend tests (headless by default)
./test-scripts/run-frontend-tests.sh

# Run with options
./test-scripts/run-frontend-tests.sh --headed --slow        # Debug mode
./test-scripts/run-frontend-tests.sh --headed --slowmo=1000  # Demo mode
./test-scripts/run-frontend-tests.sh --viewport=375x667      # Mobile testing
```

### 2. Feature-Specific Tests
```bash
# Test specific features (headless by default)
./test-scripts/test-specific-features.sh watchlist
./test-scripts/test-specific-features.sh details
./test-scripts/test-specific-features.sh resize
./test-scripts/test-specific-features.sh realtime
./test-scripts/test-specific-features.sh all

# With options
./test-scripts/test-specific-features.sh watchlist --headed --slow
./test-scripts/test-specific-features.sh all --headed --slowmo=1000
./test-scripts/test-specific-features.sh resize --viewport=375x667
```

### 3. Test Mode Demonstrations
```bash
# See all testing modes in action
./test-scripts/demo-test-modes.sh
```

### 4. Individual Commands
```bash
# Speed mode (default - headless)
claude-test analyze http://localhost:5173

# Debug mode - see what's happening
claude-test analyze http://localhost:5173 --headed --slow

# Presentation mode - slow for demos
claude-test visual-test http://localhost:5173 --headed --slowmo=1000

# Mobile testing
claude-test visual-test http://localhost:5173 --viewport=375x667

# DevTools for advanced debugging
claude-test analyze http://localhost:5173 --devtools
```

## Testing Modes

### 🏃 Speed Mode (Default)
- **Use Case**: CI/CD pipelines, quick validation
- **Options**: None (runs headless by default)
- **Example**: `./test-scripts/run-frontend-tests.sh`

### 🔍 Debug Mode
- **Use Case**: Troubleshooting failed tests
- **Options**: `--headed --slow`
- **Example**: `./test-scripts/run-frontend-tests.sh --headed --slow`

### 🎥 Presentation Mode
- **Use Case**: Demos, training, stakeholder reviews
- **Options**: `--headed --slowmo=1000`
- **Example**: `./test-scripts/run-frontend-tests.sh --headed --slowmo=1000`

### 📱 Mobile Testing
- **Use Case**: Responsive design validation
- **Options**: `--viewport=375x667` (or other sizes)
- **Example**: `./test-scripts/test-specific-features.sh resize --viewport=375x667`

### 🛠️ DevTools Mode
- **Use Case**: Performance analysis, network debugging
- **Options**: `--devtools`
- **Example**: `claude-test analyze http://localhost:5173 --devtools`

## Test Coverage Areas

### 1. Watchlist Panel
- ✅ Add/remove stocks
- ✅ Search functionality
- ✅ Drag-and-drop reordering
- ✅ Tab filtering
- ✅ Real-time price updates
- ✅ Connection status indicators

### 2. Stock Detail Panel
- ✅ Tab navigation (Chart, News, Options, Comments, Company)
- ✅ TradingView chart integration
- ✅ Stock information display
- ✅ Real-time quote updates
- ✅ News feed functionality

### 3. Order Book Panel
- ✅ Bid/ask display
- ✅ Price level visualization
- ✅ Real-time order updates
- ✅ Market depth indicators

### 4. Layout & Responsiveness
- ✅ Panel resizing with drag handles
- ✅ Min/max width constraints
- ✅ Layout persistence
- ✅ Mobile/tablet/desktop viewports

### 5. Real-Time Features
- ✅ WebSocket connection management
- ✅ Price update streaming
- ✅ Connection recovery
- ✅ Error state handling

## Test Scenarios

### Critical User Journeys

#### 1. New User Flow
```javascript
// Covered by generated tests
- Load application
- View default watchlist
- Search and add new stock
- View stock details
- Navigate between tabs
```

#### 2. Active Trading Flow
```javascript
// Covered by visual regression
- Monitor multiple stocks
- Quick stock switching
- Real-time price tracking
- Order book analysis
```

#### 3. Error Recovery Flow
```javascript
// Covered by E2E tests
- Handle network disconnection
- Recover WebSocket connection
- Display error states
- Fallback to cached data
```

## Visual Regression Testing

### Baseline Management
```bash
# Create initial baseline
claude-test visual-test http://localhost:5173

# Update baseline after UI changes
claude-test visual-test http://localhost:5173 --update-baseline
```

### Key Visual States
1. **Initial Load** - Default watchlist view
2. **Active Trading** - Multiple price updates
3. **Stock Selected** - Detail panel populated
4. **Modal States** - Add stock dialog open
5. **Error States** - Disconnected, loading
6. **Tab States** - Each detail tab view

## Performance Testing

### Metrics Monitored
- Initial page load time
- Time to interactive
- WebSocket connection time
- Price update latency
- Memory usage over time
- CPU usage during updates

### Load Testing Scenarios
```bash
# Test with many stocks
claude-test test-plan http://localhost:5173 --scenario "load-test-100-stocks"

# Test rapid switching
claude-test test-plan http://localhost:5173 --scenario "rapid-stock-switching"
```

## Accessibility Testing

### Coverage Areas
- Keyboard navigation
- Screen reader support
- ARIA labels and roles
- Color contrast ratios
- Focus management
- Skip links

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Frontend Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
      - name: Start app
        run: npm run dev &
      - name: Wait for app
        run: npx wait-on http://localhost:5173
      - name: Run tests
        run: ./test-scripts/run-frontend-tests.sh
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/
```

## Debugging Failed Tests

### Common Issues

1. **App Not Running**
   ```bash
   # Ensure app is started
   npm run dev
   ```

2. **Port Conflicts**
   ```bash
   # Check if port 5173 is in use
   lsof -i :5173
   ```

3. **Visual Differences**
   ```bash
   # Review screenshots
   open puppeteer-screenshots/
   ```

4. **Timing Issues**
   ```bash
   # Increase timeouts in tests
   claude-test analyze http://localhost:5173 --timeout 30000
   ```

## Best Practices

1. **Run tests regularly** - Before commits and PRs
2. **Update baselines** - After intentional UI changes
3. **Review failures** - Don't ignore intermittent failures
4. **Monitor performance** - Track metrics over time
5. **Test in CI** - Automate test execution

## Maintenance

### Weekly Tasks
- Review and update visual baselines
- Check test execution times
- Update test scenarios for new features
- Archive old test results

### Monthly Tasks
- Performance trend analysis
- Accessibility audit
- Cross-browser testing
- Test suite optimization

## Future Enhancements

1. **Custom Test Scenarios**
   - Market open/close simulations
   - High-frequency update testing
   - Multi-user scenarios

2. **Advanced Metrics**
   - WebSocket message latency
   - Redux store performance
   - Component render times

3. **Integration Tests**
   - Backend API integration
   - Database state verification
   - Cache behavior testing