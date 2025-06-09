# Equity Trading Platform

A modern, real-time equity trading platform built with React and Go, featuring live stock data, interactive charts, and comprehensive market analysis tools.

![Equity Trading Platform](https://img.shields.io/badge/React-18+-blue?logo=react) ![Go](https://img.shields.io/badge/Go-1.19+-blue?logo=go) ![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue?logo=typescript) ![License](https://img.shields.io/badge/license-MIT-green)

## 🚀 Features

### Core Functionality
- **Real-time Stock Data**: Live quotes, prices, and market data from Finnhub API
- **Interactive Charts**: Professional-grade stock charts with multiple timeframes
- **User-defined Watchlists**: Add, remove, and manage custom stock watchlists
- **Resizable Panels**: Three-panel layout with draggable dividers for customizable workspace
- **Live News Feed**: Latest news articles for selected stocks
- **Order Book**: Real-time Level 2 market data visualization
- **Responsive Design**: Optimized for desktop and mobile devices

### Technical Features
- **WebSocket Integration**: Real-time data streaming with automatic reconnection
- **Caching Strategy**: Redis primary with in-memory fallback for optimal performance
- **State Management**: Zustand with persistence for UI state and watchlists
- **Error Boundaries**: Graceful error handling and recovery
- **Type Safety**: Full TypeScript implementation for both frontend and backend
- **Search Functionality**: Symbol and company name search with autocomplete

## 🏗️ Architecture

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript and Vite
- **State Management**: Zustand for global state, React Query for server state
- **Styling**: Custom CSS with CSS Grid and Flexbox
- **Real-time Updates**: WebSocket integration with custom hooks
- **Component Architecture**: Modular, reusable components with proper separation of concerns

### Backend (Go)
- **Web Framework**: Gin for HTTP routing and middleware
- **WebSocket Hub**: Centralized connection management for real-time data
- **External APIs**: Finnhub API integration for market data
- **Caching**: Multi-tier caching with Redis and in-memory fallback
- **Rate Limiting**: Built-in rate limiting and request throttling

### Data Flow
```
Finnhub API → Go Backend → WebSocket Hub → React Frontend
                ↓
            Redis Cache ← Memory Cache
```

## 🛠️ Installation

### Prerequisites
- **Node.js** 18+ and npm
- **Go** 1.19+
- **Redis** (optional, will fallback to in-memory cache)
- **Finnhub API Key** (get from [finnhub.io](https://finnhub.io))

### Backend Setup
```bash
cd server
go mod tidy
export FINNHUB_API_KEY=your_api_key_here
go run cmd/main.go
```

### Frontend Setup
```bash
cd server/react-frontend
npm install
npm run dev
```

### Full Application (Recommended)
```bash
cd server
./start-full-application.sh
```

## 🔧 Configuration

### Environment Variables
```bash
# Required
FINNHUB_API_KEY=your_finnhub_api_key

# Optional
PORT=8080                    # Server port (default: 8080)
REDIS_URL=redis://localhost:6379  # Redis connection
GIN_MODE=release             # Set to 'release' for production
```

### Development Options
```bash
# Start with debug window
./start-app-simple.sh --debug

# Start without debug window
./start-app-simple.sh --no-debug
```

## 📖 Usage

### Getting Started
1. **Launch the application** using one of the setup methods above
2. **Browse stocks** in the default watchlist (MSFT, NVDA, STLC, NBLY)
3. **Add stocks** using the plus (+) button in the watchlist header
4. **Select stocks** to view detailed information in the center panel
5. **Switch tabs** to view Charts, News, Options, Comments, or Company info
6. **Resize panels** by dragging the dividers between sections

### Key Features
- **Watchlist Management**: Add/remove stocks with real-time search
- **Live Data**: Automatic updates every 30 seconds for quotes and prices
- **News Integration**: Latest news articles with external links for deeper reading
- **Responsive Charts**: SVG-based charts that scale with panel resizing
- **Persistent Settings**: Panel sizes and UI preferences saved automatically

### Keyboard Shortcuts
- `Ctrl/Cmd + Shift + R`: Reset panels to equal widths
- `Ctrl/Cmd + Shift + M`: Maximize center panel

## 🧩 API Endpoints

### Stock Data
- `GET /api/v1/stocks/quote/:symbol` - Get stock quote
- `GET /api/v1/stocks/quotes/batch?symbols=AAPL,MSFT` - Batch quotes
- `GET /api/v1/stocks/:symbol/candles` - Historical candlestick data
- `GET /api/v1/stocks/:symbol/profile` - Company profile
- `GET /api/v1/stocks/:symbol/news` - Company news
- `GET /api/v1/stocks/:symbol/orderbook` - Level 2 market data

### Search & Discovery
- `GET /api/v1/search/stocks?q=apple` - Search stocks by symbol or name

### Real-time Data
- `WebSocket /api/v1/ws/stocks` - Live price updates and market data

### System
- `GET /health` - Health check endpoint
- `GET /api/v1/market/status` - Market hours and status

## 🔄 Recent Updates

### Major Features Added
- **User-defined Watchlists**: Replaced static watchlists with dynamic, user-customizable lists
- **Real-time News Integration**: Added Finnhub API news feed with search and filtering
- **Resizable Panel System**: Implemented draggable dividers with persistent positioning
- **Tab Navigation**: Added Chart, News, Options, Comments, and Company tabs
- **Search Modal**: Enhanced stock search with real-time API integration
- **Compact Layouts**: Optimized space usage for different content types

### Technical Improvements
- **State Management**: Migrated to Zustand with localStorage persistence
- **TypeScript Integration**: Full type safety across frontend and backend
- **Component Architecture**: Modular design with proper separation of concerns
- **Error Handling**: Comprehensive error boundaries and graceful degradation
- **Performance**: Optimized rendering with React Query caching
- **WebSocket Stability**: Improved connection handling and automatic reconnection

## 🧪 Testing

### Frontend Tests
```bash
cd server/react-frontend
npm run test        # Run tests in watch mode
npm run test:run    # Run tests once
npm run test:ui     # Run tests with UI
```

### Backend Tests
```bash
cd server
go test ./...       # Run all Go tests
go test -v ./internal/handlers  # Run handler tests with verbose output
```

## 🚀 Deployment

### Docker Deployment
```bash
cd server
docker-compose up -d
```

### Manual Deployment
1. Build the React frontend: `npm run build`
2. Build the Go binary: `go build -o equity-server cmd/main.go`
3. Deploy with your preferred hosting solution
4. Set environment variables for production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices for frontend code
- Use Go idioms and proper error handling for backend code
- Write tests for new functionality
- Update documentation for API changes
- Ensure responsive design for UI changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Finnhub API**: Real-time stock market data provider
- **React Query**: Powerful data synchronization for React
- **Zustand**: Simple, fast state management
- **Gin**: High-performance HTTP web framework for Go
- **Font Awesome**: Icon library for enhanced UI

## 📞 Support

For support, questions, or feature requests:
- Open an issue on GitHub
- Check the [documentation](./docs/) for detailed guides
- Review the [API documentation](./api-docs.md) for integration details

---

**Built with ❤️ using React, Go, and modern web technologies**