// Final comprehensive test to verify WebSocket connection from browser perspective
const WebSocket = require('ws');

console.log('🎯 Final WebSocket Connection Test');
console.log('==================================');

// Test the exact setup the browser would use
const wsUrl = 'ws://localhost:8080/api/v1/ws/stocks';
console.log(`🔌 Testing: ${wsUrl}`);
console.log(`📋 Origin: http://localhost:5173 (React app)`);

// Create WebSocket with Origin header to simulate browser request
const ws = new WebSocket(wsUrl, {
    headers: {
        'Origin': 'http://localhost:5173'
    }
});

let messageCount = 0;
const maxMessages = 5;

ws.on('open', function open() {
    console.log('✅ WebSocket connection opened');
    console.log('📤 Sending subscription requests...');
    
    // Subscribe to watchlist symbols like React app does
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META'];
    
    symbols.forEach(symbol => {
        ws.send(JSON.stringify({
            type: 'subscribe',
            symbol: symbol
        }));
    });
    
    console.log(`📤 Subscribed to ${symbols.length} symbols`);
});

ws.on('message', function message(data) {
    try {
        const parsed = JSON.parse(data.toString());
        messageCount++;
        
        if (messageCount <= maxMessages) {
            console.log(`📥 Message ${messageCount}: ${parsed.type} ${parsed.symbol || ''}`);
        } else if (messageCount === maxMessages + 1) {
            console.log('📥 ... (receiving more messages)');
        }
        
        // Close after receiving enough messages
        if (messageCount >= maxMessages + 3) {
            console.log('🎉 Successfully receiving real-time data!');
            ws.close();
        }
    } catch (error) {
        console.log('❌ Error parsing message:', error.message);
    }
});

ws.on('error', function error(err) {
    console.log('❌ WebSocket error:', err.message);
    console.log('   This might indicate a CORS or connection issue');
});

ws.on('close', function close(code, reason) {
    console.log(`🔌 Connection closed: ${code} ${reason || 'No reason'}`);
    
    if (messageCount > 0) {
        console.log('');
        console.log('🎉 SUCCESS: WebSocket connection working!');
        console.log(`   Received ${messageCount} messages`);
        console.log('   React app should now show "Connected"');
    } else {
        console.log('');
        console.log('❌ FAILED: No messages received');
        console.log('   Check CORS settings and backend logs');
    }
});

// Auto-close after 10 seconds
setTimeout(() => {
    if (ws.readyState === WebSocket.OPEN) {
        console.log('⏰ Test timeout - closing connection');
        ws.close();
    }
}, 10000);