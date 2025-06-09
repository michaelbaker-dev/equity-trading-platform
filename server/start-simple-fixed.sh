#!/bin/bash

# Fixed Simple Startup Script for Equity Trading Platform
echo "🚀 Starting Equity Trading Platform (Fixed)"
echo "============================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# Kill any existing processes
cleanup_processes() {
    log "Cleaning up existing processes..."
    
    # Kill any existing Go processes
    pkill -f "go run cmd/main.go" 2>/dev/null || true
    pkill -f "equity-server" 2>/dev/null || true
    
    # Kill any existing Vite processes
    pkill -f "vite" 2>/dev/null || true
    
    # Wait a moment
    sleep 2
    
    success "✅ Cleanup completed"
}

# Start Go backend
start_backend() {
    log "Starting Go backend..."
    
    # Check if already running
    if curl -s "http://localhost:8080/health" >/dev/null 2>&1; then
        success "✅ Backend already running"
        return 0
    fi
    
    # Check if we're in the right directory
    if [ ! -f "cmd/main.go" ]; then
        error "❌ cmd/main.go not found. Make sure you're in the server directory"
        return 1
    fi
    
    # Start backend in background
    log "📦 Starting Go backend server..."
    nohup go run cmd/main.go > backend.log 2>&1 &
    
    # Get the PID and save it
    BACKEND_PID=$!
    echo $BACKEND_PID > .backend_pid
    
    # Wait for backend to start
    log "⏳ Waiting for backend to start..."
    local attempts=0
    local max_attempts=10
    
    while [ $attempts -lt $max_attempts ]; do
        if curl -s "http://localhost:8080/health" >/dev/null 2>&1; then
            success "✅ Backend started successfully (PID: $BACKEND_PID)"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempts=$((attempts + 1))
    done
    
    echo ""
    error "❌ Backend failed to start"
    return 1
}

# Start React frontend
start_frontend() {
    log "Starting React frontend..."
    
    # Navigate to react frontend directory
    if [ ! -d "react-frontend" ]; then
        error "❌ react-frontend directory not found"
        return 1
    fi
    
    cd react-frontend
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        error "❌ package.json not found"
        cd ..
        return 1
    fi
    
    # Install dependencies
    log "📦 Installing dependencies..."
    npm install > /dev/null 2>&1
    
    # Start development server in background
    log "🌐 Starting React development server..."
    nohup npm run dev > ../frontend.log 2>&1 &
    
    # Get the PID and save it
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../.frontend_pid
    
    cd ..
    
    # Wait for frontend to start
    log "⏳ Waiting for frontend to start..."
    local attempts=0
    local max_attempts=15
    
    while [ $attempts -lt $max_attempts ]; do
        if curl -s "http://localhost:5173" >/dev/null 2>&1; then
            success "✅ Frontend started successfully (PID: $FRONTEND_PID)"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempts=$((attempts + 1))
    done
    
    echo ""
    warning "⚠️  Frontend may still be starting..."
    return 0
}

# Show status
show_status() {
    echo ""
    log "Application Status:"
    echo "=================="
    
    # Check backend
    if curl -s "http://localhost:8080/health" >/dev/null 2>&1; then
        success "✅ Backend: http://localhost:8080"
    else
        error "❌ Backend: Not responding"
        echo "   Check backend.log for errors"
    fi
    
    # Check frontend
    if curl -s "http://localhost:5173" >/dev/null 2>&1; then
        success "✅ Frontend: http://localhost:5173"
    else
        error "❌ Frontend: Not responding"
        echo "   Check frontend.log for errors"
    fi
    
    echo ""
    echo "🌐 Open in browser: http://localhost:5173"
    echo "🛑 To stop: ./stop-application.sh"
    echo ""
    echo "📋 Log files:"
    echo "   • Backend: backend.log"
    echo "   • Frontend: frontend.log"
    echo ""
}

# Main execution
main() {
    # Cleanup any existing processes
    cleanup_processes
    
    # Start backend
    if ! start_backend; then
        error "❌ Failed to start backend"
        exit 1
    fi
    
    # Start frontend
    if ! start_frontend; then
        error "❌ Failed to start frontend"
        exit 1
    fi
    
    # Show status
    show_status
    
    # Open browser
    sleep 2
    case "$(uname -s)" in
        Darwin*) open "http://localhost:5173" ;;
        Linux*) xdg-open "http://localhost:5173" 2>/dev/null || true ;;
        *) echo "Open http://localhost:5173 in your browser" ;;
    esac
    
    success "🎉 Application started successfully!"
    echo ""
    echo "Press Ctrl+C to stop and view logs..."
    echo ""
    
    # Monitor processes
    trap 'echo ""; warning "Stopping..."; ./stop-application.sh; exit 0' INT
    
    # Keep script running and show basic status
    while true; do
        sleep 30
        
        # Basic health check
        if ! curl -s "http://localhost:8080/health" >/dev/null 2>&1; then
            warning "⚠️  Backend seems to be down"
        fi
        
        if ! curl -s "http://localhost:5173" >/dev/null 2>&1; then
            warning "⚠️  Frontend seems to be down"
        fi
    done
}

# Run main function
main "$@"