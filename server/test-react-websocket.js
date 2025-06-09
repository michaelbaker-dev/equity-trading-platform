// Test WebSocket connection using React app's exact configuration
const WebSocket = require('ws');

// Test the exact URL that React app would use in development
const wsUrl = 'ws://localhost:8080/api/v1/ws/stocks';

console.log(`🔌 Testing React WebSocket connection to: ${wsUrl}`);

const ws = new WebSocket(wsUrl);

ws.on('open', function open() {
  console.log('✅ WebSocket connected successfully');
  
  // Test subscription like React app would do
  const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META'];
  
  symbols.forEach(symbol => {
    ws.send(JSON.stringify({
      type: 'subscribe',
      symbol: symbol
    }));
    console.log(`📤 Subscribed to ${symbol}`);
  });
});

ws.on('message', function message(data) {
  try {
    const dataStr = data.toString();
    
    // Handle potential multiple JSON messages in one buffer
    const lines = dataStr.trim().split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      try {
        const parsed = JSON.parse(line);
        console.log(`📥 Received: ${parsed.type} - ${parsed.symbol || 'N/A'}`);
      } catch (e) {
        console.log(`⚠️  Failed to parse line: ${line.substring(0, 50)}...`);
      }
    });
  } catch (error) {
    console.log('❌ Error processing message:', error.message);
    console.log('Raw data:', data.toString().substring(0, 100));
  }
});

ws.on('error', function error(err) {
  console.log('❌ WebSocket error:', err.message);
});

ws.on('close', function close(code, reason) {
  console.log(`🔌 WebSocket closed: ${code} ${reason}`);
});

// Keep alive for 10 seconds
setTimeout(() => {
  console.log('🛑 Closing test connection');
  ws.close();
}, 10000);