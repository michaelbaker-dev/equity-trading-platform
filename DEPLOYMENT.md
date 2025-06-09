# Deployment Guide

## Quick Start

### Local Development
```bash
# Clone the repository
git clone https://github.com/yourusername/equity-trading-platform.git
cd equity-trading-platform

# Start the full application
cd server
./start-full-application.sh
```

The application will be available at:
- Frontend: http://localhost:3000 or http://localhost:5173
- Backend API: http://localhost:8080
- WebSocket: ws://localhost:8080/api/v1/ws/stocks

### Environment Setup

1. **Get Finnhub API Key**
   - Visit [finnhub.io](https://finnhub.io) and create a free account
   - Copy your API key from the dashboard

2. **Set Environment Variables**
   ```bash
   export FINNHUB_API_KEY=your_api_key_here
   # Optional
   export PORT=8080
   export REDIS_URL=redis://localhost:6379
   ```

3. **Install Dependencies**
   ```bash
   # Backend
   cd server && go mod tidy
   
   # Frontend  
   cd react-frontend && npm install
   ```

## Production Deployment

### Docker Deployment (Recommended)

1. **Build and Run with Docker Compose**
   ```bash
   cd server
   docker-compose up -d
   ```

2. **Environment Configuration**
   Create a `.env` file in the `server` directory:
   ```env
   FINNHUB_API_KEY=your_production_api_key
   PORT=8080
   REDIS_URL=redis://redis:6379
   GIN_MODE=release
   ```

### Manual Production Deployment

1. **Build Frontend**
   ```bash
   cd server/react-frontend
   npm run build
   ```

2. **Build Go Binary**
   ```bash
   cd server
   go build -o equity-server cmd/main.go
   ```

3. **Deploy to Server**
   ```bash
   # Copy files to production server
   scp -r dist/ equity-server user@server:/path/to/app/
   
   # Set environment variables and run
   FINNHUB_API_KEY=your_key ./equity-server
   ```

### Cloud Platforms

#### Heroku
```bash
# Add Heroku remote
heroku create your-app-name

# Set environment variables
heroku config:set FINNHUB_API_KEY=your_key

# Deploy
git push heroku main
```

#### Vercel (Frontend Only)
```bash
cd server/react-frontend
npm install -g vercel
vercel --prod
```

#### AWS/GCP/Azure
- Use Docker image deployment
- Set up load balancer for multiple instances
- Configure Redis for session storage
- Set environment variables in cloud console

### Production Checklist

- [ ] Set `GIN_MODE=release` for Go backend
- [ ] Configure Redis for production caching
- [ ] Set up SSL/TLS certificates
- [ ] Configure CORS for production domains
- [ ] Set up monitoring and logging
- [ ] Configure backup strategies
- [ ] Test all environment variables
- [ ] Verify WebSocket connections work
- [ ] Load test the application
- [ ] Set up health check endpoints

### Monitoring

#### Health Checks
- Backend: `GET /health`
- WebSocket: Connection status monitoring
- Redis: Memory usage and connection count

#### Metrics to Monitor
- API response times
- WebSocket connection count
- Redis cache hit rates
- Error rates and types
- Resource usage (CPU, memory)

### Scaling

#### Horizontal Scaling
- Multiple backend instances behind load balancer
- Redis cluster for distributed caching
- WebSocket sticky sessions or Redis pub/sub

#### Performance Optimization
- Enable gzip compression
- Set up CDN for static assets
- Optimize database queries
- Implement request batching
- Use Redis for session storage

### Security

#### Production Security
- Use HTTPS only
- Set secure CORS policies
- Implement rate limiting
- Validate all inputs
- Set security headers
- Regular dependency updates

#### Environment Variables
Never commit sensitive data:
```bash
# .env (never commit this file)
FINNHUB_API_KEY=real_api_key_here
DATABASE_URL=production_db_url
REDIS_URL=production_redis_url
```

### Troubleshooting

#### Common Issues
1. **WebSocket Connection Fails**
   - Check CORS configuration
   - Verify WebSocket URL format
   - Test with browser dev tools

2. **API Rate Limiting**
   - Verify Finnhub API key is valid
   - Check rate limiting logs
   - Implement exponential backoff

3. **Cache Issues**
   - Check Redis connection
   - Verify cache TTL settings
   - Monitor memory usage

4. **Build Failures**
   - Check Node.js version compatibility
   - Verify Go module dependencies
   - Check for TypeScript errors

#### Logs and Debugging
```bash
# Backend logs
./equity-server 2>&1 | tee app.log

# Frontend build logs
npm run build --verbose

# Docker logs
docker-compose logs -f
```

### Backup and Recovery

#### Data Backup
- Redis snapshots for cache data
- Application configuration files
- SSL certificates and keys
- Environment variable backups

#### Recovery Procedures
1. Restore from backup
2. Verify environment variables
3. Test all endpoints
4. Check WebSocket connectivity
5. Validate real-time data flow