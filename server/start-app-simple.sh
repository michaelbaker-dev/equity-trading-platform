#!/bin/bash

# Simple Application Startup Script
# Handles Docker startup and runs both backend and frontend

echo "🚀 Starting Equity Trading Platform (Simple Mode)"
echo "================================================"

# Parse command line arguments
SHOW_DEBUG_WINDOW=true
SHOW_HELP=false

for arg in "$@"; do
    case $arg in
        --no-debug)
            SHOW_DEBUG_WINDOW=false
            shift
            ;;
        --debug)
            SHOW_DEBUG_WINDOW=true
            shift
            ;;
        --help|-h)
            SHOW_HELP=true
            shift
            ;;
        *)
            # Unknown option
            ;;
    esac
done

# Show help if requested
if [ "$SHOW_HELP" = true ]; then
    echo "Usage: ./start-app-simple.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --debug         Show WebSocket debug window (default)"
    echo "  --no-debug      Hide WebSocket debug window"
    echo "  --help, -h      Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./start-app-simple.sh                # Start with debug window"
    echo "  ./start-app-simple.sh --no-debug     # Start without debug window"
    echo "  ./start-app-simple.sh --debug        # Start with debug window (explicit)"
    echo ""
    exit 0
fi

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

# Check if Docker is running, start if needed
check_and_start_docker() {
    log "Checking Docker status..."
    
    if docker info >/dev/null 2>&1; then
        success "✅ Docker is running"
        return 0
    fi
    
    warning "⚠️  Docker is not running"
    log "🐳 Starting Docker Desktop..."
    
    # Start Docker Desktop
    open -a Docker
    
    # Wait for Docker to start
    log "⏳ Waiting for Docker to start (this may take 30-60 seconds)..."
    
    local attempts=0
    local max_attempts=24  # 2 minutes
    
    while [ $attempts -lt $max_attempts ]; do
        if docker info >/dev/null 2>&1; then
            success "✅ Docker is now running"
            return 0
        fi
        
        echo -n "."
        sleep 5
        attempts=$((attempts + 1))
    done
    
    echo ""
    error "❌ Docker failed to start within 2 minutes"
    echo ""
    echo "📋 Please try:"
    echo "   1. Manually open Docker Desktop"
    echo "   2. Wait for the whale icon to appear in your menu bar"
    echo "   3. Run this script again"
    echo ""
    return 1
}

# Start backend
start_backend() {
    log "Starting Go backend..."
    
    # Check if already running
    if curl -s "http://localhost:8080/health" >/dev/null 2>&1; then
        success "✅ Backend already running"
        return 0
    fi
    
    # Start backend
    log "📦 Building and starting backend containers..."
    chmod +x run.sh
    
    if echo "n" | ./run.sh --no-browser; then
        success "✅ Backend started successfully"
        return 0
    else
        error "❌ Backend failed to start"
        return 1
    fi
}

# Check if Supabase is running
check_supabase() {
    log "Checking Supabase status..."
    
    if curl -s "http://127.0.0.1:54321/health" >/dev/null 2>&1; then
        success "✅ Supabase is running"
        return 0
    else
        warning "⚠️  Supabase is not running"
        echo ""
        echo "📋 To start Supabase:"
        echo "   1. Make sure you have Supabase CLI installed"
        echo "   2. Run: supabase start"
        echo "   3. Then run this script again"
        echo ""
        echo "🔄 Continuing without Supabase (will use localStorage fallback)..."
        return 0
    fi
}

# Start frontend  
start_frontend() {
    log "Starting React frontend..."
    
    # Check if already running
    if curl -s "http://localhost:5173" >/dev/null 2>&1; then
        success "✅ Frontend already running"
        return 0
    fi
    
    # Navigate to frontend directory
    cd react-frontend || {
        error "❌ React frontend directory not found"
        return 1
    }
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        error "❌ package.json not found in react-frontend directory"
        cd ..
        return 1
    fi
    
    # Install/update dependencies including Supabase
    log "📦 Installing/updating React dependencies (including Supabase)..."
    npm install
    
    # Verify Supabase packages are installed
    if ! npm list @supabase/supabase-js >/dev/null 2>&1; then
        log "📦 Installing missing Supabase packages..."
        npm install @supabase/supabase-js @supabase/auth-helpers-react
    fi
    
    # Update .env.local with debug setting
    log "📝 Updating environment configuration..."
    cat > .env.local << EOF
# Supabase Configuration for Local Development
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# Debug Configuration
VITE_SHOW_DEBUG_WINDOW=$SHOW_DEBUG_WINDOW
EOF

    if [ "$SHOW_DEBUG_WINDOW" = true ]; then
        success "✅ WebSocket debug window will be shown"
    else
        warning "🔇 WebSocket debug window will be hidden"
    fi
    
    # Clear any previous builds that might cause issues
    log "🧹 Cleaning previous builds..."
    rm -rf dist/ .vite/
    
    # Start development server
    log "🌐 Starting React development server..."
    npm run dev &
    FRONTEND_PID=$!
    
    cd ..
    echo $FRONTEND_PID > .frontend_pid
    
    # Wait for frontend to be ready (increased wait time for Supabase initialization)
    log "⏳ Waiting for React app to start (this may take 15-30 seconds)..."
    
    local attempts=0
    local max_attempts=15  # 75 seconds total
    
    while [ $attempts -lt $max_attempts ]; do
        if curl -s "http://localhost:5173" >/dev/null 2>&1; then
            # Additional check - make sure it's not just serving but actually loaded
            sleep 3
            if curl -s "http://localhost:5173" | grep -q "DOCTYPE\|html" 2>/dev/null; then
                success "✅ Frontend started successfully"
                return 0
            fi
        fi
        
        echo -n "."
        sleep 5
        attempts=$((attempts + 1))
    done
    
    echo ""
    warning "⚠️  Frontend may still be starting or there may be build errors..."
    log "Check the console output above for any error messages"
    return 0
}

# Show final status
show_final_status() {
    echo ""
    log "Application Status:"
    echo "=================="
    
    # Check backend
    if curl -s "http://localhost:8080/health" >/dev/null 2>&1; then
        success "✅ Backend: http://localhost:8080"
    else
        error "❌ Backend: Not responding"
    fi
    
    # Check frontend  
    if curl -s "http://localhost:5173" >/dev/null 2>&1; then
        success "✅ Frontend: http://localhost:5173"
    else
        error "❌ Frontend: Not responding"
    fi
    
    echo ""
    echo "🌐 Open in browser: http://localhost:5173"
    echo "🛑 To stop: ./stop-application.sh"
    echo ""
}

# Main execution
main() {
    # Step 1: Ensure Docker is running
    if ! check_and_start_docker; then
        exit 1
    fi
    
    # Step 2: Check Supabase (optional)
    check_supabase
    
    # Step 3: Start backend
    if ! start_backend; then
        error "❌ Failed to start backend"
        exit 1
    fi
    
    # Step 4: Start frontend
    if ! start_frontend; then
        error "❌ Failed to start frontend"
        exit 1
    fi
    
    # Step 5: Show status and open browser
    show_final_status
    
    # Open browser
    sleep 2
    case "$(uname -s)" in
        Darwin*) open "http://localhost:5173" ;;
        Linux*) xdg-open "http://localhost:5173" 2>/dev/null || true ;;
        *) echo "Open http://localhost:5173 in your browser" ;;
    esac
    
    success "🎉 Application started successfully!"
    echo ""
    echo "Press Ctrl+C to stop..."
    
    # Keep script running
    while true; do
        sleep 10
        # Basic health check
        if ! curl -s "http://localhost:8080/health" >/dev/null 2>&1; then
            warning "⚠️  Backend seems to be down"
        fi
    done
}

# Handle Ctrl+C
trap 'echo ""; warning "Stopping..."; ./stop-application.sh; exit 0' INT

# Run main function
main "$@"