# WebSocket Connection Bug Analysis

## Issue Confirmed ✅

**Problem**: WebSocket connection flashes between "Connected" and "Disconnected" every few seconds, indicating unstable connection management.

**Root Causes Identified**:

1. **React StrictMode Double-Mounting** - In development, components mount twice, creating multiple WebSocket connections
2. **Aggressive Reconnection Logic** - WebSocket tries to reconnect on every close event
3. **Multiple useEffect Hooks** - Different hooks triggering at different times
4. **Short Throttling Window** - Only 2-3 seconds between connection attempts

## Fixes Applied ✅

### 1. Enhanced Connection Status Display
- Added "Connecting..." state with yellow indicator
- Shows error messages for better debugging
- More stable visual feedback

### 2. Improved Connection Throttling
- Increased minimum time between connection attempts from 2 to 3 seconds
- Added check for existing connection before creating new one
- Increased initial connection delay from 100ms to 500ms

### 3. Better Reconnection Logic
- Added exponential backoff for reconnection attempts
- Prevent reconnection if connection is already open
- Clear existing timeouts before creating new ones
- Only reconnect on unexpected disconnects (not clean closes)

### 4. Enhanced Cleanup
- Always cleanup connections (removed development mode exception)
- Proper timeout clearing

## Suggested Improvements for Claude-Test Framework

### Critical Missing Actions

1. **Dialog Handling**
```json
{
  "action": "setupDialogHandler",
  "type": "confirm|alert|prompt",
  "response": "accept|dismiss"
}
```

2. **JavaScript Execution**
```json
{
  "action": "execute",
  "script": "return document.querySelector('.status').textContent",
  "saveAs": "statusText"
}
```

3. **Assertions**
```json
{
  "action": "assert",
  "type": "equals|contains|exists|not-exists",
  "selector": ".connection-status",
  "expected": "Connected"
}
```

4. **Network Monitoring**
```json
{
  "action": "waitForResponse",
  "urlPattern": "/api/v1/*",
  "timeout": 5000
}
```

5. **WebSocket Monitoring**
```json
{
  "action": "waitForWebSocket",
  "url": "ws://localhost:8080/api/v1/ws/stocks",
  "state": "connected"
}
```

6. **Variable Storage**
```json
{
  "action": "saveText",
  "selector": ".price",
  "saveAs": "currentPrice"
}
```

7. **Conditional Logic**
```json
{
  "action": "if",
  "condition": {"selector": ".modal", "exists": true},
  "then": [{"action": "click", "selector": ".close"}]
}
```

8. **Element Counting**
```json
{
  "action": "count",
  "selector": ".watchlist-item",
  "saveAs": "stockCount"
}
```

9. **Retry Mechanisms**
```json
{
  "action": "retry",
  "attempts": 3,
  "delay": 1000,
  "steps": [...]
}
```

10. **Performance Monitoring**
```json
{
  "action": "measurePerformance",
  "metric": "firstContentfulPaint",
  "saveAs": "loadTime"
}
```

## Additional Application Improvements

### 1. Better Test Selectors
Add data-testid attributes:
```html
<button data-testid="delete-stock-MSFT">Delete</button>
<div data-testid="connection-status">Connected</div>
```

### 2. WebSocket Singleton Pattern
Implement global WebSocket manager to prevent multiple connections:
```typescript
class WebSocketManager {
  private static instance: WebSocket | null = null;
  static connect() { /* singleton logic */ }
}
```

### 3. Connection State Management
Use a more sophisticated state machine for connection states:
- Disconnected → Connecting → Connected → Reconnecting → Error

### 4. Debug Mode
Add environment variable to enable detailed WebSocket logging:
```typescript
const DEBUG_WEBSOCKET = import.meta.env.VITE_DEBUG_WEBSOCKET === 'true';
```

### 5. Health Check Endpoint
Add a REST endpoint to verify backend connectivity before attempting WebSocket connection.

## Test Results

✅ **Connection Flashing Captured**: Tests successfully captured the flashing behavior
✅ **Enhanced Status Display**: Now shows "Connecting...", "Connected", "Disconnected" with error details
✅ **Improved Reconnection Logic**: Exponential backoff prevents rapid reconnection attempts
✅ **Better Visual Feedback**: Users can see what's happening with the connection

## Next Steps

1. **Fix WebSocket Implementation**: Apply additional singleton pattern if flashing persists
2. **Enhance Testing Framework**: Implement the suggested missing actions
3. **Add Integration Tests**: Create end-to-end tests that verify real-time data flow
4. **Performance Testing**: Monitor WebSocket message rates and connection stability
5. **Error Handling**: Add better error recovery and user feedback

## Files Modified

- `src/hooks/useWebSocket.ts` - Enhanced connection logic
- `src/components/watchlist/WatchlistPanel.tsx` - Better status display
- `puppeteer-tests/functional/test-websocket-fixes.test.json` - Verification test

The WebSocket connection issue is now documented, analyzed, and partially fixed. The enhanced status display provides better visibility into connection state changes.