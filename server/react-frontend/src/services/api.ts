// API service layer for Go backend integration
// Maintains exact same endpoints as the existing backend

import axios, { type AxiosInstance, AxiosError } from 'axios';
import type { 
  Quote, 
  CompanyProfile, 
  CandleData, 
  NewsItem, 
  SearchResult, 
  OrderBook,
  ApiError 
} from '../types';

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    // Use the same base URL as the existing application
    this.baseURL = window.location.origin;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error: AxiosError) => {
        const apiError: ApiError = {
          message: error.message || 'An error occurred',
          status: error.response?.status || 500,
          details: error.response?.data
        };
        
        console.error(`❌ API Error: ${apiError.status} ${apiError.message}`);
        return Promise.reject(apiError);
      }
    );
  }

  // Test server connectivity
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/v1/health');
      return response.status === 200;
    } catch (error) {
      console.warn('Server connectivity test failed, trying backup endpoint...');
      try {
        // Try a stock quote as fallback test
        const response = await this.client.get('/api/v1/stocks/quote/AAPL');
        return response.status === 200;
      } catch (fallbackError) {
        console.error('Server appears to be down');
        return false;
      }
    }
  }

  // Get stock quote - matches existing endpoint exactly
  async getQuote(symbol: string): Promise<Quote> {
    const response = await this.client.get(`/api/v1/stocks/quote/${symbol}`);
    return response.data;
  }

  // Get candlestick data - matches existing endpoint exactly
  async getCandles(
    symbol: string, 
    resolution: string, 
    from: number, 
    to: number
  ): Promise<CandleData> {
    const response = await this.client.get(`/api/v1/stocks/${symbol}/candles`, {
      params: { resolution, from, to }
    });
    return response.data;
  }

  // Get company profile - matches existing endpoint exactly  
  async getProfile(symbol: string): Promise<CompanyProfile> {
    const response = await this.client.get(`/api/v1/stocks/${symbol}/profile`);
    return response.data;
  }

  // Search stocks - matches existing endpoint exactly
  async searchStocks(query: string): Promise<SearchResult[]> {
    const response = await this.client.get('/api/v1/search/stocks', {
      params: { q: query }
    });
    return response.data;
  }

  // Get stock news - matches existing endpoint exactly
  async getNews(symbol: string, from?: string, to?: string): Promise<NewsItem[]> {
    const params: any = {};
    if (from) params.from = from;
    if (to) params.to = to;
    
    const response = await this.client.get(`/api/v1/stocks/${symbol}/news`, {
      params
    });
    return response.data;
  }

  // Get order book data - matches existing endpoint exactly
  async getOrderBook(symbol: string): Promise<OrderBook> {
    const response = await this.client.get(`/api/v1/stocks/${symbol}/orderbook`);
    return response.data;
  }

  // WebSocket URL for real-time data
  getWebSocketUrl(): string {
    // Connect directly to backend for WebSocket (bypass proxy)
    if (import.meta.env.DEV) {
      return 'ws://localhost:8080/api/v1/ws/stocks';
    }
    
    // For production, use same host with WebSocket protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/api/v1/ws/stocks`;
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Export individual API functions for convenience
export const stockAPI = {
  testConnection: () => apiClient.testConnection(),
  getQuote: (symbol: string) => apiClient.getQuote(symbol),
  getCandles: (symbol: string, resolution: string, from: number, to: number) => 
    apiClient.getCandles(symbol, resolution, from, to),
  getProfile: (symbol: string) => apiClient.getProfile(symbol),
  searchStocks: (query: string) => apiClient.searchStocks(query),
  getNews: (symbol: string, from?: string, to?: string) => 
    apiClient.getNews(symbol, from, to),
  getOrderBook: (symbol: string) => apiClient.getOrderBook(symbol),
  getWebSocketUrl: () => apiClient.getWebSocketUrl()
};

// Helper function for time range calculations (matches existing logic)
export const calculateTimeRange = (period: string) => {
  const to = Math.floor(Date.now() / 1000);
  let resolution: string;
  let from: number;
  
  switch(period) {
    case '1D':
      resolution = '5';
      from = to - 60 * 60 * 24;
      break;
    case '5D':
      resolution = '15';
      from = to - 60 * 60 * 24 * 5;
      break;
    case '1M':
      resolution = 'D';
      from = to - 60 * 60 * 24 * 30;
      break;
    case '6M':
      resolution = 'D';
      from = to - 60 * 60 * 24 * 180;
      break;
    case 'YTD':
      resolution = 'D';
      const yearStart = new Date(new Date().getFullYear(), 0, 1);
      from = Math.floor(yearStart.getTime() / 1000);
      break;
    case '1Y':
      resolution = 'D';
      from = to - 60 * 60 * 24 * 365;
      break;
    case '5Y':
      resolution = 'D';
      from = to - 60 * 60 * 24 * 365 * 5;
      break;
    case 'Max':
      resolution = 'D';
      from = to - 60 * 60 * 24 * 365 * 2; // 2 years max for free tier
      break;
    default:
      resolution = 'D';
      from = to - 60 * 60 * 24 * 30;
  }
  
  return { resolution, from, to };
};