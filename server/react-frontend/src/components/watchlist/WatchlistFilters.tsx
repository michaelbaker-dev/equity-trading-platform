// Watchlist filters component
// Provides filtering options for the watchlist display

import React, { useState } from 'react';

export const WatchlistFilters: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const handleFilterClick = (filterType: string) => {
    setActiveFilter(activeFilter === filterType ? null : filterType);
    console.log(`🔽 Filter clicked: ${filterType}`);
    
    // TODO: Implement actual filtering logic
    switch (filterType) {
      case 'file':
        console.log('📄 File filter - show saved lists');
        break;
      case 'chart':
        console.log('📈 Chart filter - show chart view');
        break;
      case 'grid':
        console.log('🔲 Grid filter - show grid layout');
        break;
      case 'settings':
        console.log('⚙️ Settings filter - show options');
        break;
    }
  };

  return (
    <div className="watchlist-filters">
      <button 
        className={`filter-button ${activeFilter === 'file' ? 'active' : ''}`}
        onClick={() => handleFilterClick('file')}
        title="File Options"
        aria-label="File Options"
      >
        <i className="fas fa-file"></i>
      </button>
      
      <button 
        className={`filter-button ${activeFilter === 'chart' ? 'active' : ''}`}
        onClick={() => handleFilterClick('chart')}
        title="Chart View"
        aria-label="Chart View"
      >
        <i className="fas fa-chart-line"></i>
      </button>
      
      <button 
        className={`filter-button ${activeFilter === 'grid' ? 'active' : ''}`}
        onClick={() => handleFilterClick('grid')}
        title="Grid Layout"
        aria-label="Grid Layout"
      >
        <i className="fas fa-th"></i>
      </button>
      
      <button 
        className={`filter-button ${activeFilter === 'settings' ? 'active' : ''}`}
        onClick={() => handleFilterClick('settings')}
        title="Settings"
        aria-label="Settings"
      >
        <i className="fas fa-cog"></i>
      </button>
    </div>
  );
};