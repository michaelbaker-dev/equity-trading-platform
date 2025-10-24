#!/bin/bash

# Full Application Restart Script (Simple Version)
# Always kills existing processes and starts fresh
# Runs everything in background and exits

set -e

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

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "run.sh" ] || [ ! -d "react-frontend" ]; then
    error "Must be run from the server directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected files: run.sh, react-frontend/"
    exit 1
fi

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill all existing processes
kill_all_processes() {
    log "🛑 Stopping any existing processes..."
    
    # Stop frontend
    if [ -f ".frontend_pid" ]; then
        frontend_pid=$(cat .frontend_pid)
        if kill -0 $frontend_pid 2>/dev/null; then
            kill $frontend_pid 2>/dev/null || true
            log "Stopped frontend (PID: $frontend_pid)"
        fi
        rm -f .frontend_pid
    fi
    
    # Stop backend
    if [ -f ".backend_pid" ]; then
        backend_pid=$(cat .backend_pid)
        if kill -0 $backend_pid 2>/dev/null; then
            kill $backend_pid 2>/dev/null || true
            log "Stopped backend (PID: $backend_pid)"
        fi
        rm -f .backend_pid
    fi
    
    # Stop Docker containers
    if docker ps -q --filter "name=equity" 2>/dev/null | grep -q .; then
        log "Stopping Docker containers..."
        docker-compose down --timeout 10 > /dev/null 2>&1 || true
    fi
    
    # Force kill ports
    if check_port 5173; then
        log "Force stopping port 5173..."
        lsof -ti:5173 | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
    
    if check_port 8080; then
        log "Force stopping port 8080..."
        lsof -ti:8080 | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
    
    # Clean logs
    rm -f backend.log frontend.log docker-*.log frontend-build.log
    
    success "✅ All processes stopped"
}

# Function to ensure Docker is running
ensure_docker() {
    log "Checking Docker..."
    
    if docker info >/dev/null 2>&1; then
        success "✅ Docker is running"
        return 0
    fi
    
    warning "⚠️  Docker not running, starting..."
    open -a Docker 2>/dev/null || {
        error "❌ Failed to start Docker Desktop"
        return 1
    }
    
    # Wait for Docker
    local attempts=12
    while [ $attempts -gt 0 ]; do
        if docker info >/dev/null 2>&1; then
            success "✅ Docker started"
            return 0
        fi
        echo -n "."
        sleep 5
        attempts=$((attempts - 1))
    done
    
    echo ""
    error "❌ Docker failed to start"
    return 1
}

# Function to start backend
start_backend() {
    log "🐳 Starting backend with Docker..."
    
    # Build and start
    log "Building and starting backend containers..."
    
    # Use the existing run.sh script
    chmod +x run.sh
    
    # Run in background, capture output
    echo "n" | ./run.sh --no-browser > backend-startup.log 2>&1 &
    
    # Wait for backend
    log "Waiting for backend to be ready..."
    local attempts=30
    while [ $attempts -gt 0 ]; do
        if curl -s -f "http://localhost:8080/health" >/dev/null 2>&1; then
            success "✅ Backend is ready"
            return 0
        fi
        echo -n "."
        sleep 2
        attempts=$((attempts - 1))
    done
    
    echo ""
    error "❌ Backend failed to start"
    tail -20 backend-startup.log 2>/dev/null || true
    return 1
}

# Function to start frontend
start_frontend() {
    log "⚛️  Starting React frontend..."
    
    cd react-frontend
    
    # Install deps if needed
    if [ ! -d "node_modules" ]; then
        log "📦 Installing dependencies..."
        npm install
    fi
    
    # Clean build artifacts
    rm -rf dist/ .vite/ 2>/dev/null || true
    
    # Start dev server
    log "Starting development server..."
    nohup npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    
    echo $FRONTEND_PID > ../.frontend_pid
    cd ..
    
    # Wait for frontend
    log "Waiting for frontend to start..."
    local attempts=30
    while [ $attempts -gt 0 ]; do
        if check_port 5173; then
            sleep 2
            if curl -s "http://localhost:5173" | grep -q "DOCTYPE\|html" 2>/dev/null; then
                success "✅ Frontend is ready"
                return 0
            fi
        fi
        echo -n "."
        sleep 2
        attempts=$((attempts - 1))
    done
    
    echo ""
    error "❌ Frontend failed to start"
    tail -20 frontend.log 2>/dev/null || true
    return 1
}

# Show status
show_status() {
    echo ""
    echo "🎉 Application Started!"
    echo "====================="
    echo ""
    echo "🌐 Access:"
    echo "   • App: http://localhost:5173"
    echo "   • API: http://localhost:8080"
    echo ""
    echo "📝 Logs:"
    echo "   • Frontend: tail -f frontend.log"
    echo "   • Backend: docker-compose logs -f"
    echo ""
    echo "🛑 Stop: ./stop-application.sh"
    echo ""
}

# Main
main() {
    echo "🚀 Full Application Restart"
    echo "=========================="
    echo ""
    
    # Parse args
    NO_BROWSER=false
    if [ "$1" = "--no-browser" ]; then
        NO_BROWSER=true
    fi
    
    # Kill everything first
    kill_all_processes
    
    # Ensure Docker
    if ! ensure_docker; then
        exit 1
    fi
    
    # Start backend
    if ! start_backend; then
        error "❌ Backend startup failed"
        exit 1
    fi
    
    # Start frontend
    if ! start_frontend; then
        error "❌ Frontend startup failed"
        docker-compose down
        exit 1
    fi
    
    # Show status
    show_status
    
    # Open browser
    if [ "$NO_BROWSER" = false ]; then
        sleep 2
        case "$(uname -s)" in
            Darwin*) open "http://localhost:5173" ;;
            *) echo "Open: http://localhost:5173" ;;
        esac
    fi
    
    log "Services running in background"
}

# Run
main "$@"