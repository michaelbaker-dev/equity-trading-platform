// Main application layout component
// Renders the three-panel trading interface with resizable handles

import React from 'react';
import { WatchlistPanel } from '../watchlist/WatchlistPanel';
import { StockDetailPanel } from '../stock-detail/StockDetailPanel';
import { OrderBookPanel } from '../order-book/OrderBookPanel';
import { ResizeHandle } from './ResizeHandle';
import { useResizable } from '../../hooks/useResizable';

export const AppLayout: React.FC = () => {
  const {
    panelWidths,
    handleLeftMouseDown,
    handleRightMouseDown,
    isDragging
  } = useResizable();

  return (
    <div className="app-container">
      {/* Left Panel: Enhanced Watchlist with user-defined features */}
      <div 
        className="watchlist-panel"
        style={{ width: `${panelWidths.left}px` }}
      >
        <WatchlistPanel />
      </div>
      
      {/* Resize handle between watchlist and stock detail panels */}
      <ResizeHandle
        id="handle-left"
        onMouseDown={handleLeftMouseDown}
        isActive={isDragging === 'left'}
      />
      
      {/* Middle Panel: Stock Details */}
      <div 
        className="stock-detail-panel"
        style={{ width: `${panelWidths.middle}px` }}
      >
        <StockDetailPanel />
      </div>
      
      {/* Resize handle between stock detail and order book panels */}
      <ResizeHandle
        id="handle-right"
        onMouseDown={handleRightMouseDown}
        isActive={isDragging === 'right'}
      />
      
      {/* Right Panel: Order Book */}
      <div 
        className="order-book-panel"
        style={{ width: `${panelWidths.right}px` }}
      >
        <OrderBookPanel />
      </div>
    </div>
  );
};