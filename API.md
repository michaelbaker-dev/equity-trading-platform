# API Documentation

## Overview

The Equity Trading Platform provides a RESTful API for accessing real-time stock market data, company information, and news. All data is sourced from the Finnhub API and cached for optimal performance.

**Base URL**: `http://localhost:8080/api/v1`  
**Authentication**: No authentication required (uses server-side API key)  
**Rate Limiting**: 100 requests per minute per IP address  

## Endpoints

### Stock Data

#### Get Stock Quote
```http
GET /stocks/quote/:symbol
```

Returns real-time quote data for a stock symbol.

**Parameters:**
- `symbol` (string, required): Stock symbol (e.g., "AAPL", "MSFT")

**Response:**
```json
{
  "symbol": "AAPL",
  "c": 150.25,     // Current price
  "d": 2.15,       // Change
  "dp": 1.45,      // Percent change
  "h": 151.50,     // High
  "l": 148.75,     // Low
  "o": 149.00,     // Open
  "pc": 148.10,    // Previous close
  "timestamp": "2025-06-09T16:00:00Z"
}
```

#### Get Batch Quotes
```http
GET /stocks/quotes/batch?symbols=AAPL,MSFT,GOOGL
```

Returns quotes for multiple stocks in a single request.

**Parameters:**
- `symbols` (string, required): Comma-separated list of symbols (max 50)

**Response:**
```json
{
  "AAPL": {
    "symbol": "AAPL",
    "c": 150.25,
    "d": 2.15,
    "dp": 1.45,
    // ... other quote fields
  },
  "MSFT": {
    "symbol": "MSFT",
    "c": 310.75,
    "d": -1.25,
    "dp": -0.40,
    // ... other quote fields
  }
}
```

#### Get Candlestick Data
```http
GET /stocks/:symbol/candles?resolution=D&from=1609459200&to=1640995200
```

Returns historical candlestick data for charting.

**Parameters:**
- `symbol` (string, required): Stock symbol
- `resolution` (string, optional): Time resolution ("1", "5", "15", "30", "60", "D", "W", "M"). Default: "D"
- `from` (integer, optional): Unix timestamp for start date. Default: 1 month ago
- `to` (integer, optional): Unix timestamp for end date. Default: current time

**Response:**
```json
{
  "symbol": "AAPL",
  "c": [150.25, 151.30, 149.85],  // Close prices
  "h": [151.50, 152.10, 150.75],  // High prices
  "l": [148.75, 150.20, 148.90],  // Low prices
  "o": [149.00, 150.25, 151.30],  // Open prices
  "t": [1640995200, 1641081600, 1641168000],  // Timestamps
  "v": [75420000, 68230000, 82150000],  // Volumes
  "s": "ok"  // Status
}
```

#### Get Company Profile
```http
GET /stocks/:symbol/profile
```

Returns detailed company information.

**Parameters:**
- `symbol` (string, required): Stock symbol

**Response:**
```json
{
  "symbol": "AAPL",
  "name": "Apple Inc",
  "exchange": "NASDAQ",
  "country": "US",
  "currency": "USD",
  "marketCapitalization": 2500000,
  "shareOutstanding": 16000000,
  "logo": "https://static.finnhub.io/logo/87cb30d8-80df-11ea-8951-00155d64b4fa.png",
  "weburl": "https://www.apple.com/",
  "finnhubIndustry": "Technology",
  "ipo": "1980-12-12"
}
```

#### Get Company News
```http
GET /stocks/:symbol/news?from=2025-06-02&to=2025-06-09
```

Returns recent news articles for a company.

**Parameters:**
- `symbol` (string, required): Stock symbol
- `from` (string, optional): Start date in YYYY-MM-DD format. Default: 7 days ago
- `to` (string, optional): End date in YYYY-MM-DD format. Default: today

**Response:**
```json
[
  {
    "id": "123456",
    "headline": "Apple Reports Strong Q2 Earnings",
    "summary": "Apple Inc. reported better-than-expected earnings for the second quarter...",
    "source": "Reuters",
    "url": "https://reuters.com/article/apple-earnings",
    "image": "https://example.com/image.jpg",
    "datetime": "2025-06-09T14:30:00Z",
    "symbol": "AAPL"
  }
]
```

#### Get Order Book
```http
GET /stocks/:symbol/orderbook
```

Returns Level 2 market data (simulated for free tier).

**Parameters:**
- `symbol` (string, required): Stock symbol

**Response:**
```json
{
  "symbol": "AAPL",
  "bids": [
    {"price": 150.20, "volume": 1000},
    {"price": 150.15, "volume": 1500},
    {"price": 150.10, "volume": 2000}
  ],
  "asks": [
    {"price": 150.25, "volume": 800},
    {"price": 150.30, "volume": 1200},
    {"price": 150.35, "volume": 1800}
  ]
}
```

### Search

#### Search Stocks
```http
GET /search/stocks?q=apple
```

Search for stocks by symbol or company name.

**Parameters:**
- `q` (string, required): Search query (minimum 2 characters)

**Response:**
```json
[
  {
    "symbol": "AAPL",
    "description": "APPLE INC",
    "type": "Common Stock"
  },
  {
    "symbol": "AAPL.TO",
    "description": "APPLE INC-CDR",
    "type": "Canadian DR"
  }
]
```

### Market Data

#### Get Market Status
```http
GET /market/status
```

Returns current market status and hours.

**Response:**
```json
{
  "exchange": "US",
  "holiday": "",
  "isOpen": true,
  "session": "market",
  "timezone": "America/New_York",
  "t": 1640995200
}
```

### System

#### Health Check
```http
GET /health
```

Returns server health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-06-09T16:00:00Z"
}
```

## WebSocket API

### Real-time Stock Data
```
WebSocket: ws://localhost:8080/api/v1/ws/stocks
```

Connect to receive real-time stock price updates.

#### Connection
```javascript
const ws = new WebSocket('ws://localhost:8080/api/v1/ws/stocks');
```

#### Subscribe to Symbol
Send subscription message after connection:
```json
{
  "type": "subscribe",
  "symbol": "AAPL"
}
```

#### Unsubscribe from Symbol
```json
{
  "type": "unsubscribe", 
  "symbol": "AAPL"
}
```

#### Receive Updates
```json
{
  "type": "trade",
  "symbol": "AAPL", 
  "data": {
    "c": 150.25,
    "d": 2.15,
    "dp": 1.45
  },
  "timestamp": "2025-06-09T16:00:00Z"
}
```

## Error Handling

All API endpoints return standard HTTP status codes:

- `200 OK`: Successful request
- `400 Bad Request`: Invalid parameters
- `404 Not Found`: Resource not found  
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Error Response Format
```json
{
  "error": "invalid_symbol",
  "message": "Symbol is required",
  "code": 400
}
```

## Rate Limiting

- **Limit**: 100 requests per minute per IP address
- **Headers**: Rate limit info included in response headers
- **Exceeded**: Returns 429 status code with retry information

## Caching

- **Quotes**: 1 minute TTL
- **Company Profiles**: 24 hours TTL  
- **News**: 15 minutes TTL
- **Candlestick Data**: 5 minutes TTL
- **Search Results**: 1 hour TTL

## Data Sources

All market data is provided by [Finnhub](https://finnhub.io):
- Real-time quotes (15-minute delay for free tier)
- Company profiles and fundamental data
- News articles from multiple sources
- Historical price data
- Symbol search capabilities

## Client Libraries

### JavaScript/TypeScript
The frontend uses a custom API client with React Query integration:

```typescript
import { stockAPI } from './services/api';

// Get quote
const quote = await stockAPI.getQuote('AAPL');

// Search stocks  
const results = await stockAPI.searchStocks('apple');

// Get news
const news = await stockAPI.getNews('AAPL', '2025-06-01', '2025-06-09');
```

### WebSocket Client
```typescript
import { useWebSocket } from './hooks/useWebSocket';

// React hook for WebSocket integration
const { isConnected, subscribe, unsubscribe } = useWebSocket(['AAPL', 'MSFT']);
```