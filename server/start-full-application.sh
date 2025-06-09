#!/bin/bash

# Full Application Startup Script
# Starts both Go backend server and React frontend

set -e

echo "🚀 Starting Full Equity Trading Platform..."
echo "==========================================="
echo ""

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

# Function to start Go backend
start_backend() {
    log "Starting Go backend server..."
    
    # Check if backend is already running
    if check_port 8080; then
        success "✅ Go backend already running on port 8080"
        return 0
    fi
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        error "❌ Docker is not running"
        log "🐳 Starting Docker Desktop..."
        
        # Try to start Docker on macOS
        open -a Docker 2>/dev/null || {
            error "❌ Failed to start Docker Desktop"
            echo ""
            echo "📋 Please manually start Docker Desktop and try again:"
            echo "   1. Open Docker Desktop application"
            echo "   2. Wait for Docker to start (whale icon in menu bar)"
            echo "   3. Run this script again"
            echo ""
            return 1
        }
        
        # Wait for Docker to start (up to 60 seconds)
        log "⏳ Waiting for Docker to start..."
        local docker_attempts=12
        local docker_attempt=1
        
        while [ $docker_attempt -le $docker_attempts ]; do
            if docker info >/dev/null 2>&1; then
                success "✅ Docker is now running"
                break
            fi
            
            log "Docker attempt $docker_attempt/$docker_attempts: Not ready, waiting 5 seconds..."
            sleep 5
            docker_attempt=$((docker_attempt + 1))
        done
        
        if ! docker info >/dev/null 2>&1; then
            error "❌ Docker failed to start within 60 seconds"
            echo "Please start Docker manually and try again"
            return 1
        fi
    fi
    
    # Start the backend using the existing script
    log "🔨 Building and starting Go backend (Docker)..."
    
    # Make run.sh executable if needed
    chmod +x run.sh
    
    # Start backend and wait for it to complete startup
    log "📋 Running backend startup script..."
    if ! echo "n" | ./run.sh --no-browser > backend.log 2>&1; then
        error "❌ Backend startup script failed"
        echo ""
        warning "Backend logs:"
        tail -20 backend.log 2>/dev/null || echo "No logs available"
        return 1
    fi
    
    # Backend script completed successfully, now verify it's running
    log "⏳ Verifying Go backend is ready..."
    
    # Wait a moment for services to be fully ready
    sleep 3
    
    # Quick health check
    if curl -s -f "http://localhost:8080/health" >/dev/null 2>&1; then
        success "✅ Go backend is healthy and ready"
        return 0
    else
        error "❌ Backend health check failed"
        echo ""
        warning "Backend logs:"
        tail -20 backend.log 2>/dev/null || echo "No logs available"
        return 1
    fi
}

# Function to start React frontend
start_frontend() {
    log "Starting React frontend..."
    
    # Check if frontend is already running
    if check_port 5173; then
        success "✅ React frontend already running on port 5173"
        return 0
    fi
    
    # Navigate to react frontend directory
    cd react-frontend
    
    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        log "📦 Installing React dependencies..."
        npm install
    fi
    
    # Build check
    log "🔨 Verifying React build..."
    if npm run build > /dev/null 2>&1; then
        success "✅ React build verification passed"
    else
        error "❌ React build failed"
        cd ..
        return 1
    fi
    
    # Start dev server
    log "🌐 Starting React development server..."
    npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    
    # Store PID for cleanup
    echo $FRONTEND_PID > ../.frontend_pid
    
    cd ..
    
    # Wait for frontend to be ready
    local max_attempts=12
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if check_port 5173; then
            success "✅ React frontend is ready on port 5173"
            return 0
        fi
        
        log "Attempt $attempt/$max_attempts: Frontend not ready, waiting 5 seconds..."
        sleep 5
        attempt=$((attempt + 1))
    done
    
    error "❌ React frontend failed to start within 1 minute"
    
    # Show frontend logs for debugging
    echo ""
    warning "Frontend logs:"
    tail -20 frontend.log || echo "No frontend logs available"
    
    return 1
}

# Function to show application status
show_status() {
    echo ""
    log "Application Status:"
    echo "==================="
    
    # Check backend
    if check_port 8080; then
        success "✅ Go Backend: Running on http://localhost:8080"
        if curl -s -f "http://localhost:8080/health" >/dev/null 2>&1; then
            success "   └─ Health check: PASSED"
        else
            warning "   └─ Health check: PENDING"
        fi
    else
        error "❌ Go Backend: Not running"
    fi
    
    # Check frontend
    if check_port 5173; then
        success "✅ React Frontend: Running on http://localhost:5173"
    else
        error "❌ React Frontend: Not running"
    fi
    
    echo ""
    echo "🌐 Access the application:"
    echo "   • Main URL: http://localhost:5173"
    echo "   • API URL: http://localhost:8080/api/v1"
    echo "   • WebSocket: ws://localhost:8080/api/v1/ws/stocks"
    echo ""
    echo "📋 Management:"
    echo "   • Stop: ./stop-application.sh"
    echo "   • Backend logs: tail -f backend.log"
    echo "   • Frontend logs: tail -f frontend.log"
    echo "   • Backend only: ./run.sh"
    echo "   • Frontend only: ./run-react-app.sh"
    echo ""
}

# Function to launch browser
launch_browser() {
    log "🌐 Launching web browser..."
    
    sleep 2  # Wait for everything to be ready
    
    case "$(uname -s)" in
        Darwin*)    # macOS
            open "http://localhost:5173"
            ;;
        Linux*)     # Linux
            if command -v xdg-open >/dev/null; then
                xdg-open "http://localhost:5173"
            elif command -v gnome-open >/dev/null; then
                gnome-open "http://localhost:5173"
            else
                warning "Please open: http://localhost:5173"
            fi
            ;;
        CYGWIN*|MINGW*|MSYS*)  # Windows
            start "http://localhost:5173"
            ;;
        *)
            warning "Please open: http://localhost:5173"
            ;;
    esac
}

# Cleanup function
cleanup() {
    echo ""
    warning "Cleaning up processes..."
    
    # Kill frontend if PID file exists
    if [ -f ".frontend_pid" ]; then
        frontend_pid=$(cat .frontend_pid)
        if kill -0 $frontend_pid 2>/dev/null; then
            kill $frontend_pid
            log "Stopped React frontend (PID: $frontend_pid)"
        fi
        rm -f .frontend_pid
    fi
    
    # Kill backend if PID file exists
    if [ -f ".backend_pid" ]; then
        backend_pid=$(cat .backend_pid)
        if kill -0 $backend_pid 2>/dev/null; then
            kill $backend_pid
            log "Stopped Go backend (PID: $backend_pid)"
        fi
        rm -f .backend_pid
    fi
    
    # Additional cleanup - kill any processes on our ports
    if check_port 5173; then
        warning "Force stopping process on port 5173..."
        lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    fi
    
    if check_port 8080; then
        warning "Force stopping process on port 8080..."
        lsof -ti:8080 | xargs kill -9 2>/dev/null || true
    fi
}

# Handle interruption
handle_interrupt() {
    echo ""
    warning "Received interrupt signal..."
    cleanup
    exit 1
}

# Set up signal handlers
trap handle_interrupt INT TERM

# Main execution
main() {
    # Parse arguments
    LAUNCH_BROWSER=true
    STATUS_ONLY=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --no-browser)
                LAUNCH_BROWSER=false
                shift
                ;;
            --status)
                STATUS_ONLY=true
                shift
                ;;
            -h|--help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --no-browser   Don't launch web browser"
                echo "  --status       Show status only"
                echo "  -h, --help     Show this help"
                echo ""
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    if [ "$STATUS_ONLY" = true ]; then
        show_status
        exit 0
    fi
    
    # Start both services
    log "🔄 Starting full application stack..."
    
    # Start backend first
    if start_backend; then
        success "✅ Backend started successfully"
    else
        error "❌ Failed to start backend"
        cleanup
        exit 1
    fi
    
    # Start frontend
    if start_frontend; then
        success "✅ Frontend started successfully"
    else
        error "❌ Failed to start frontend"
        cleanup
        exit 1
    fi
    
    # Show status
    show_status
    
    # Launch browser if requested
    if [ "$LAUNCH_BROWSER" = true ]; then
        launch_browser
        success "🌐 Browser launched"
    fi
    
    echo ""
    success "🎉 Full application stack started successfully!"
    echo ""
    echo "Press Ctrl+C to stop all services..."
    
    # Keep script running to handle cleanup
    while true; do
        sleep 10
        # Quick health check
        if ! check_port 8080 || ! check_port 5173; then
            error "❌ One or more services have stopped unexpectedly"
            show_status
            cleanup
            exit 1
        fi
    done
}

# Run main function
main "$@"