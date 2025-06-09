// Test full connection flow: API + WebSocket like React app does

const axios = require('axios');
const WebSocket = require('ws');

console.log('🧪 Testing Full Connection Flow');
console.log('================================');

async function testAPI() {
    console.log('\n1. Testing API calls...');
    
    try {
        // Test through React proxy
        const proxyResponse = await axios.get('http://localhost:5173/api/v1/stocks/quote/AAPL');
        console.log('   ✅ API proxy working:', proxyResponse.data.symbol);
        
        // Test direct backend
        const directResponse = await axios.get('http://localhost:8080/api/v1/stocks/quote/AAPL');
        console.log('   ✅ Direct API working:', directResponse.data.symbol);
        
        return true;
    } catch (error) {
        console.log('   ❌ API test failed:', error.message);
        return false;
    }
}

function testWebSocket() {
    console.log('\n2. Testing WebSocket connection...');
    
    return new Promise((resolve) => {
        // Test the exact URL React would use in development
        const wsUrl = 'ws://localhost:8080/api/v1/ws/stocks';
        console.log('   🔌 Connecting to:', wsUrl);
        
        const ws = new WebSocket(wsUrl);
        let connected = false;
        
        const timeout = setTimeout(() => {
            if (!connected) {
                console.log('   ❌ WebSocket connection timeout');
                ws.close();
                resolve(false);
            }
        }, 5000);
        
        ws.on('open', () => {
            connected = true;
            clearTimeout(timeout);
            console.log('   ✅ WebSocket connected');
            
            // Send subscription like React app would
            ws.send(JSON.stringify({
                type: 'subscribe',
                symbol: 'AAPL'
            }));
            console.log('   📤 Sent subscription');
            
            // Wait for a message
            setTimeout(() => {
                ws.close();
                resolve(true);
            }, 2000);
        });
        
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                console.log('   📥 Received:', message.type, message.symbol || 'N/A');
            } catch (e) {
                console.log('   📥 Received data (parse error)');
            }
        });
        
        ws.on('error', (error) => {
            console.log('   ❌ WebSocket error:', error.message);
            clearTimeout(timeout);
            resolve(false);
        });
        
        ws.on('close', () => {
            if (connected) {
                console.log('   🔌 WebSocket closed (normal)');
            }
        });
    });
}

async function main() {
    const apiWorking = await testAPI();
    const wsWorking = await testWebSocket();
    
    console.log('\n🎯 Summary:');
    console.log('   API:', apiWorking ? '✅ Working' : '❌ Failed');
    console.log('   WebSocket:', wsWorking ? '✅ Working' : '❌ Failed');
    
    if (apiWorking && wsWorking) {
        console.log('\n🎉 All connections working! React app should show "Connected"');
    } else {
        console.log('\n⚠️  Some connections failed. Check the services.');
    }
}

main().catch(console.error);