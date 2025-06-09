# Deployment Guide

## 🚀 Quick Start (Recommended)

### One-Command Deployment

```bash
# Navigate to server directory
cd server

# Run the automated script
./run.sh
```

**What this does:**
- ✅ Checks Docker prerequisites
- 🔍 Detects if updates are needed
- 🏗️ Builds/rebuilds containers automatically  
- 🚀 Starts the application
- 🌐 Launches web browser
- 🧹 Cleans up old resources

## 📋 Script Options

### Basic Usage
```bash
./run.sh                # Normal run with auto-update
./run.sh --help          # Show help
./run.sh --status        # Check status only
./run.sh --force         # Force rebuild
./run.sh --clean         # Clean rebuild
./run.sh --no-browser    # Don't open browser
```

### Advanced Examples
```bash
# Force complete rebuild
./run.sh --clean --force

# Check status without deployment
./run.sh --status

# Deploy but don't open browser
./run.sh --no-browser

# Quick start from anywhere
./quick-start.sh
```

## 🖥️ Platform-Specific Instructions

### macOS/Linux
```bash
chmod +x run.sh
./run.sh
```

### Windows
```cmd
run.bat
```

### Windows PowerShell
```powershell
.\run.bat
```

## 🔧 Manual Deployment (If Scripts Fail)

### Prerequisites Check
```bash
# Check Docker
docker --version
docker info

# Check Docker Compose  
docker-compose --version
```

### Manual Build & Deploy
```bash
# Stop any running containers
docker-compose down

# Build images
docker-compose build --no-cache

# Start services  
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs
```

### Health Check
```bash
# Test API endpoint
curl http://localhost:8080/health

# Test web interface
open http://localhost:8080  # macOS
start http://localhost:8080 # Windows
```

## 🔄 Update Process

The script automatically detects updates by checking:
- Source code changes (*.go, *.js, *.html, *.css)
- Docker configuration changes
- Version file timestamps

### Force Update
```bash
./run.sh --force
```

### Check What Changed
```bash
git status              # If using Git
ls -la *.go internal/   # Check file timestamps
```

## 🐛 Troubleshooting

### Common Issues

1. **Docker not running**
   ```bash
   # Start Docker Desktop or service
   sudo systemctl start docker  # Linux
   ```

2. **Port 8080 in use**
   ```bash
   # Find what's using the port
   lsof -i :8080           # macOS/Linux
   netstat -ano | find "8080"  # Windows
   
   # Kill the process or change port in docker-compose.yml
   ```

3. **Permission denied**
   ```bash
   chmod +x run.sh
   sudo chown $USER:$USER run.sh
   ```

4. **Build failures**
   ```bash
   # Clean everything and retry
   ./run.sh --clean
   
   # Or manually clean
   docker system prune -a
   docker-compose down --volumes
   ```

### Debug Mode
```bash
# Show detailed output
set -x
./run.sh

# Check logs
docker-compose logs -f
docker-compose logs equity-server
```

### Service Status
```bash
# Quick status check
./run.sh --status

# Detailed inspection
docker-compose ps
docker inspect equity-server
docker logs equity-server
```

## 📊 Script Features

### Automatic Version Management
- Generates timestamps or Git-based versions
- Tracks changes in source files
- Only rebuilds when necessary

### Smart Health Checks
- Waits for service to be ready
- Tests API endpoints
- Verifies WebSocket connectivity

### Resource Management
- Cleans up old containers and images
- Manages Redis data persistence
- Optimizes Docker resource usage

### Cross-Platform Support
- Works on macOS, Linux, and Windows
- Detects OS and opens appropriate browser
- Handles different Docker installations

## 🏗️ Production Deployment

### Environment Setup
```bash
# Copy and edit environment file
cp .env.example .env
# Edit .env with production values

# Set production API key
export FINNHUB_API_KEY=your_production_key
```

### Production Run
```bash
# Deploy with production settings
ENVIRONMENT=production ./run.sh

# Or use Docker Compose directly
docker-compose -f docker-compose.yml up -d
```

### Monitoring
```bash
# View real-time logs
docker-compose logs -f

# Monitor resource usage
docker stats

# Health monitoring
watch curl -s http://localhost:8080/health
```

## 🔐 Security Considerations

### API Key Management
- Never commit real API keys to Git
- Use environment variables in production
- Rotate keys regularly

### Network Security
- Run behind reverse proxy (nginx) in production
- Use HTTPS in production
- Configure firewall rules

### Container Security
- Update base images regularly
- Run containers as non-root user
- Scan for vulnerabilities

## 📈 Performance Optimization

### Resource Allocation
```yaml
# In docker-compose.yml
services:
  equity-server:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### Scaling
```bash
# Scale services
docker-compose up -d --scale equity-server=3

# Load balancing setup
# Add nginx or traefik configuration
```

## 🎯 Next Steps

After successful deployment:

1. **Access the application**: http://localhost:8080
2. **Test WebSocket**: Should see real-time price updates
3. **Check API**: http://localhost:8080/api/v1/stocks/quote/AAPL
4. **Monitor logs**: `docker-compose logs -f`
5. **Scale if needed**: Modify docker-compose.yml

## 📞 Support

If the scripts don't work:

1. Check the prerequisites
2. Review the logs in `deploy.log`
3. Try manual deployment steps
4. Check Docker and Docker Compose versions
5. Verify network connectivity and ports