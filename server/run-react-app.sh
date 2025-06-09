#!/bin/bash

# React App Startup Script
# Starts the React development server for the equity trading platform

set -e

echo "🚀 Starting React Equity Trading Platform..."
echo "============================================"

# Check if we're in the right directory
if [ ! -f "react-frontend/package.json" ]; then
    echo "❌ Error: Must be run from the server directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected files: react-frontend/package.json"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "   Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed"
    echo "   Please install npm (usually comes with Node.js)"
    exit 1
fi

# Display Node.js and npm versions
echo "📋 Environment Info:"
echo "   Node.js: $(node --version)"
echo "   npm: $(npm --version)"
echo "   Working directory: $(pwd)"
echo ""

# Navigate to React frontend directory
cd react-frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
    echo ""
fi

# Build the project to ensure everything is working
echo "🔨 Building project to verify setup..."
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed - checking for issues..."
    npm run build
    exit 1
fi
echo ""

# Start the development server
echo "🌐 Starting development server..."
echo "   Local URL: http://localhost:5173/"
echo "   Press Ctrl+C to stop the server"
echo ""
echo "🔄 To restart, run: ./run-react-app.sh"
echo "============================================"
echo ""

# Start the dev server
npm run dev