#!/bin/bash

# Enhanced Full Application Startup Script with Auto-Restart
# - Checks for code changes
# - Rebuilds Docker container if needed
# - Kills existing processes before starting
# - Runs everything in background
# - Detects and rebuilds on code changes

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

# Function to compute hash of backend code
get_backend_hash() {
    find . -name "*.go" -type f \
        -not -path "./vendor/*" \
        -not -path "./.git/*" \
        -exec md5sum {} \; | \
        sort | md5sum | cut -d' ' -f1
}

# Function to compute hash of frontend code
get_frontend_hash() {
    if [ -d "react-frontend" ]; then
        cd react-frontend
        find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.css" \) -type f \
            -not -path "./node_modules/*" \
            -not -path "./dist/*" \
            -not -path "./.git/*" \
            -exec md5sum {} \; 2>/dev/null | \
            sort | md5sum | cut -d' ' -f1
        cd ..
    else
        echo "no-frontend"
    fi
}

# Function to check if Docker image needs rebuild
needs_docker_rebuild() {
    local current_hash=$(get_backend_hash)
    local last_hash=""
    
    if [ -f ".backend_build_hash" ]; then
        last_hash=$(cat .backend_build_hash)
    fi
    
    if [ "$current_hash" != "$last_hash" ]; then
        log "Backend code has changed (hash: ${current_hash:0:8}...)"
        return 0  # Needs rebuild
    else
        log "Backend code unchanged (hash: ${current_hash:0:8}...)"
        return 1  # No rebuild needed
    fi
}

# Function to check if frontend needs rebuild
needs_frontend_rebuild() {
    local current_hash=$(get_frontend_hash)
    local last_hash=""
    
    if [ -f ".frontend_build_hash" ]; then
        last_hash=$(cat .frontend_build_hash)
    fi
    
    if [ "$current_hash" != "$last_hash" ]; then
        log "Frontend code has changed (hash: ${current_hash:0:8}...)"
        return 0  # Needs rebuild
    else
        log "Frontend code unchanged (hash: ${current_hash:0:8}...)"
        return 1  # No rebuild needed
    fi
}

# Function to kill existing processes
kill_existing_processes() {
    log "🛑 Stopping any existing processes..."
    
    # Stop React frontend
    if [ -f ".frontend_pid" ]; then
        frontend_pid=$(cat .frontend_pid)
        if kill -0 $frontend_pid 2>/dev/null; then
            kill $frontend_pid 2>/dev/null || true
            log "Stopped React frontend (PID: $frontend_pid)"
        fi
        rm -f .frontend_pid
    fi
    
    # Stop Go backend
    if [ -f ".backend_pid" ]; then
        backend_pid=$(cat .backend_pid)
        if kill -0 $backend_pid 2>/dev/null; then
            kill $backend_pid 2>/dev/null || true
            log "Stopped Go backend (PID: $backend_pid)"
        fi
        rm -f .backend_pid
    fi
    
    # Stop Docker containers
    if docker ps -q --filter "name=equity" 2>/dev/null | grep -q .; then
        log "Stopping Docker containers..."
        docker-compose down --timeout 10 > /dev/null 2>&1 || true
    fi
    
    # Force kill ports if needed
    if check_port 5173; then
        log "Force stopping process on port 5173..."
        lsof -ti:5173 | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
    
    if check_port 8080; then
        log "Force stopping process on port 8080..."
        lsof -ti:8080 | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
    
    # Clean up log files
    rm -f backend.log frontend.log
    
    success "✅ All existing processes stopped"
}

# Function to start backend with Docker
start_backend_docker() {
    log "🐳 Starting Go backend with Docker..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        error "❌ Docker is not running"
        log "🐳 Starting Docker Desktop..."
        
        # Try to start Docker on macOS
        open -a Docker 2>/dev/null || {
            error "❌ Failed to start Docker Desktop"
            return 1
        }
        
        # Wait for Docker to start
        local attempts=12
        while [ $attempts -gt 0 ]; do
            if docker info >/dev/null 2>&1; then
                success "✅ Docker is now running"
                break
            fi
            log "Waiting for Docker... ($attempts attempts left)"
            sleep 5
            attempts=$((attempts - 1))
        done
        
        if ! docker info >/dev/null 2>&1; then
            error "❌ Docker failed to start"
            return 1
        fi
    fi
    
    # Check if rebuild is needed
    if needs_docker_rebuild; then
        warning "🔨 Backend code changed - rebuilding Docker image..."
        
        # Build Docker image
        log "Building Docker image..."
        if docker-compose build --no-cache > docker-build.log 2>&1; then
            success "✅ Docker image built successfully"
            # Save the hash
            get_backend_hash > .backend_build_hash
        else
            error "❌ Docker build failed"
            tail -20 docker-build.log
            return 1
        fi
    else
        success "✅ Using existing Docker image (no code changes)"
    fi
    
    # Start Docker containers in background
    log "Starting Docker containers..."
    if docker-compose up -d > docker-startup.log 2>&1; then
        success "✅ Docker containers started"
    else
        error "❌ Failed to start Docker containers"
        tail -20 docker-startup.log
        return 1
    fi
    
    # Wait for backend to be ready
    log "Waiting for backend to be ready..."
    local attempts=30
    while [ $attempts -gt 0 ]; do
        if curl -s -f "http://localhost:8080/health" >/dev/null 2>&1; then
            success "✅ Backend is healthy and ready"
            return 0
        fi
        sleep 2
        attempts=$((attempts - 1))
    done
    
    error "❌ Backend failed to become healthy"
    docker-compose logs --tail=50
    return 1
}

# Function to start React frontend
start_frontend() {
    log "⚛️  Starting React frontend..."
    
    # Check if directory exists
    if [ ! -d "react-frontend" ]; then
        error "❌ React frontend directory not found"
        echo "   Current directory: $(pwd)"
        echo "   Expected: react-frontend/"
        return 1
    fi
    
    cd react-frontend
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        error "❌ package.json not found in react-frontend directory"
        cd ..
        return 1
    fi
    
    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        log "📦 Installing React dependencies..."
        npm install
    fi
    
    # Clean any existing build artifacts that might cause issues
    log "🧹 Cleaning build artifacts..."
    rm -rf dist/ .vite/ 2>/dev/null || true
    
    # Check if rebuild is needed
    if needs_frontend_rebuild; then
        warning "🔨 Frontend code changed - verifying build..."
        
        # Build to verify no errors
        log "Running build verification..."
        if npm run build > ../frontend-build.log 2>&1; then
            success "✅ React build verification passed"
            # Save the hash
            get_frontend_hash > ../.frontend_build_hash
        else
            error "❌ React build verification failed"
            error "Build errors:"
            cd ..
            grep -E "(error|ERROR)" frontend-build.log | head -10 || tail -20 frontend-build.log
            return 1
        fi
    else
        success "✅ Frontend code unchanged"
    fi
    
    # Start dev server in background
    log "Starting React development server..."
    nohup npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    
    # Store PID
    echo $FRONTEND_PID > ../.frontend_pid
    
    cd ..
    
    # Wait for frontend to be ready
    log "Waiting for React app to start..."
    local attempts=30
    while [ $attempts -gt 0 ]; do
        if check_port 5173; then
            # Additional check to ensure it's actually responding
            sleep 2
            if curl -s "http://localhost:5173" | grep -q "DOCTYPE\|html" 2>/dev/null; then
                success "✅ React frontend is ready on port 5173"
                return 0
            fi
        fi
        echo -n "."
        sleep 2
        attempts=$((attempts - 1))
    done
    
    echo ""
    error "❌ React frontend failed to start"
    error "Frontend logs:"
    tail -30 frontend.log 2>/dev/null || echo "No logs available"
    return 1
}

# Function to show final status
show_final_status() {
    echo ""
    echo "🎉 Application Started Successfully!"
    echo "===================================="
    echo ""
    echo "🌐 Access Points:"
    echo "   • Application: http://localhost:5173"
    echo "   • API Server: http://localhost:8080"
    echo "   • API Docs: http://localhost:8080/api/v1"
    echo "   • WebSocket: ws://localhost:8080/api/v1/ws/stocks"
    echo ""
    echo "📋 Process Management:"
    echo "   • Frontend PID: $(cat .frontend_pid 2>/dev/null || echo 'N/A')"
    echo "   • Backend: Docker containers running"
    echo ""
    echo "📝 Logs:"
    echo "   • Frontend: tail -f frontend.log"
    echo "   • Backend: docker-compose logs -f"
    echo ""
    echo "🛑 To stop everything:"
    echo "   • ./stop-application.sh"
    echo ""
    echo "🔄 To restart with this script:"
    echo "   • ./start-full-auto-restart.sh"
    echo ""
}

# Main execution
main() {
    echo "🚀 Enhanced Full Application Startup with Auto-Restart"
    echo "====================================================="
    echo ""
    
    # Parse arguments
    NO_BROWSER=false
    while [[ $# -gt 0 ]]; do
        case $1 in
            --no-browser)
                NO_BROWSER=true
                shift
                ;;
            -h|--help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --no-browser   Don't open browser after startup"
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
    
    # Step 1: Kill any existing processes
    kill_existing_processes
    
    # Step 2: Start backend with Docker
    if start_backend_docker; then
        success "✅ Backend started successfully"
    else
        error "❌ Failed to start backend"
        exit 1
    fi
    
    # Step 3: Start frontend
    if start_frontend; then
        success "✅ Frontend started successfully"
    else
        error "❌ Failed to start frontend"
        # Stop backend since frontend failed
        docker-compose down
        exit 1
    fi
    
    # Step 4: Show status
    show_final_status
    
    # Step 5: Open browser if requested
    if [ "$NO_BROWSER" = false ]; then
        log "Opening browser..."
        case "$(uname -s)" in
            Darwin*)    open "http://localhost:5173" ;;
            Linux*)     xdg-open "http://localhost:5173" 2>/dev/null || true ;;
            *)          echo "Please open: http://localhost:5173" ;;
        esac
    fi
    
    # Script exits - processes continue in background
    log "Script completed. Services running in background."
}

# Run main function
main "$@"