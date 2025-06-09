#!/bin/bash

# Application Stop Script
# Stops both Go backend and React frontend

echo "🛑 Stopping Equity Trading Platform..."
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Stop React frontend
log "Stopping React frontend..."
if [ -f ".frontend_pid" ]; then
    frontend_pid=$(cat .frontend_pid)
    if kill -0 $frontend_pid 2>/dev/null; then
        kill $frontend_pid
        success "✅ Stopped React frontend (PID: $frontend_pid)"
    else
        warning "⚠️  Frontend PID not found"
    fi
    rm -f .frontend_pid
else
    log "No frontend PID file found"
fi

# Force stop anything on port 5173
if check_port 5173; then
    warning "🔨 Force stopping process on port 5173..."
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    sleep 2
    if check_port 5173; then
        warning "⚠️  Port 5173 still in use"
    else
        success "✅ Port 5173 freed"
    fi
fi

# Stop Go backend
log "Stopping Go backend..."
if [ -f ".backend_pid" ]; then
    backend_pid=$(cat .backend_pid)
    if kill -0 $backend_pid 2>/dev/null; then
        kill $backend_pid
        success "✅ Stopped Go backend (PID: $backend_pid)"
    else
        warning "⚠️  Backend PID not found"
    fi
    rm -f .backend_pid
else
    log "No backend PID file found"
fi

# Stop Docker containers (if running)
if [ -f "docker-compose.yml" ]; then
    log "Stopping Docker containers..."
    docker-compose down --timeout 10 > /dev/null 2>&1 || true
    success "✅ Docker containers stopped"
fi

# Force stop anything on port 8080
if check_port 8080; then
    warning "🔨 Force stopping process on port 8080..."
    lsof -ti:8080 | xargs kill -9 2>/dev/null || true
    sleep 2
    if check_port 8080; then
        warning "⚠️  Port 8080 still in use"
    else
        success "✅ Port 8080 freed"
    fi
fi

# Clean up log files
log "Cleaning up log files..."
rm -f backend.log frontend.log
success "✅ Log files cleaned"

echo ""
log "Final Status Check:"
echo "=================="

if check_port 8080; then
    warning "⚠️  Port 8080 still in use"
else
    success "✅ Port 8080 is free"
fi

if check_port 5173; then
    warning "⚠️  Port 5173 still in use"
else
    success "✅ Port 5173 is free"
fi

echo ""
success "🎉 All services stopped successfully!"
echo ""
echo "📋 To restart:"
echo "   • Full stack: ./start-full-application.sh"
echo "   • Backend only: ./run.sh"
echo "   • Frontend only: ./run-react-app.sh"
echo ""