// TypeScript definitions for the Equity Trading Platform
// Based on Go backend API structure

export interface Stock {
  symbol: string;
  name?: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  volume?: number;
  timestamp: number;
}

export interface Quote {
  c: number;  // current price
  d: number;  // change
  dp: number; // percent change
  h: number;  // high
  l: number;  // low
  o: number;  // open
  pc: number; // previous close
}

export interface CompanyProfile {
  country: string;
  currency: string;
  exchange: string;
  ipo: string;
  marketCapitalization: number;
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
  logo: string;
  finnhubIndustry: string;
}

export interface CandleData {
  c: number[]; // close prices
  h: number[]; // high prices
  l: number[]; // low prices
  o: number[]; // open prices
  t: number[]; // timestamps
  v: number[]; // volumes
  s: string;   // status
}

export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image: string;
  datetime: string; // ISO date string from backend
  symbol: string;
}

export interface SearchResult {
  symbol: string;
  description: string;
  type: string;
}

export interface OrderBookLevel {
  price: number;
  volume: number;
}

export interface OrderBook {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export interface WebSocketMessage {
  type: 'trade' | 'subscribe' | 'unsubscribe';
  data?: any;
  symbol?: string;
}

// UI State types
export type TimePeriod = '1D' | '5D' | '1M' | '6M' | 'YTD' | '1Y' | '5Y' | 'Max';
export type TabType = 'chart' | 'options' | 'comments' | 'news' | 'company';

export interface PanelWidths {
  left: number;
  middle: number;
  right: number;
}

export interface ChartDataPoint {
  x: number;
  y: number;
  timestamp: number;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface StockQuoteResponse {
  c: number;  // current price
  d: number;  // change
  dp: number; // percent change
  h: number;  // high
  l: number;  // low
  o: number;  // open
  pc: number; // previous close
  t: number;  // timestamp
}

// Error types
export interface ApiError {
  message: string;
  status: number;
  details?: any;
}

// Component Props types
export interface StockItemProps {
  symbol: string;
  quote?: Quote;
  isSelected?: boolean;
  onSelect?: (symbol: string) => void;
  onRemove?: (symbol: string) => void;
}

export interface ChartProps {
  symbol: string;
  period: TimePeriod;
  data?: CandleData;
  width?: number;
  height?: number;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

// Store types
export interface StockStore {
  selectedSymbol: string;
  currentTimePeriod: TimePeriod;
  stocks: Record<string, Stock>;
  realTimePrices: Record<string, number>;
  setSelectedSymbol: (symbol: string) => void;
  setTimePeriod: (period: TimePeriod) => void;
  updateStock: (symbol: string, data: Partial<Stock>) => void;
  updateRealTimePrice: (symbol: string, price: number) => void;
}

export interface WatchlistStore {
  // Legacy single watchlist support (for backward compatibility)
  symbols: string[];
  addSymbol: (symbol: string) => void;
  removeSymbol: (symbol: string) => void;
  reorderSymbols: (symbols: string[]) => void;

  // Enhanced multi-watchlist support
  watchlists: Record<string, WatchlistWithItems>;
  activeWatchlistId: string | null;
  isLoading: boolean;
  isOnline: boolean;
  lastSyncTime: number | null;

  // Watchlist management
  createWatchlist: (name: string, description?: string, isDefault?: boolean) => Promise<void>;
  deleteWatchlist: (watchlistId: string) => Promise<void>;
  setActiveWatchlist: (watchlistId: string) => void;
  renameWatchlist: (watchlistId: string, name: string) => Promise<void>;

  // Symbol management (for active watchlist)
  addSymbolToWatchlist: (symbol: string, watchlistId?: string) => Promise<void>;
  removeSymbolFromWatchlist: (symbol: string, watchlistId?: string) => Promise<void>;
  reorderWatchlistSymbols: (symbols: string[], watchlistId?: string) => Promise<void>;

  // Data synchronization
  syncWithSupabase: () => Promise<void>;
  loadFromSupabase: () => Promise<void>;
  migrateFromLocalStorage: () => Promise<void>;

  // Utility functions
  getActiveWatchlistSymbols: () => string[];
  getWatchlistById: (id: string) => WatchlistWithItems | null;
  isSymbolInWatchlist: (symbol: string, watchlistId?: string) => boolean;
}

// Extended types for Supabase integration
export interface WatchlistWithItems {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  items: WatchlistItemWithId[];
}

export interface WatchlistItemWithId {
  id: string;
  watchlist_id: string;
  symbol: string;
  display_name?: string;
  position: number;
  added_at: string;
}

export interface UIStore {
  panelWidths: PanelWidths;
  activeTab: TabType;
  modals: {
    addStock: boolean;
    [key: string]: boolean;
  };
  setPanelWidths: (widths: PanelWidths) => void;
  setActiveTab: (tab: TabType) => void;
  openModal: (modal: string) => void;
  closeModal: (modal: string) => void;
}