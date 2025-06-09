#!/bin/bash

echo "🔄 Restarting React development server..."

# Kill React dev server on port 5173
echo "🛑 Stopping React server on port 5173..."
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
sleep 2

# Verify port is free
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "❌ Port 5173 still in use"
    exit 1
else
    echo "✅ Port 5173 is free"
fi

# Start React dev server
echo "🚀 Starting React dev server with updated proxy..."
cd react-frontend
npm run dev