// Watchlist table component - displays the list of stocks
// Renders individual stock items with real-time updates

import React from 'react';
import { WatchlistItem } from './WatchlistItem';

interface WatchlistTableProps {
  symbols: string[];
}

export const WatchlistTable: React.FC<WatchlistTableProps> = ({ symbols }) => {
  if (symbols.length === 0) {
    return (
      <div className="empty-watchlist">
        <div className="empty-icon">📈</div>
        <div className="empty-text">Your watchlist is empty</div>
        <div className="empty-subtext">Add stocks to start tracking prices</div>
      </div>
    );
  }

  return (
    <div className="watchlist-items" id="watchlist">
      {symbols.map((symbol) => (
        <WatchlistItem
          key={symbol}
          symbol={symbol}
        />
      ))}
    </div>
  );
};