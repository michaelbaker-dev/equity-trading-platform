// Watchlist panel component - left panel of the trading interface
// Displays user's stock watchlist with real-time price updates

import React from 'react';
import { WatchlistHeader } from './WatchlistHeader';
import { WatchlistFilters } from './WatchlistFilters';
import { WatchlistTable } from './WatchlistTable';
import { WatchlistFooter } from './WatchlistFooter';
import { AddStockModal } from '../search/AddStockModal';
import { useWatchlistSymbols } from '../../stores/watchlistStore';
import { useModalState } from '../../stores/uiStore';
import { useWebSocket } from '../../hooks/useWebSocket';

export const WatchlistPanel: React.FC = () => {
  // Use dynamic symbols from the watchlist store (user-defined functionality)
  const symbols = useWatchlistSymbols();
  const isAddStockModalOpen = useModalState('addStock');
  
  // Connect to WebSocket for real-time updates
  const { isConnected } = useWebSocket(symbols);

  return (
    <div className="watchlist-panel">
      <WatchlistHeader />
      
      <WatchlistFilters />
      
      <div className="watchlist-table-header">
        <div className="column price-column">Price</div>
        <div className="column change-column">% Chg</div>
      </div>
      
      <WatchlistTable symbols={symbols} />
      
      <WatchlistFooter />
      
      {/* Connection status indicator */}
      <div className="connection-status" style={{ 
        padding: '8px 15px', 
        fontSize: '12px',
        color: isConnected ? '#28a745' : '#dc3545',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderTop: '1px solid #f0f0f0'
      }}>
        {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>
      
      {/* Enhanced Add Stock Modal with search functionality */}
      {isAddStockModalOpen && <AddStockModal />}
    </div>
  );
};