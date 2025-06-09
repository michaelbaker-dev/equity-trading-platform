# Equity Trading Platform - Go Server

A high-performance equity trading platform with real-time data streaming, built with Go backend and JavaScript frontend.

## Architecture Overview

This application uses a hybrid WebSocket Hub + REST API architecture:

- **Go Server**: Handles API requests, WebSocket connections, and data caching
- **WebSocket Hub**: Manages real-time price updates for multiple clients
- **REST API**: Provides historical data and company information
- **Redis Cache**: Improves performance with intelligent caching
- **Frontend**: Lightweight JavaScript client that connects to the Go server

## Features

- 📈 **Real-time stock quotes** via WebSocket
- 📊 **Interactive price charts** with multiple time periods
- 📰 **Company news** and profile information
- 📋 **Order book** data (Level 2)
- 🔍 **Stock search** functionality
- ⚡ **High-performance caching** with Redis
- 🛡️ **Rate limiting** and API security
- 🎯 **Lightweight frontend** (no more direct API calls)

## Quick Start

### Option 1: Docker (Recommended)

1. **Clone and navigate to the server directory:**
   ```bash
   cd server
   ```

2. **Start with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

3. **Open your browser:**
   ```
   http://localhost:8080
   ```

### Option 2: Local Development

1. **Prerequisites:**
   - Go 1.21+
   - Redis (optional, will use in-memory cache if unavailable)

2. **Install dependencies:**
   ```bash
   cd server
   go mod download
   ```

3. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Finnhub API key if needed
   ```

4. **Run the server:**
   ```bash
   go run cmd/main.go
   ```

5. **Open your browser:**
   ```
   http://localhost:8080
   ```

## API Endpoints

### Stock Data
- `GET /api/v1/stocks/quote/{symbol}` - Get current quote
- `GET /api/v1/stocks/quotes/batch?symbols=AAPL,MSFT` - Get multiple quotes
- `GET /api/v1/stocks/{symbol}/candles` - Get candlestick data
- `GET /api/v1/stocks/{symbol}/profile` - Get company profile
- `GET /api/v1/stocks/{symbol}/news` - Get company news
- `GET /api/v1/stocks/{symbol}/orderbook` - Get order book data

### Search & Market
- `GET /api/v1/search/stocks?q=apple` - Search stocks
- `GET /api/v1/market/status` - Get market status

### WebSocket
- `WS /api/v1/ws/stocks` - Real-time price updates

## WebSocket Protocol

### Subscribe to a symbol:
```json
{
  "type": "subscribe",
  "symbol": "AAPL"
}
```

### Unsubscribe from a symbol:
```json
{
  "type": "unsubscribe", 
  "symbol": "AAPL"
}
```

### Receive price updates:
```json
{
  "type": "quote",
  "symbol": "AAPL",
  "data": {
    "symbol": "AAPL",
    "c": 150.25,
    "d": 2.15,
    "dp": 1.45,
    "h": 151.00,
    "l": 149.50,
    "o": 149.75,
    "pc": 148.10,
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8080` |
| `ENVIRONMENT` | Environment mode | `development` |
| `FINNHUB_API_KEY` | Finnhub API key | Required |
| `REDIS_URL` | Redis connection URL | `localhost:6379` |
| `REDIS_PASSWORD` | Redis password | Empty |

### Cache Configuration

The server uses intelligent caching with different TTLs:

- **Quotes**: 1 minute (high frequency)
- **Candles**: 5 minutes (medium frequency) 
- **Profiles**: 24 hours (static data)
- **News**: 15 minutes (semi-static)
- **Order Books**: 5 seconds (real-time)

## Performance Features

### Server-Side Optimizations
- **Rate limiting**: 100 requests per minute per IP
- **Connection pooling**: Efficient HTTP client management
- **Batch processing**: Multiple stock quotes in single request
- **WebSocket hub**: Single upstream connection serves many clients
- **Smart caching**: Redis with fallback to in-memory cache

### Frontend Optimizations
- **No API keys**: Secure server-side API handling
- **WebSocket reconnection**: Automatic reconnection with exponential backoff
- **Price update throttling**: 500ms batched updates
- **Lightweight client**: Minimal JavaScript, no heavy frameworks

## Architecture Benefits

### Before (Direct Finnhub Integration)
❌ API key exposed in frontend  
❌ Rate limits per client  
❌ Complex caching logic in browser  
❌ Multiple WebSocket connections  
❌ Heavy frontend bundle  

### After (Go Server Architecture)
✅ API key secured on server  
✅ Shared rate limits and caching  
✅ Server-side optimization  
✅ Single WebSocket connection  
✅ Lightweight frontend  

## Development

### Project Structure
```
server/
├── cmd/main.go                 # Application entry point
├── internal/
│   ├── cache/                  # Caching implementations
│   ├── clients/                # External API clients
│   ├── config/                 # Configuration management
│   ├── handlers/               # HTTP handlers
│   ├── hub/                    # WebSocket hub
│   ├── middleware/             # HTTP middleware
│   └── models/                 # Data models
├── static/                     # Frontend files
│   ├── index.html
│   ├── styles.css
│   └── js/
│       ├── api-client.js       # API client
│       ├── ui-components.js    # UI functions
│       └── equity-app.js       # Main app logic
├── Dockerfile
├── docker-compose.yml
└── README.md
```

### Running Tests
```bash
go test ./...
```

### Building for Production
```bash
# Build binary
go build -o equity-server cmd/main.go

# Or build Docker image
docker build -t equity-server .
```

## Monitoring

### Health Check
```bash
curl http://localhost:8080/health
```

### Metrics (via logs)
- Connected WebSocket clients
- API request rates
- Cache hit/miss ratios
- Performance timings

## Deployment

### Docker Production
```bash
# Set environment variables
export FINNHUB_API_KEY=your_real_api_key

# Deploy
docker-compose -f docker-compose.yml up -d
```

### Manual Deployment
```bash
# Build
go build -o equity-server cmd/main.go

# Run with environment
FINNHUB_API_KEY=your_key ./equity-server
```

## Troubleshooting

### Common Issues

1. **WebSocket connection fails**
   - Check if port 8080 is accessible
   - Verify CORS settings for your domain

2. **API rate limits**
   - Default Finnhub key has limited requests
   - Upgrade to paid plan for higher limits

3. **Redis connection issues**
   - Server will fallback to in-memory cache
   - Check Redis URL and credentials

4. **Build errors**
   - Ensure Go 1.21+ is installed
   - Run `go mod download` to fetch dependencies

### Debug Mode
```bash
ENVIRONMENT=development go run cmd/main.go
```

## API Key Management

### Get a Finnhub API Key
1. Go to [Finnhub.io](https://finnhub.io)
2. Sign up for a free account
3. Get your API key from the dashboard
4. Update the `.env` file with your key

### Free Tier Limits
- 60 requests per minute
- Basic market data only
- Consider upgrading for production use

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is for educational purposes. Please ensure you comply with Finnhub's terms of service when using their API.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs for error details
3. Open an issue with reproduction steps