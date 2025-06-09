#!/bin/bash

# Quick script to restart React with proxy configuration
# Run this after updating vite.config.ts

echo "🔄 Restarting React with updated proxy configuration..."

# Kill any React dev server running on port 5173
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "🛑 Stopping existing React dev server..."
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Navigate to React directory and start dev server
cd react-frontend

echo "🌐 Starting React dev server with backend proxy..."
echo "   - API requests will be proxied to http://localhost:8080"
echo "   - WebSocket will be proxied to ws://localhost:8080"
echo "   - React app will be available at http://localhost:5173"
echo ""

npm run dev