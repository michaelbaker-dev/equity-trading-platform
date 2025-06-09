# React Conversion Plan for Equity Trading Platform

## Overview
Converting the existing vanilla HTML/JavaScript equity trading platform to React while maintaining the Go backend API unchanged.

## Current Architecture Analysis

### HTML Structure (static/index.html)
```
app-container
├── watchlist-panel
│   ├── watchlist-header (with action buttons)
│   ├── add-stock-modal
│   ├── watchlist-filters
│   ├── watchlist-table-header
│   ├── watchlist-items (dynamic content)
│   └── watchlist-footer
├── resize-handle (left)
├── stock-detail-panel
│   ├── stock-detail-header
│   ├── stock-info-container
│   ├── chart-navigation (tabs)
│   ├── stock-chart-container (professional chart)
│   ├── news-container (conditional)
│   └── chart-footer
├── resize-handle (right)
└── order-book-panel
    ├── order-book-header
    ├── order-book-navigation
    ├── order-actions
    ├── bid-ask-container
    ├── level-info
    ├── order-book-title
    ├── order-book-table (dynamic rows)
    └── market-footer
```

### JavaScript Modules Analysis
1. **equity-app.js** - Main application orchestrator
2. **api-client.js** - HTTP API communication with Go backend
3. **watchlist-manager.js** - Watchlist state management
4. **professional-chart.js** - Chart rendering and interactions
5. **ui-components.js** - UI utility functions and resize handling
6. **stock-search.js** - Stock search functionality
7. **update-frequency-manager.js** - Real-time update coordination

### Key API Endpoints (Keep Unchanged)
- `/api/v1/stocks/quote/{symbol}` - Get stock quote
- `/api/v1/stocks/{symbol}/candles` - Get candlestick data
- `/api/v1/stocks/{symbol}/profile` - Get company profile
- `/api/v1/stocks/search` - Search stocks
- `/api/v1/stocks/{symbol}/news` - Get stock news
- `/ws` - WebSocket for real-time updates

## React Component Architecture Plan

### 1. Top-Level App Structure
```tsx
App.tsx
├── AppLayout.tsx
│   ├── WatchlistPanel.tsx
│   ├── ResizeHandle.tsx
│   ├── StockDetailPanel.tsx
│   ├── ResizeHandle.tsx
│   └── OrderBookPanel.tsx
├── Modal.tsx (global modal container)
└── ErrorBoundary.tsx
```

### 2. Component Hierarchy

#### WatchlistPanel Components
```tsx
WatchlistPanel.tsx
├── WatchlistHeader.tsx
│   ├── WatchlistActions.tsx
│   └── AddStockButton.tsx
├── AddStockModal.tsx
│   ├── StockSearchInput.tsx
│   └── SearchResults.tsx
├── WatchlistFilters.tsx
├── WatchlistTableHeader.tsx
├── WatchlistItems.tsx
│   └── WatchlistItem.tsx
│       ├── StockInfo.tsx
│       ├── MiniChart.tsx
│       └── PriceDisplay.tsx
└── WatchlistFooter.tsx
```

#### StockDetailPanel Components
```tsx
StockDetailPanel.tsx
├── StockDetailHeader.tsx
├── StockInfoContainer.tsx
│   ├── StockTitle.tsx
│   ├── PriceContainer.tsx
│   ├── StockDetailsGrid.tsx
│   ├── PostMarketInfo.tsx
│   └── NewsItem.tsx
├── TabNavigation.tsx
├── ChartContainer.tsx
│   └── ProfessionalChart.tsx
│       ├── ChartHeader.tsx
│       ├── TimePeriodSelector.tsx
│       ├── ChartCanvas.tsx
│       └── StockMetricsGrid.tsx
├── NewsContainer.tsx
│   ├── NewsHeader.tsx
│   └── NewsList.tsx
│       └── NewsItemCard.tsx
└── ChartFooter.tsx
```

#### OrderBookPanel Components
```tsx
OrderBookPanel.tsx
├── OrderBookHeader.tsx
├── OrderBookNavigation.tsx
├── OrderActions.tsx
├── BidAskContainer.tsx
│   ├── BidContainer.tsx
│   └── AskContainer.tsx
├── LevelInfo.tsx
├── OrderBookTitle.tsx
├── OrderBookTable.tsx
│   └── OrderRow.tsx
│       ├── BidSide.tsx
│       └── AskSide.tsx
└── MarketFooter.tsx
```

### 3. Shared Components
```tsx
ui/
├── Button.tsx
├── Modal.tsx
├── LoadingSpinner.tsx
├── ErrorMessage.tsx
├── PriceDisplay.tsx
├── PercentageChange.tsx
├── IconButton.tsx
└── ResizeHandle.tsx
```

### 4. State Management Architecture

#### Zustand Stores
```typescript
// stores/stockStore.ts
interface StockState {
  selectedSymbol: string;
  currentTimePeriod: string;
  stocks: Record<string, Stock>;
  realTimePrices: Record<string, number>;
  setSelectedSymbol: (symbol: string) => void;
  setTimePeriod: (period: string) => void;
  updateStock: (symbol: string, data: Partial<Stock>) => void;
}

// stores/watchlistStore.ts
interface WatchlistState {
  symbols: string[];
  addSymbol: (symbol: string) => void;
  removeSymbol: (symbol: string) => void;
  reorderSymbols: (symbols: string[]) => void;
}

// stores/uiStore.ts
interface UIState {
  panelWidths: { left: number; middle: number; right: number };
  activeTab: 'chart' | 'options' | 'comments' | 'news' | 'company';
  modals: { addStock: boolean };
  setPanelWidths: (widths: PanelWidths) => void;
  setActiveTab: (tab: TabType) => void;
  openModal: (modal: string) => void;
  closeModal: (modal: string) => void;
}
```

#### React Query Configuration
```typescript
// services/api.ts - Keep existing API structure
export const stockAPI = {
  getQuote: (symbol: string) => api.get(`/stocks/quote/${symbol}`),
  getCandles: (symbol: string, params: CandleParams) => 
    api.get(`/stocks/${symbol}/candles`, { params }),
  getProfile: (symbol: string) => api.get(`/stocks/${symbol}/profile`),
  searchStocks: (query: string) => api.get(`/stocks/search`, { params: { q: query } }),
  getNews: (symbol: string) => api.get(`/stocks/${symbol}/news`)
};

// Custom hooks using React Query
export const useStockQuote = (symbol: string) => {
  return useQuery({
    queryKey: ['quote', symbol],
    queryFn: () => stockAPI.getQuote(symbol),
    refetchInterval: 30000, // 30 seconds
    enabled: !!symbol
  });
};
```

### 5. Custom Hooks

```typescript
// hooks/useWebSocket.ts
export const useWebSocket = (symbols: string[]) => {
  // WebSocket connection management
  // Real-time price updates
  // Connection resilience
};

// hooks/useResizable.ts
export const useResizable = () => {
  // Panel resize logic
  // Mouse event handling
  // Width constraints
};

// hooks/useChart.ts
export const useChart = (symbol: string, period: string) => {
  // Chart data fetching
  // Chart rendering coordination
  // Performance optimization
};
```

## Conversion Strategy

### Phase 1: Project Setup (Day 1)
1. ✅ Environment verification complete
2. Initialize React project with Vite + TypeScript
3. Set up project structure
4. Configure build tools (ESLint, Prettier, Vitest)
5. Test basic React app functionality

### Phase 2: Infrastructure (Day 2)
1. Set up state management (Zustand + React Query)
2. Create API service layer (keeping existing endpoints)
3. Implement WebSocket hook
4. Create base UI components
5. Test state management and API integration

### Phase 3: Core Components (Days 3-4)
1. Convert layout structure (AppLayout, ResizeHandle)
2. Convert WatchlistPanel components
3. Convert basic StockDetailPanel structure
4. Test component rendering and basic interactions

### Phase 4: Advanced Features (Days 5-6)
1. Convert ProfessionalChart component with canvas rendering
2. Implement TabNavigation and conditional rendering
3. Convert OrderBookPanel components
4. Add real-time WebSocket integration
5. Test complete data flow

### Phase 5: Testing & Optimization (Day 7)
1. Component unit tests
2. Integration tests with Go backend
3. Performance optimization
4. Visual comparison with original
5. Final testing and bug fixes

## File Conversion Mapping

### Direct Conversions
- `static/index.html` → `src/App.tsx` + components
- `static/styles.css` → `src/styles/` (modular CSS or styled-components)
- `js/api-client.js` → `src/services/api.ts`
- `js/watchlist-manager.js` → `src/stores/watchlistStore.ts`
- `js/equity-app.js` → `src/App.tsx` + hooks
- `js/professional-chart.js` → `src/components/charts/ProfessionalChart.tsx`
- `js/ui-components.js` → `src/components/ui/` + `src/hooks/useResizable.ts`
- `js/stock-search.js` → `src/components/search/` + hooks

### Key Conversion Principles
1. **Keep API Layer Unchanged**: All `/api/v1/*` endpoints remain the same
2. **Preserve WebSocket Protocol**: Maintain existing WebSocket message format
3. **Maintain Visual Fidelity**: Keep exact same styling and layout
4. **Performance Parity**: Ensure React version performs as well as vanilla JS
5. **Feature Completeness**: All existing functionality must work identically

## Testing Strategy

### 1. Component Testing
```typescript
// Example: WatchlistItem.test.tsx
describe('WatchlistItem', () => {
  test('displays stock data correctly', () => {
    render(<WatchlistItem symbol="AAPL" />);
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });
  
  test('handles real-time price updates', () => {
    // Test WebSocket price updates
  });
});
```

### 2. Integration Testing
```typescript
// Test API integration with Go backend
describe('API Integration', () => {
  test('fetches stock quotes from Go server', async () => {
    const quote = await stockAPI.getQuote('AAPL');
    expect(quote.data).toHaveProperty('c'); // current price
  });
});
```

### 3. E2E Testing
```typescript
// Test complete user workflows
test('complete trading workflow', async () => {
  // 1. Load application
  // 2. Add stock to watchlist  
  // 3. Select stock and view chart
  // 4. Switch between time periods
  // 5. View news and order book
});
```

## Risk Mitigation

### 1. Gradual Migration
- Convert one panel at a time
- Maintain backward compatibility during transition
- Feature flags for React vs vanilla components

### 2. Performance Monitoring
- Bundle size tracking
- Runtime performance comparison
- Memory usage monitoring
- Real-time update latency measurement

### 3. Fallback Strategy
- Keep original HTML/JS version available
- Quick rollback mechanism
- Progressive enhancement approach

## Success Criteria

### Functional Requirements
- ✅ All existing features work identically
- ✅ Real-time data updates function correctly
- ✅ WebSocket connections remain stable
- ✅ API integration unchanged
- ✅ Performance equal or better than original

### Technical Requirements
- ✅ TypeScript for type safety
- ✅ Component unit test coverage > 90%
- ✅ Bundle size < 500KB gzipped
- ✅ First paint < 2 seconds
- ✅ No memory leaks in 24-hour test

### User Experience
- ✅ Visual appearance identical to original
- ✅ All interactions work as expected
- ✅ Responsive design maintained
- ✅ Accessibility improvements added
- ✅ Error handling enhanced

This plan ensures a systematic, well-tested conversion that maintains all existing functionality while modernizing the codebase for better maintainability and future enhancements.