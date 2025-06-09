# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is an Equity Trading Platform with a Go backend and React frontend:
- **Go Server** (`/server/`): REST API + WebSocket hub for real-time stock data
- **React Frontend** (`/server/react-frontend/`): Modern SPA with TypeScript and Zustand
- **Legacy Frontend** (`/server/static/`): Original JavaScript implementation

## Common Commands

### React Frontend Development
```bash
cd server/react-frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:ui      # Run tests with UI
```

### Go Backend Development
```bash
cd server
go run cmd/main.go   # Run development server
go build -o equity-server cmd/main.go  # Build binary
go test ./...        # Run all tests
```

### Full Application
```bash
cd server
./start-full-application.sh    # Start both frontend and backend
./stop-application.sh          # Stop all services
docker-compose up -d           # Docker deployment
```

## Key Architecture Components

### WebSocket Hub Pattern
- Central hub manages all WebSocket connections (`/server/internal/hub/`)
- Clients subscribe to stock symbols for real-time updates
- Single upstream connection to Finnhub serves multiple clients
- 500ms throttling for performance optimization

### Caching Strategy
- Redis primary with in-memory fallback (`/server/internal/cache/`)
- Different TTLs: quotes (1min), candles (5min), profiles (24h), news (15min)
- Cache-aside pattern with automatic fallback

### State Management (React)
- Zustand stores: `stockStore`, `uiStore`, `watchlistStore` (`/server/react-frontend/src/stores/`)
- React Query for server state and caching
- WebSocket integration via custom hooks (`/server/react-frontend/src/hooks/`)

### API Structure
- RESTful endpoints under `/api/v1/`
- WebSocket endpoint at `/api/v1/ws/stocks`
- Rate limiting: 100 requests/minute per IP
- CORS configured for development ports (3000, 5173, 8080)

## Testing Requirements

### Frontend Tests
- Use Vitest with Testing Library setup in `/server/react-frontend/src/__tests__/`
- Test stores, components, and hooks
- Mock WebSocket connections and API calls
- Run tests for any React component or store changes

### Backend Tests
- Go standard testing for handlers, models, and business logic
- Test WebSocket hub functionality and API endpoints
- Focus on cache behavior and external API integration
- Run tests for any Go code changes

### Test Automation
- Run unit tests automatically when code changes
- Run only tests affected by changed files
- Create new tests for any new functionality or API changes

## Development Guidelines

create unit tests for any additions or changes that are made, automaticcly run them on any code that changed, run only the unit tests that are needed to test changed code
create unit tests for server APIs and run them whenever changes happen to the code that would effect any APIs
keep a change log for use in github that would be used for any commits or changes of code.


supabase local development setup is running.

         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
  S3 Storage URL: http://127.0.0.1:54321/storage/v1/s3
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
   S3 Access Key: 625729a08b95bf1b7ff351a663f3a23c
   S3 Secret Key: 850181e4652dd023b7a98c58ae0d2d34bd487ee0cc3254aed6eda37307425907

## Environment Setup

### Required Environment Variables
- `FINNHUB_API_KEY`: Required for stock data (get from finnhub.io)
- `PORT`: Server port (default: 8080)
- `REDIS_URL`: Redis connection (optional, fallback to in-memory)

### Development Ports
- Go Server: 8080
- React Dev Server: 3000 or 5173 (Vite)
- WebSocket: Same as server port

## External Dependencies

### Go Backend
- Gin web framework for HTTP routing
- Gorilla WebSocket for real-time connections
- Finnhub API client for stock data
- Redis for caching (optional)

### React Frontend
- React 19 with TypeScript
- Zustand for state management
- TanStack Query for server state
- Vite for build tooling

## Debug Options
- remember to use this debug option in any future ways that debugging information would be needed