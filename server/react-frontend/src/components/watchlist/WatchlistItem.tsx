// Individual watchlist item component
// Displays stock symbol, name, price, and mini chart with real-time updates

import React, { useState, useEffect } from 'react';
import { useStockQuote, useCompanyProfile } from '../../hooks/useStockData';
import { useStockStore, useRealTimePrice } from '../../stores/stockStore';
import { useWatchlistStore } from '../../stores/watchlistStore';
import { MiniChart } from './MiniChart';

interface WatchlistItemProps {
  symbol: string;
}

export const WatchlistItem: React.FC<WatchlistItemProps> = ({ symbol }) => {
  const { data: quote, isLoading: quoteLoading, error } = useStockQuote(symbol);
  const { data: profile, isLoading: profileLoading } = useCompanyProfile(symbol);
  const { selectedSymbol, setSelectedSymbol } = useStockStore();
  const { removeSymbol } = useWatchlistStore();
  const realTimePrice = useRealTimePrice(symbol);
  
  const isLoading = quoteLoading; // Don't wait for profile for main loading state
  
  const [priceFlashClass, setPriceFlashClass] = useState('');
  const [previousPrice, setPreviousPrice] = useState<number | null>(null);

  const isSelected = selectedSymbol === symbol;
  const currentPrice = realTimePrice || (quote as any)?.c || 0;
  const change = (quote as any)?.d || 0;
  const changePercent = (quote as any)?.dp || 0;
  const isPositive = change >= 0;

  // Handle price flash animation
  useEffect(() => {
    if (previousPrice !== null && currentPrice !== previousPrice) {
      const flashClass = currentPrice > previousPrice ? 'price-flash-up' : 'price-flash-down';
      setPriceFlashClass(flashClass);
      
      // Remove flash class after animation
      const timer = setTimeout(() => {
        setPriceFlashClass('');
      }, 800);
      
      return () => clearTimeout(timer);
    }
    setPreviousPrice(currentPrice);
  }, [currentPrice, previousPrice]);

  const handleSelect = () => {
    setSelectedSymbol(symbol);
    console.log(`📊 Selected stock: ${symbol}`);
  };

  const handleRemove = (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent selection when removing
    if (window.confirm(`Remove ${symbol} from watchlist?`)) {
      removeSymbol(symbol);
    }
  };

  if (error) {
    return (
      <div className="watchlist-item error" onClick={handleSelect}>
        <div className="stock-info">
          <div className="stock-symbol">{symbol}</div>
          <div className="stock-name">Error loading data</div>
        </div>
        <div className="stock-price">
          <div className="error-message">Failed to load</div>
        </div>
        <button 
          className="remove-stock-btn"
          onClick={handleRemove}
          title={`Remove ${symbol}`}
          aria-label={`Remove ${symbol} from watchlist`}
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div 
      className={`watchlist-item ${isSelected ? 'active' : ''} ${priceFlashClass}`}
      onClick={handleSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleSelect();
        }
      }}
      aria-label={`Select ${symbol}, current price ${currentPrice.toFixed(2)}`}
    >
      <div className="stock-info">
        <div className="stock-symbol">{symbol}</div>
        <div className="stock-name">
          {profileLoading ? 'Loading...' : (profile?.name || symbol)}
        </div>
      </div>
      
      <div className="stock-price">
        <MiniChart symbol={symbol} />
        
        <div className="price-value" data-testid={`price-${symbol}`}>
          {isLoading ? '...' : currentPrice.toFixed(2)}
        </div>
        
        <div className={`price-change ${isPositive ? 'positive' : 'negative'}`}>
          {isLoading ? '...' : (
            <>
              {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
            </>
          )}
        </div>
      </div>
      
      {/* Remove button - shows on hover */}
      <button 
        className="remove-stock-btn"
        onClick={handleRemove}
        title={`Remove ${symbol}`}
        aria-label={`Remove ${symbol} from watchlist`}
      >
        ×
      </button>
    </div>
  );
};