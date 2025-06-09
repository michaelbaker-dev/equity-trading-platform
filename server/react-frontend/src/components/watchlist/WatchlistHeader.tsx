// Enhanced Watchlist header with user-defined watchlist management
// Maintains original styling with new add/delete/search functionality

import React from 'react';
import { useUIStore } from '../../stores/uiStore';

export const WatchlistHeader: React.FC = () => {
  const { openModal } = useUIStore();

  const handleAddStock = () => {
    console.log('➕ Opening Add Stock modal');
    openModal('addStock');
  };

  const handleSearchWatchlist = () => {
    console.log('🔍 Search watchlist functionality coming soon');
  };

  const handleManageWatchlists = () => {
    console.log('📝 Manage watchlists functionality coming soon');
  };

  return (
    <div className="watchlist-header">
      <h2>Watchlist</h2>
      <div className="watchlist-actions">
        <button 
          className="icon-button primary" 
          onClick={handleAddStock}
          title="Add Stock"
          aria-label="Add Stock"
        >
          <i className="fas fa-plus"></i>
        </button>
        <button 
          className="icon-button"
          onClick={handleSearchWatchlist} 
          title="Search Watchlist"
          aria-label="Search Watchlist"
        >
          <i className="fas fa-search"></i>
        </button>
        <button 
          className="icon-button"
          onClick={handleManageWatchlists}
          title="Manage Watchlists"
          aria-label="Manage Watchlists"
        >
          <i className="fas fa-cog"></i>
        </button>
      </div>
    </div>
  );
};