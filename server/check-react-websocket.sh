#!/bin/bash

echo "🔍 Checking React App WebSocket Connection"
echo "=========================================="

# Check if services are running
echo "1. Service Status:"
if curl -s "http://localhost:8080/health" >/dev/null; then
    echo "   ✅ Backend running (port 8080)"
else
    echo "   ❌ Backend not running"
    exit 1
fi

if curl -s "http://localhost:5173" >/dev/null; then
    echo "   ✅ React app running (port 5173)"
else
    echo "   ❌ React app not running"
    exit 1
fi

# Test API proxy
echo ""
echo "2. API Proxy Test:"
if curl -s "http://localhost:5173/api/v1/stocks/quote/AAPL" >/dev/null; then
    echo "   ✅ API proxy working"
else
    echo "   ❌ API proxy failed"
fi

# Test WebSocket endpoint
echo ""
echo "3. WebSocket Endpoint Test:"
if node test-full-connection.js | grep -q "All connections working"; then
    echo "   ✅ WebSocket endpoint working"
else
    echo "   ❌ WebSocket endpoint failed"
fi

echo ""
echo "🎯 Status Summary:"
echo "   If all tests pass, React app should show 'Connected'"
echo "   If still showing 'Disconnected', try:"
echo "   1. Hard refresh browser (Cmd+Shift+R)"
echo "   2. Clear browser cache"
echo "   3. Check browser console for errors"
echo ""
echo "🌐 App URL: http://localhost:5173"