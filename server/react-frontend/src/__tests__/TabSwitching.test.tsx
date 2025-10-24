import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StockDetailPanel } from '../components/stock-detail/StockDetailPanel';
import { useSelectedSymbol } from '../stores/stockStore';
import { useActiveTab, useUIStore } from '../stores/uiStore';

// Mock stores
vi.mock('../stores/stockStore');
vi.mock('../stores/uiStore');
vi.mock('../hooks/useStockData', () => ({
  useStockQuote: () => ({ data: { c: 100, d: 1, dp: 1, h: 101, l: 99, o: 99.5, pc: 99 }, isLoading: false }),
  useCompanyProfile: () => ({ data: { name: 'Test Company', marketCapitalization: 1000000000 }, isLoading: false }),
  useStockNews: () => ({ data: [], isLoading: false })
}));

// Mock TradingView
(window as any).TradingView = {
  widget: vi.fn().mockImplementation(() => ({
    remove: vi.fn()
  }))
};

describe('Tab Switching', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  beforeEach(() => {
    (useSelectedSymbol as any).mockReturnValue('AAPL');
    (useActiveTab as any).mockReturnValue('chart');
    (useUIStore as any).mockReturnValue({
      setActiveTab: vi.fn()
    });
  });

  it('switches from Chart to News tab without errors', () => {
    const setActiveTab = vi.fn();
    (useUIStore as any).mockReturnValue({ setActiveTab });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <StockDetailPanel />
      </QueryClientProvider>
    );

    // Click on News tab
    const newsTab = screen.getByText('News');
    fireEvent.click(newsTab);

    // Verify setActiveTab was called
    expect(setActiveTab).toHaveBeenCalledWith('news');

    // Update the active tab mock
    (useActiveTab as any).mockReturnValue('news');
    
    // Rerender with news tab active
    expect(() => {
      rerender(
        <QueryClientProvider client={queryClient}>
          <StockDetailPanel />
        </QueryClientProvider>
      );
    }).not.toThrow();
  });

  it('switches between multiple tabs without errors', () => {
    const setActiveTab = vi.fn();
    (useUIStore as any).mockReturnValue({ setActiveTab });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <StockDetailPanel />
      </QueryClientProvider>
    );

    const tabs = ['news', 'options', 'comments', 'company', 'ai', 'chart'];

    tabs.forEach((tabName) => {
      const tab = screen.getByText(tabName === 'ai' ? 'AI' : tabName.charAt(0).toUpperCase() + tabName.slice(1));
      fireEvent.click(tab);
      
      expect(setActiveTab).toHaveBeenCalledWith(tabName);
      
      // Update mock and rerender
      (useActiveTab as any).mockReturnValue(tabName);
      
      expect(() => {
        rerender(
          <QueryClientProvider client={queryClient}>
            <StockDetailPanel />
          </QueryClientProvider>
        );
      }).not.toThrow();
    });
  });

  it('handles rapid tab switching without errors', () => {
    const setActiveTab = vi.fn();
    (useUIStore as any).mockReturnValue({ setActiveTab });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <StockDetailPanel />
      </QueryClientProvider>
    );

    // Simulate rapid clicking between Chart and News
    for (let i = 0; i < 5; i++) {
      const chartTab = screen.getByText('Chart');
      fireEvent.click(chartTab);
      
      (useActiveTab as any).mockReturnValue('chart');
      rerender(
        <QueryClientProvider client={queryClient}>
          <StockDetailPanel />
        </QueryClientProvider>
      );
      
      const newsTab = screen.getByText('News');
      fireEvent.click(newsTab);
      
      (useActiveTab as any).mockReturnValue('news');
      rerender(
        <QueryClientProvider client={queryClient}>
          <StockDetailPanel />
        </QueryClientProvider>
      );
    }
    
    // Should complete without throwing errors
    expect(setActiveTab).toHaveBeenCalledTimes(10);
  });
});