// Order book panel component - right panel of the trading interface
// Displays real-time bid/ask data and trading information

import React from 'react';
import { useSelectedSymbol } from '../../stores/stockStore';
import { useStockQuote, useOrderBook } from '../../hooks/useStockData';

export const OrderBookPanel: React.FC = () => {
  const selectedSymbol = useSelectedSymbol();
  const { data: quote, isLoading: quoteLoading } = useStockQuote(selectedSymbol || 'MSFT');
  const { data: orderBook, isLoading: orderBookLoading } = useOrderBook(selectedSymbol || 'MSFT');
  
  // Type the data properly
  const quoteData = quote as any;
  const orderBookData = orderBook as any;
  const isLoading = quoteLoading || orderBookLoading;

  return (
    <div className="order-book-panel">
      <div className="order-book-header">
        <div className="back-button">
          <i className="fas fa-chevron-left"></i>
        </div>
        <div className="stock-info">
          <div className="stock-symbol">{selectedSymbol || 'MSFT'}</div>
          <div className="stock-price">
            {isLoading ? 'Loading...' : (quoteData?.c?.toFixed(2) || '---')}
            {!isLoading && quoteData?.d && (
              <i className={`fas ${quoteData.d >= 0 ? 'fa-caret-up' : 'fa-caret-down'}`}></i>
            )}
          </div>
          <div className={`stock-change ${quoteData?.d >= 0 ? 'positive' : 'negative'}`}>
            {isLoading ? 'Loading...' : (
              quoteData?.d && quoteData?.dp ? 
                `${quoteData.d >= 0 ? '+' : ''}${quoteData.d.toFixed(2)} ${quoteData.dp >= 0 ? '+' : ''}${quoteData.dp.toFixed(2)}%` : 
                '--- ---'
            )}
          </div>
        </div>
        <div className="stock-search">
          <i className="fas fa-search"></i>
        </div>
        <div className="stock-favorite">
          <i className="fas fa-heart"></i>
        </div>
      </div>
      
      <div className="order-book-navigation">
        <div className="nav-item active">Chart</div>
        <div className="nav-item">Options</div>
        <div className="nav-item">Comments</div>
        <div className="nav-item">News</div>
        <div className="nav-item">Company</div>
      </div>
      
      <div className="order-actions">
        <div className="action-button">Trade</div>
        <div className="action-button">Positions</div>
        <div className="action-button">Orders</div>
        <div className="action-button">History</div>
      </div>
      
      <div className="bid-ask-container">
        <div className="bid-container">
          <div className="bid-label">Bid</div>
          <div className="bid-percentage">
            {isLoading ? '...' : (orderBookData?.bids?.[0] ? '12.50%' : '---')}
          </div>
          <div className="bid-price">
            {isLoading ? 'Loading...' : (orderBookData?.bids?.[0]?.price?.toFixed(3) || '---')}
          </div>
          <div className="bid-quantity">
            {isLoading ? '...' : (orderBookData?.bids?.[0]?.volume || '---')}
          </div>
        </div>
        <div className="ask-container">
          <div className="ask-label">Ask</div>
          <div className="ask-percentage">
            {isLoading ? '...' : (orderBookData?.asks?.[0] ? '87.50%' : '---')}
          </div>
          <div className="ask-price">
            {isLoading ? 'Loading...' : (orderBookData?.asks?.[0]?.price?.toFixed(3) || '---')}
          </div>
          <div className="ask-quantity">
            {isLoading ? '...' : (orderBookData?.asks?.[0]?.volume || '---')}
          </div>
        </div>
      </div>
      
      <div className="level-info">
        <div className="level-label">Level 2 data ends in 16 days</div>
        <div className="access-button">Access Unlimited</div>
      </div>
      
      <div className="order-book-title">Order Book</div>
      
      <div className="order-book-table" id="order-book">
        {isLoading ? (
          <div className="order-book-loading">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading order book data...</div>
          </div>
        ) : orderBookData?.bids && orderBookData?.asks ? (
          // Display real order book data from Finnhub
          [...Array(Math.min(6, Math.max(orderBookData.bids.length, orderBookData.asks.length)))].map((_, index) => (
            <div key={index} className="order-row">
              <div className="bid-side">
                <div className="quantity">
                  {orderBookData.bids[index]?.volume || '---'}
                </div>
                <div className="price">
                  {orderBookData.bids[index]?.price?.toFixed(3) || '---'}
                </div>
                <div className="exchange">ARCA</div>
              </div>
              <div className="ask-side">
                <div className="exchange">ARCA</div>
                <div className="price">
                  {orderBookData.asks[index]?.price?.toFixed(3) || '---'}
                </div>
                <div className="quantity">
                  {orderBookData.asks[index]?.volume || '---'}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="order-book-error">
            <div className="error-message">
              <i className="fas fa-exclamation-triangle"></i>
              <div>Order book data unavailable</div>
              <div className="error-subtext">
                Level 2 data may require premium subscription
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="market-footer">
        <div className="market-label">NASDAQ</div>
        <div className="market-value">14094.38</div>
        <div className="market-change positive">+326.64</div>
        <div className="market-percent positive">+2.37%</div>
      </div>
    </div>
  );
};