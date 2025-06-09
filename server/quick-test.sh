#!/bin/bash

echo "🧪 Quick Application Test"
echo "========================"

# Test Docker
echo "1. Testing Docker..."
if docker info >/dev/null 2>&1; then
    echo "   ✅ Docker is running"
else
    echo "   ❌ Docker is not running"
    echo "   🐳 Starting Docker..."
    open -a Docker
    echo "   ⏳ Waiting 15 seconds for Docker to start..."
    sleep 15
    if docker info >/dev/null 2>&1; then
        echo "   ✅ Docker is now running"
    else
        echo "   ❌ Docker failed to start"
        exit 1
    fi
fi

# Test Backend
echo ""
echo "2. Testing Backend..."
if curl -s "http://localhost:8080/health" >/dev/null 2>&1; then
    echo "   ✅ Backend is running"
else
    echo "   ❌ Backend is not running"
    echo "   🚀 Starting backend..."
    echo "n" | ./run.sh --no-browser > /dev/null 2>&1 &
    echo "   ⏳ Waiting 30 seconds for backend to start..."
    sleep 30
    if curl -s "http://localhost:8080/health" >/dev/null 2>&1; then
        echo "   ✅ Backend is now running"
    else
        echo "   ❌ Backend failed to start"
        exit 1
    fi
fi

# Test Frontend
echo ""
echo "3. Testing Frontend..."
if curl -s "http://localhost:5173" >/dev/null 2>&1; then
    echo "   ✅ Frontend is running"
else
    echo "   ❌ Frontend is not running"
    echo "   🌐 Starting frontend..."
    cd react-frontend
    npm run dev > /dev/null 2>&1 &
    cd ..
    echo "   ⏳ Waiting 15 seconds for frontend to start..."
    sleep 15
    if curl -s "http://localhost:5173" >/dev/null 2>&1; then
        echo "   ✅ Frontend is now running"
    else
        echo "   ⚠️  Frontend may still be starting..."
    fi
fi

echo ""
echo "🎉 Application Status:"
echo "   Backend:  http://localhost:8080"
echo "   Frontend: http://localhost:5173"
echo ""
echo "🌐 Open: http://localhost:5173"