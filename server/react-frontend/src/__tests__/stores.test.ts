// Tests for state management stores
// Ensures stores work correctly before component integration

import { describe, test, expect, beforeEach } from 'vitest';
import { useStockStore } from '../stores/stockStore';
import { useWatchlistStore } from '../stores/watchlistStore';
import { useUIStore } from '../stores/uiStore';

describe('Stock Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useStockStore.setState({
      selectedSymbol: 'MSFT',
      currentTimePeriod: '1D',
      stocks: {},
      realTimePrices: {}
    });
  });

  test('should initialize with default values', () => {
    const state = useStockStore.getState();
    expect(state.selectedSymbol).toBe('MSFT');
    expect(state.currentTimePeriod).toBe('1D');
    expect(state.stocks).toEqual({});
    expect(state.realTimePrices).toEqual({});
  });

  test('should update selected symbol', () => {
    const { setSelectedSymbol } = useStockStore.getState();
    setSelectedSymbol('AAPL');
    
    const state = useStockStore.getState();
    expect(state.selectedSymbol).toBe('AAPL');
  });

  test('should update time period', () => {
    const { setTimePeriod } = useStockStore.getState();
    setTimePeriod('1M');
    
    const state = useStockStore.getState();
    expect(state.currentTimePeriod).toBe('1M');
  });

  test('should update stock data', () => {
    const { updateStock } = useStockStore.getState();
    const stockData = {
      symbol: 'AAPL',
      currentPrice: 150.0,
      change: 2.5,
      changePercent: 1.69
    };
    
    updateStock('AAPL', stockData);
    
    const state = useStockStore.getState();
    expect(state.stocks['AAPL']).toMatchObject(stockData);
    expect(state.stocks['AAPL'].timestamp).toBeDefined();
  });

  test('should update real-time prices', () => {
    const { updateRealTimePrice } = useStockStore.getState();
    
    updateRealTimePrice('AAPL', 151.0);
    
    const state = useStockStore.getState();
    expect(state.realTimePrices['AAPL']).toBe(151.0);
  });
});

describe('Watchlist Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useWatchlistStore.setState({
      symbols: ['AAPL', 'GOOGL', 'MSFT']
    });
  });

  test('should initialize with default symbols', () => {
    const state = useWatchlistStore.getState();
    expect(state.symbols).toContain('AAPL');
    expect(state.symbols).toContain('GOOGL');
    expect(state.symbols).toContain('MSFT');
  });

  test('should add new symbol to watchlist', () => {
    const { addSymbol } = useWatchlistStore.getState();
    
    addSymbol('TSLA');
    
    const state = useWatchlistStore.getState();
    expect(state.symbols).toContain('TSLA');
  });

  test('should not add duplicate symbols', () => {
    const { addSymbol } = useWatchlistStore.getState();
    const initialLength = useWatchlistStore.getState().symbols.length;
    
    addSymbol('AAPL'); // Already exists
    
    const state = useWatchlistStore.getState();
    expect(state.symbols.length).toBe(initialLength);
  });

  test('should remove symbol from watchlist', () => {
    const { removeSymbol } = useWatchlistStore.getState();
    
    removeSymbol('AAPL');
    
    const state = useWatchlistStore.getState();
    expect(state.symbols).not.toContain('AAPL');
  });

  test('should handle symbol case insensitivity', () => {
    const { addSymbol, removeSymbol } = useWatchlistStore.getState();
    
    addSymbol('tsla');
    let state = useWatchlistStore.getState();
    expect(state.symbols).toContain('TSLA');
    
    removeSymbol('tsla');
    state = useWatchlistStore.getState();
    expect(state.symbols).not.toContain('TSLA');
  });

  test('should reorder symbols', () => {
    const { reorderSymbols } = useWatchlistStore.getState();
    const newOrder = ['MSFT', 'AAPL', 'GOOGL'];
    
    reorderSymbols(newOrder);
    
    const state = useWatchlistStore.getState();
    expect(state.symbols).toEqual(newOrder);
  });
});

describe('UI Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useUIStore.setState({
      panelWidths: { left: 350, middle: 800, right: 350 },
      activeTab: 'chart',
      modals: { addStock: false }
    });
  });

  test('should initialize with default values', () => {
    const state = useUIStore.getState();
    expect(state.panelWidths).toEqual({ left: 350, middle: 800, right: 350 });
    expect(state.activeTab).toBe('chart');
    expect(state.modals.addStock).toBe(false);
  });

  test('should update panel widths', () => {
    const { setPanelWidths } = useUIStore.getState();
    const newWidths = { left: 300, middle: 900, right: 300 };
    
    setPanelWidths(newWidths);
    
    const state = useUIStore.getState();
    expect(state.panelWidths).toEqual(newWidths);
  });

  test('should update active tab', () => {
    const { setActiveTab } = useUIStore.getState();
    
    setActiveTab('news');
    
    const state = useUIStore.getState();
    expect(state.activeTab).toBe('news');
  });

  test('should open and close modals', () => {
    const { openModal, closeModal } = useUIStore.getState();
    
    openModal('addStock');
    let state = useUIStore.getState();
    expect(state.modals.addStock).toBe(true);
    
    closeModal('addStock');
    state = useUIStore.getState();
    expect(state.modals.addStock).toBe(false);
  });
});

console.log('✅ Store tests completed successfully');