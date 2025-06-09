// React Query hooks for stock data fetching
// Provides caching, background updates, and error handling

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockAPI, calculateTimeRange } from '../services/api';
import type { TimePeriod } from '../types';

// Query key factory for consistent cache keys
export const stockQueryKeys = {
  all: ['stocks'] as const,
  quotes: () => [...stockQueryKeys.all, 'quotes'] as const,
  quote: (symbol: string) => [...stockQueryKeys.quotes(), symbol] as const,
  profiles: () => [...stockQueryKeys.all, 'profiles'] as const,
  profile: (symbol: string) => [...stockQueryKeys.profiles(), symbol] as const,
  candles: () => [...stockQueryKeys.all, 'candles'] as const,
  candlesForSymbol: (symbol: string) => [...stockQueryKeys.candles(), symbol] as const,
  candlesForPeriod: (symbol: string, period: TimePeriod) => 
    [...stockQueryKeys.candlesForSymbol(symbol), period] as const,
  news: () => [...stockQueryKeys.all, 'news'] as const,
  newsForSymbol: (symbol: string) => [...stockQueryKeys.news(), symbol] as const,
  orderBooks: () => [...stockQueryKeys.all, 'orderbooks'] as const,
  orderBook: (symbol: string) => [...stockQueryKeys.orderBooks(), symbol] as const,
  search: (query: string) => ['search', query] as const,
};

// Stock quote hook with real-time updates
export const useStockQuote = (symbol: string, enabled = true) => {
  return useQuery({
    queryKey: stockQueryKeys.quote(symbol),
    queryFn: () => stockAPI.getQuote(symbol),
    enabled: enabled && !!symbol,
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30000, // Refetch every 30 seconds for real-time feel
    refetchOnWindowFocus: true,
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 3;
    }
  });
};

// Company profile hook
export const useCompanyProfile = (symbol: string, enabled = true) => {
  return useQuery({
    queryKey: stockQueryKeys.profile(symbol),
    queryFn: () => stockAPI.getProfile(symbol),
    enabled: enabled && !!symbol,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours (company data doesn't change often)
    gcTime: 24 * 60 * 60 * 1000,
    retry: 2
  });
};

// Candlestick data hook
export const useCandleData = (symbol: string, period: TimePeriod, enabled = true) => {
  return useQuery({
    queryKey: stockQueryKeys.candlesForPeriod(symbol, period),
    queryFn: async () => {
      const { resolution, from, to } = calculateTimeRange(period);
      return stockAPI.getCandles(symbol, resolution, from, to);
    },
    enabled: enabled && !!symbol && !!period,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
};

// Stock news hook
export const useStockNews = (symbol: string, enabled = true) => {
  return useQuery({
    queryKey: stockQueryKeys.newsForSymbol(symbol),
    queryFn: () => {
      // Get news for the last 7 days
      const to = new Date().toISOString().split('T')[0];
      const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      return stockAPI.getNews(symbol, from, to);
    },
    enabled: enabled && !!symbol,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 2
  });
};

// Order book hook
export const useOrderBook = (symbol: string, enabled = true) => {
  return useQuery({
    queryKey: stockQueryKeys.orderBook(symbol),
    queryFn: () => stockAPI.getOrderBook(symbol),
    enabled: enabled && !!symbol,
    staleTime: 10000, // 10 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10000, // Refetch every 10 seconds for order book updates
    retry: 3
  });
};

// Stock search hook with debounced queries
export const useStockSearch = (query: string, enabled = true) => {
  return useQuery({
    queryKey: stockQueryKeys.search(query),
    queryFn: () => stockAPI.searchStocks(query),
    enabled: enabled && !!query && query.length >= 2, // Only search with 2+ characters
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2
  });
};

// Combined hook for stock overview (quote + profile)
export const useStockOverview = (symbol: string, enabled = true) => {
  const quote = useStockQuote(symbol, enabled);
  const profile = useCompanyProfile(symbol, enabled);
  
  return {
    quote: quote.data,
    profile: profile.data,
    isLoading: quote.isLoading || profile.isLoading,
    isError: quote.isError || profile.isError,
    error: quote.error || profile.error,
    isSuccess: quote.isSuccess && profile.isSuccess
  };
};

// Mutation for cache invalidation (useful for manual refresh)
export const useRefreshStockData = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (symbol: string) => {
      // Invalidate all data for the symbol
      await queryClient.invalidateQueries({ queryKey: stockQueryKeys.quote(symbol) });
      await queryClient.invalidateQueries({ queryKey: stockQueryKeys.profile(symbol) });
      await queryClient.invalidateQueries({ queryKey: stockQueryKeys.candlesForSymbol(symbol) });
      await queryClient.invalidateQueries({ queryKey: stockQueryKeys.newsForSymbol(symbol) });
      await queryClient.invalidateQueries({ queryKey: stockQueryKeys.orderBook(symbol) });
      
      console.log(`🔄 Refreshed all data for ${symbol}`);
    },
    onError: (error) => {
      console.error('❌ Failed to refresh stock data:', error);
    }
  });
};

// Hook for preloading data (useful for hover effects)
export const usePreloadStockData = () => {
  const queryClient = useQueryClient();
  
  return {
    preloadQuote: (symbol: string) => {
      queryClient.prefetchQuery({
        queryKey: stockQueryKeys.quote(symbol),
        queryFn: () => stockAPI.getQuote(symbol),
        staleTime: 30000
      });
    },
    
    preloadProfile: (symbol: string) => {
      queryClient.prefetchQuery({
        queryKey: stockQueryKeys.profile(symbol),
        queryFn: () => stockAPI.getProfile(symbol),
        staleTime: 24 * 60 * 60 * 1000
      });
    }
  };
};