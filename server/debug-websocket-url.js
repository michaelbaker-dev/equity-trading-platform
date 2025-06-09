// Debug what URL the React app would generate

// Simulate development environment
process.env.NODE_ENV = 'development';

// Simulate browser environment
global.window = {
  location: {
    protocol: 'http:',
    host: 'localhost:5173'
  }
};

// Import the API module (simulate)
const getWebSocketUrl = () => {
  // Connect directly to backend for WebSocket (bypass proxy)
  if (process.env.NODE_ENV === 'development') {
    return 'ws://localhost:8080/api/v1/ws/stocks';
  }
  
  // For production, use same host with WebSocket protocol
  const protocol = global.window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${global.window.location.host}/api/v1/ws/stocks`;
};

console.log('🔍 WebSocket URL the React app would use:');
console.log('  Development mode:', process.env.NODE_ENV === 'development');
console.log('  Generated URL:', getWebSocketUrl());

// Test that exact URL
const WebSocket = require('ws');

const wsUrl = getWebSocketUrl();
console.log(`\n🧪 Testing connection to: ${wsUrl}`);

const ws = new WebSocket(wsUrl);

ws.on('open', function open() {
  console.log('✅ Connection successful!');
  ws.close();
});

ws.on('error', function error(err) {
  console.log('❌ Connection failed:', err.message);
});

ws.on('close', function close() {
  console.log('🔌 Connection closed');
});