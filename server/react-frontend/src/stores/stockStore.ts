// Stock data store using Zustand
// Manages selected symbol, time periods, and real-time price updates

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Stock, StockStore, TimePeriod } from '../types';

export const useStockStore = create<StockStore>()(
  subscribeWithSelector((set) => ({
    // Initial state - matches existing app defaults
    selectedSymbol: 'MSFT',
    currentTimePeriod: '1D' as TimePeriod,
    stocks: {},
    realTimePrices: {},

    // Actions
    setSelectedSymbol: (symbol: string) => {
      console.log(`📊 Selecting symbol: ${symbol}`);
      set({ selectedSymbol: symbol });
    },

    setTimePeriod: (period: TimePeriod) => {
      console.log(`⏰ Setting time period: ${period}`);
      set({ currentTimePeriod: period });
    },

    updateStock: (symbol: string, data: Partial<Stock>) => {
      set((state) => ({
        stocks: {
          ...state.stocks,
          [symbol]: {
            ...state.stocks[symbol],
            ...data,
            symbol,
            timestamp: Date.now()
          }
        }
      }));
    },

    updateRealTimePrice: (symbol: string, price: number) => {
      set((state) => {
        const previousPrice = state.realTimePrices[symbol];
        const hasChanged = previousPrice !== price;
        
        if (hasChanged) {
          console.log(`💰 Price update: ${symbol} = ${price} (was ${previousPrice})`);
        }
        
        return {
          realTimePrices: {
            ...state.realTimePrices,
            [symbol]: price
          }
        };
      });
    }
  }))
);

// Selector functions for derived data
export const useSelectedSymbol = () => useStockStore(state => state.selectedSymbol);
export const useCurrentTimePeriod = () => useStockStore(state => state.currentTimePeriod);
export const useStockData = (symbol: string) => useStockStore(state => state.stocks[symbol]);
export const useRealTimePrice = (symbol: string) => useStockStore(state => state.realTimePrices[symbol]);

// Combined selector for stock with real-time price
export const useStockWithPrice = (symbol: string) => useStockStore(state => {
  const stock = state.stocks[symbol];
  const realTimePrice = state.realTimePrices[symbol];
  
  if (!stock) return null;
  
  return {
    ...stock,
    currentPrice: realTimePrice || stock.currentPrice
  };
});