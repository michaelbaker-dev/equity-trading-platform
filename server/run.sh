#!/bin/bash

# Equity Trading Platform - Automated Deploy & Run Script
# This script handles Docker container creation, updates, and launching

set -e  # Exit on any error

# Configuration
CONTAINER_NAME="equity-server"
IMAGE_NAME="equity-server"
PORT="8080"
COMPOSE_FILE="docker-compose.yml"
WEB_URL="http://localhost:${PORT}"
VERSION_FILE=".version"
LOG_FILE="deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command_exists docker; then
        error "Docker is not installed. Please install Docker first."
        echo "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! command_exists docker-compose; then
        error "Docker Compose is not installed. Please install Docker Compose first."
        echo "Visit: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info >/dev/null 2>&1; then
        error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi
    
    success "All prerequisites met"
}

# Get current version
get_current_version() {
    if [ -f "$VERSION_FILE" ]; then
        cat "$VERSION_FILE"
    else
        echo "0"
    fi
}

# Generate new version based on Git or timestamp
generate_version() {
    if command_exists git && [ -d ".git" ]; then
        # Use Git commit hash and timestamp
        git_hash=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
        timestamp=$(date +%Y%m%d_%H%M%S)
        echo "${timestamp}_${git_hash}"
    else
        # Use timestamp only
        date +%Y%m%d_%H%M%S
    fi
}

# Check if container needs update
needs_update() {
    current_version=$(get_current_version)
    
    # Check if source files have changed
    if [ -f "$VERSION_FILE" ]; then
        # Find files newer than version file
        newer_files=$(find . -name "*.go" -o -name "*.js" -o -name "*.html" -o -name "*.css" -o -name "Dockerfile" -o -name "docker-compose.yml" | xargs ls -t 2>/dev/null | head -1)
        if [ -n "$newer_files" ] && [ "$newer_files" -nt "$VERSION_FILE" ]; then
            return 0  # Needs update
        fi
    else
        return 0  # No version file, needs initial build
    fi
    
    return 1  # No update needed
}

# Stop existing containers
stop_containers() {
    log "Stopping existing containers..."
    
    if docker-compose ps | grep -q "Up"; then
        docker-compose down --timeout 30
        success "Containers stopped"
    else
        log "No running containers found"
    fi
}

# Build and start containers
build_and_start() {
    log "Building and starting containers..."
    
    # Build images
    log "Building Docker images..."
    if docker-compose build --no-cache; then
        success "Images built successfully"
    else
        error "Failed to build images"
        exit 1
    fi
    
    # Start services
    log "Starting services..."
    if docker-compose up -d; then
        success "Services started successfully"
    else
        error "Failed to start services"
        exit 1
    fi
    
    # Update version file
    generate_version > "$VERSION_FILE"
    success "Version updated to $(cat $VERSION_FILE)"
}

# Wait for service to be ready
wait_for_service() {
    log "Waiting for service to be ready..."
    
    max_attempts=30
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$WEB_URL/health" >/dev/null 2>&1; then
            success "Service is ready!"
            return 0
        fi
        
        log "Attempt $attempt/$max_attempts: Service not ready yet, waiting 5 seconds..."
        sleep 5
        attempt=$((attempt + 1))
    done
    
    error "Service failed to start within expected time"
    return 1
}

# Show service status
show_status() {
    log "Checking service status..."
    
    echo ""
    echo "=== Container Status ==="
    docker-compose ps
    
    echo ""
    echo "=== Recent Logs ==="
    docker-compose logs --tail=10
    
    echo ""
    echo "=== Service Health ==="
    if curl -s -f "$WEB_URL/health" >/dev/null 2>&1; then
        success "✅ Service is healthy"
        echo "🌐 Web interface: $WEB_URL"
        echo "📊 API endpoint: $WEB_URL/api/v1"
        echo "🔌 WebSocket: ws://localhost:$PORT/api/v1/ws/stocks"
    else
        error "❌ Service health check failed"
    fi
}

# Launch web browser
launch_browser() {
    log "Launching web browser..."
    
    # Wait a moment for the service to be fully ready
    sleep 2
    
    # Detect OS and open browser
    case "$(uname -s)" in
        Darwin*)    # macOS
            open "$WEB_URL"
            ;;
        Linux*)     # Linux
            if command_exists xdg-open; then
                xdg-open "$WEB_URL"
            elif command_exists gnome-open; then
                gnome-open "$WEB_URL"
            else
                warning "Could not auto-launch browser. Please open: $WEB_URL"
            fi
            ;;
        CYGWIN*|MINGW*|MSYS*)  # Windows
            start "$WEB_URL"
            ;;
        *)
            warning "Unknown OS. Please open: $WEB_URL"
            ;;
    esac
    
    success "Web browser launched"
}

# Clean up old images and containers
cleanup() {
    log "Cleaning up old Docker resources..."
    
    # Remove dangling images
    dangling_images=$(docker images -f "dangling=true" -q)
    if [ -n "$dangling_images" ]; then
        docker rmi $dangling_images >/dev/null 2>&1 || true
        log "Removed dangling images"
    fi
    
    # Remove stopped containers
    stopped_containers=$(docker ps -a -f "status=exited" -q)
    if [ -n "$stopped_containers" ]; then
        docker rm $stopped_containers >/dev/null 2>&1 || true
        log "Removed stopped containers"
    fi
    
    success "Cleanup completed"
}

# Handle script interruption
handle_interrupt() {
    echo ""
    warning "Script interrupted. Cleaning up..."
    exit 1
}

# Set up signal handlers
trap handle_interrupt INT TERM

# Main execution flow
main() {
    clear
    echo "🚀 Equity Trading Platform - Auto Deploy Script"
    echo "=============================================="
    echo ""
    
    # Initialize log file
    echo "=== Deploy started at $(date) ===" > "$LOG_FILE"
    
    # Run checks and deployment
    check_prerequisites
    
    current_version=$(get_current_version)
    log "Current version: $current_version"
    
    if needs_update; then
        log "🔄 Update needed - rebuilding application..."
        stop_containers
        build_and_start
        
        # Wait for service to be ready
        if wait_for_service; then
            show_status
            launch_browser
            cleanup
            
            echo ""
            success "🎉 Deployment completed successfully!"
            echo ""
            echo "📱 Application Details:"
            echo "   • URL: $WEB_URL"
            echo "   • Version: $(cat $VERSION_FILE)"
            echo "   • Logs: docker-compose logs -f"
            echo "   • Stop: docker-compose down"
            echo ""
        else
            error "Deployment failed - service not responding"
            echo ""
            echo "🔍 Troubleshooting:"
            echo "   • Check logs: docker-compose logs"
            echo "   • Check status: docker-compose ps"
            echo "   • Manual start: docker-compose up"
            exit 1
        fi
    else
        log "✅ Application is up to date"
        
        # Check if containers are running
        if docker-compose ps | grep -q "Up"; then
            log "🏃 Application is already running"
            show_status
            
            # Ask if user wants to launch browser anyway
            echo ""
            read -p "Launch web browser? (y/N): " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                launch_browser
            fi
        else
            log "🔄 Starting existing application..."
            docker-compose up -d
            
            if wait_for_service; then
                show_status
                launch_browser
                
                success "🎉 Application started successfully!"
            else
                error "Failed to start application"
                exit 1
            fi
        fi
    fi
    
    echo ""
    log "✨ Script completed successfully"
}

# Script usage information
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -f, --force    Force rebuild even if no changes detected"
    echo "  -s, --status   Show status only (no deployment)"
    echo "  -c, --clean    Clean up and rebuild"
    echo "  --no-browser   Don't launch web browser"
    echo ""
    echo "Examples:"
    echo "  $0              # Normal run with auto-update check"
    echo "  $0 --force      # Force rebuild"
    echo "  $0 --status     # Check status only"
    echo "  $0 --clean      # Clean rebuild"
    echo ""
}

# Parse command line arguments
FORCE_REBUILD=false
STATUS_ONLY=false
CLEAN_REBUILD=false
LAUNCH_BROWSER=true

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -f|--force)
            FORCE_REBUILD=true
            shift
            ;;
        -s|--status)
            STATUS_ONLY=true
            shift
            ;;
        -c|--clean)
            CLEAN_REBUILD=true
            shift
            ;;
        --no-browser)
            LAUNCH_BROWSER=false
            shift
            ;;
        *)
            error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Handle special modes
if [ "$STATUS_ONLY" = true ]; then
    check_prerequisites
    show_status
    exit 0
fi

if [ "$CLEAN_REBUILD" = true ]; then
    log "🧹 Clean rebuild requested"
    stop_containers
    docker-compose down --volumes --remove-orphans
    docker system prune -f
    rm -f "$VERSION_FILE"
    FORCE_REBUILD=true
fi

if [ "$FORCE_REBUILD" = true ]; then
    log "🔨 Force rebuild requested"
    rm -f "$VERSION_FILE"
fi

# Override needs_update function if force rebuild
if [ "$FORCE_REBUILD" = true ]; then
    needs_update() {
        return 0
    }
fi

# Override launch_browser function if disabled
if [ "$LAUNCH_BROWSER" = false ]; then
    launch_browser() {
        log "Browser launch disabled"
    }
fi

# Run main function
main