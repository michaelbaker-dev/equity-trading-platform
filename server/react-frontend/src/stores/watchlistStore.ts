// Simplified Watchlist management store using Zustand
// Temporarily removing Supabase integration to restore original functionality

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WatchlistStore {
  // Legacy single watchlist support (for backward compatibility)
  symbols: string[];
  addSymbol: (symbol: string) => void;
  removeSymbol: (symbol: string) => void;
  reorderSymbols: (symbols: string[]) => void;
}

export const useWatchlistStore = create<WatchlistStore>()(
  persist(
    (set, get) => ({
      // Default symbols matching the original HTML version
      symbols: ['BAC', 'MSFT', 'NVDA', 'SPY', 'MX', 'STLC', 'NBLY', 'WCN', 'NTR', 'FNV'],

      addSymbol: (symbol: string) => {
        const upperSymbol = symbol.toUpperCase();
        const currentSymbols = get().symbols;
        
        if (currentSymbols.includes(upperSymbol)) {
          console.log(`⚠️  Symbol ${upperSymbol} already in watchlist`);
          return;
        }
        
        console.log(`➕ Adding ${upperSymbol} to watchlist`);
        set((state) => ({
          symbols: [...state.symbols, upperSymbol]
        }));
      },

      removeSymbol: (symbol: string) => {
        const upperSymbol = symbol.toUpperCase();
        console.log(`➖ Removing ${upperSymbol} from watchlist`);
        set((state) => ({
          symbols: state.symbols.filter(s => s !== upperSymbol)
        }));
      },

      reorderSymbols: (symbols: string[]) => {
        console.log('🔄 Reordering watchlist symbols');
        set({ symbols });
      },
    }),
    {
      name: 'equity-watchlist', // localStorage key
      version: 1,
    }
  )
);

// Selector functions for easier component access
export const useWatchlistSymbols = () => useWatchlistStore(state => state.symbols);
export const useWatchlistActions = () => useWatchlistStore(state => ({
  addSymbol: state.addSymbol,
  removeSymbol: state.removeSymbol,
  reorderSymbols: state.reorderSymbols,
}));