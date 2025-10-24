# Testing Framework Changelog

## 2025-01-10

### Added
- Migrated all Puppeteer tests to claude-test v0.1.0 JSON format
- Created comprehensive watchlist test suite with 40+ test files
- Added test runner scripts for headless and headed execution
- Implemented visual regression testing across multiple viewports
- Added WebSocket connection monitoring tests
- Created dialog handling tests for stock removal confirmation

### Fixed
- Updated all test files from old Puppeteer syntax to claude-test v0.1.0:
  - Changed `goto` action to `navigate`
  - Changed `name` field to `filename` for screenshots
  - Changed `saveAs` field to `store` for evaluate actions
  - Fixed assert variable syntax to use `name` instead of `filename`
- Corrected port configuration from 5174 to 5173 across all tests
- Fixed WebSocket connection flashing issue with simplified hook implementation

### Test Categories Implemented

#### Core Watchlist Tests
- `00-verify-framework.test.json` - Framework verification
- `01-watchlist-initial-state.test.json` - Initial state validation
- `02-stock-selection.test.json` - Stock selection and panel updates
- `03-add-stock-workflow.test.json` - Complete add stock workflow
- `04-remove-stock-workflow.test.json` - Stock removal with dialog
- `05-realtime-price-updates.test.json` - WebSocket price updates
- `06-tab-filtering.test.json` - Tab filtering functionality
- `07-search-error-handling.test.json` - Search error scenarios
- `08-data-persistence.test.json` - Data persistence validation

#### Specialized Tests
- `watchlist-delete-stock.test.json` - Delete with confirmation dialog
- `watchlist-add-apple.test.json` - Search and add Apple stock
- `watchlist-select-stocks.test.json` - Multi-stock selection
- `watchlist-websocket-check.test.json` - WebSocket connection status
- `capture-connection-flashing.test.json` - Connection stability monitoring

### Test Runner Features
- `run-watchlist-tests.sh` - Main test runner with headed/headless modes
- `test-claude-framework.sh` - Framework verification script
- `update-test-syntax.sh` - Batch syntax updater for test migration
- `fix-test-metadata.sh` - Metadata correction utility

### WebSocket Fixes
- Replaced complex `useWebSocket.ts` with simplified `useWebSocketSimple.ts`
- Fixed React StrictMode double-rendering issues
- Resolved circular dependencies in state updates
- Stabilized connection status to prevent flashing

### Next Steps
- Add performance testing for large watchlists
- Implement accessibility testing
- Add cross-browser testing support
- Create CI/CD integration scripts