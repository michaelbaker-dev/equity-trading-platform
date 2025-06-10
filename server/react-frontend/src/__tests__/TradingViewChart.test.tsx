import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TradingViewChart } from '../components/charts/TradingViewChart';

// Mock the TradingView script
beforeEach(() => {
  // Reset DOM
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  
  // Mock window.TradingView
  (window as any).TradingView = {
    widget: vi.fn().mockImplementation(() => ({
      remove: vi.fn()
    }))
  };
});

describe('TradingViewChart', () => {
  it('renders with correct symbol', () => {
    const { container } = render(<TradingViewChart symbol="AAPL" />);
    
    // Check that container is created
    expect(container.querySelector('.tradingview-widget-container')).toBeTruthy();
    
    // Check that the symbol is included in the copyright link
    expect(screen.getByText('AAPL chart')).toBeTruthy();
  });

  it('loads TradingView script when not already loaded', () => {
    // Ensure TradingView is not already loaded
    delete (window as any).TradingView;
    
    render(<TradingViewChart symbol="MSFT" />);
    
    // Check that script is added to document head
    const scripts = document.querySelectorAll('script[src="https://s3.tradingview.com/tv.js"]');
    expect(scripts.length).toBeGreaterThan(0);
  });

  it('creates widget with correct config', () => {
    render(<TradingViewChart symbol="GOOGL" theme="dark" height={500} />);
    
    // Wait for script to load
    const script = document.querySelector('script[src="https://s3.tradingview.com/tv.js"]');
    if (script && 'onload' in script) {
      (script as HTMLScriptElement).onload!(new Event('load'));
    }
    
    // Check that TradingView widget was called with correct config
    expect(window.TradingView.widget).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: 'GOOGL',
        theme: 'dark',
        autosize: true,
        container_id: expect.stringContaining('tradingview_GOOGL')
      })
    );
  });

  it('cleans up on unmount', () => {
    const { unmount } = render(<TradingViewChart symbol="TSLA" />);
    
    // Create mock widget with DOM element
    const mockRemove = vi.fn();
    const mockWidget = { remove: mockRemove };
    (window as any).TradingView.widget.mockReturnValue(mockWidget);
    
    // Create a mock DOM element for the widget
    const widgetElement = document.createElement('div');
    widgetElement.id = 'tradingview_TSLA_123456';
    document.body.appendChild(widgetElement);
    
    // Trigger script load
    const script = document.querySelector('script[src="https://s3.tradingview.com/tv.js"]');
    if (script && 'onload' in script) {
      (script as HTMLScriptElement).onload!(new Event('load'));
    }
    
    // Unmount component
    unmount();
    
    // Check that cleanup occurred without errors
    expect(() => unmount()).not.toThrow();
  });

  it('updates when symbol changes', () => {
    const { rerender } = render(<TradingViewChart symbol="AAPL" />);
    
    // Initial render
    expect(screen.getByText('AAPL chart')).toBeTruthy();
    
    // Change symbol
    rerender(<TradingViewChart symbol="AMZN" />);
    
    // Check that new symbol is displayed
    expect(screen.getByText('AMZN chart')).toBeTruthy();
  });
});