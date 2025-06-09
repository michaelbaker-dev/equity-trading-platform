// Add stock modal component
// Provides search functionality to add stocks to watchlist

import React, { useState, useCallback } from 'react';
import { useStockSearch } from '../../hooks/useStockData';
import { useUIStore } from '../../stores/uiStore';
import { useWatchlistStore } from '../../stores/watchlistStore';
import { debounce } from '../../utils/debounce';

export const AddStockModal: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  const { closeModal } = useUIStore();
  const { addSymbol } = useWatchlistStore();
  
  // Use real Finnhub stock search API
  const { data: searchResults, isLoading, error } = useStockSearch(
    debouncedQuery, 
    debouncedQuery.length >= 2
  );

  // Debounce search query to avoid too many API calls
  const debouncedSetQuery = useCallback(
    debounce((query: string) => {
      setDebouncedQuery(query);
    }, 300),
    []
  );

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    setSearchQuery(query);
    debouncedSetQuery(query);
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (searchQuery.trim()) {
      setDebouncedQuery(searchQuery.trim());
    }
  };

  const handleAddStock = (symbol: string) => {
    addSymbol(symbol);
    console.log(`➕ Added ${symbol} to watchlist from search`);
    
    // Close modal after adding
    closeModal('addStock');
  };

  const handleCloseModal = () => {
    closeModal('addStock');
  };

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      handleCloseModal();
    }
  };

  return (
    <div className="modal" onClick={handleBackdropClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>Add Stock to Watchlist</h3>
          <span 
            className="close-modal"
            onClick={handleCloseModal}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleCloseModal();
              }
            }}
            aria-label="Close modal"
          >
            &times;
          </span>
        </div>
        
        <div className="modal-body">
          <form onSubmit={handleSearchSubmit} className="search-container">
            <input
              type="text"
              id="stock-search-input"
              placeholder="Search by symbol or name..."
              value={searchQuery}
              onChange={handleSearchChange}
              autoFocus
            />
            <button type="submit" id="search-stock-btn">
              <i className="fas fa-search"></i>
            </button>
          </form>
          
          <div className="search-results">
            {isLoading && (
              <div className="search-loading">
                <div className="loading-spinner"></div>
                <div className="loading-text">Searching...</div>
              </div>
            )}
            
            {error && (
              <div className="search-error">
                <i className="fas fa-exclamation-triangle"></i>
                <div className="search-error-message">Search failed</div>
                <div className="error-details">
                  Please try again or check your connection
                </div>
              </div>
            )}
            
            {searchResults && Array.isArray(searchResults) && searchResults.length === 0 && debouncedQuery.length >= 2 && (
              <div className="search-no-results">
                <i className="fas fa-search"></i>
                <div>No results found for "{debouncedQuery}"</div>
                <div className="search-hint">
                  Try searching by stock symbol (e.g., AAPL) or company name
                </div>
              </div>
            )}
            
            {searchResults && Array.isArray(searchResults) && searchResults.length > 0 && (
              <>
                <div className="search-section-header">
                  Search Results ({searchResults.length})
                </div>
                {searchResults.map((result: any) => (
                  <div
                    key={result.symbol}
                    className="search-result-item"
                    onClick={() => handleAddStock(result.symbol)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleAddStock(result.symbol);
                      }
                    }}
                  >
                    <div className="result-info">
                      <div className="result-symbol">{result.symbol}</div>
                      <div className="result-description">{result.description}</div>
                      <div className="result-type">{result.type}</div>
                    </div>
                    <div className="result-actions">
                      <button 
                        className="add-to-watchlist-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddStock(result.symbol);
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
            
            {debouncedQuery.length > 0 && debouncedQuery.length < 2 && (
              <div className="search-hint">
                Type at least 2 characters to search
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};