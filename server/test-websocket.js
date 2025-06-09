// Quick WebSocket connection test
const WebSocket = require('ws');

console.log('🔌 Testing WebSocket connection to Go backend...');

const ws = new WebSocket('ws://localhost:8080/api/v1/ws/stocks');

ws.on('open', function open() {
  console.log('✅ Connected to WebSocket');
  
  // Send a subscription message
  ws.send(JSON.stringify({
    type: 'subscribe',
    symbol: 'TSLA'
  }));
  
  console.log('📤 Sent subscription for TSLA');
});

ws.on('message', function message(data) {
  const parsed = JSON.parse(data.toString());
  console.log('📥 Received:', parsed);
});

ws.on('error', function error(err) {
  console.log('❌ WebSocket error:', err.message);
});

ws.on('close', function close() {
  console.log('🔌 WebSocket connection closed');
});

// Close after 5 seconds
setTimeout(() => {
  ws.close();
}, 5000);