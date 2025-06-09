// Stock Search and Add Functionality
class StockSearchManager {
    constructor() {
        this.searchCache = new Map();
        this.searchTimeout = null;
        this.isSearching = false;
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const modal = document.getElementById('add-stock-modal');
        const searchInput = document.getElementById('stock-search-input');
        const searchBtn = document.getElementById('search-stock-btn');
        const closeBtn = modal.querySelector('.close-modal');
        
        // Add stock button opens modal
        document.getElementById('add-stock-btn')?.addEventListener('click', () => {
            this.showAddStockModal();
        });
        
        // Close modal events
        closeBtn?.addEventListener('click', () => {
            this.hideModal();
        });
        
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideModal();
            }
        });
        
        // Search input events
        searchInput?.addEventListener('input', (e) => {
            this.handleSearchInput(e.target.value);
        });
        
        searchInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.performSearch(e.target.value.trim());
            }
        });
        
        // Search button
        searchBtn?.addEventListener('click', () => {
            this.performSearch(searchInput.value.trim());
        });
    }

    showAddStockModal() {
        const modal = document.getElementById('add-stock-modal');
        const modalHeader = modal.querySelector('.modal-header h3');
        const searchInput = modal.querySelector('#stock-search-input');
        const resultsContainer = modal.querySelector('#search-results');
        
        // Reset modal state
        modalHeader.textContent = 'Add Stock to Watchlist';
        searchInput.placeholder = 'Search by symbol or name...';
        searchInput.value = '';
        resultsContainer.innerHTML = '';
        
        // Show popular stocks as suggestions
        this.showPopularStocks();
        
        modal.style.display = 'block';
        searchInput.focus();
    }

    hideModal() {
        const modal = document.getElementById('add-stock-modal');
        modal.style.display = 'none';
    }

    handleSearchInput(query) {
        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // Debounce search
        this.searchTimeout = setTimeout(() => {
            if (query.length >= 1) {
                this.performSearch(query);
            } else {
                this.showPopularStocks();
            }
        }, 300);
    }

    async performSearch(query) {
        if (!query || this.isSearching) return;
        
        const resultsContainer = document.getElementById('search-results');
        const searchBtn = document.getElementById('search-stock-btn');
        
        this.isSearching = true;
        searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        resultsContainer.innerHTML = '<div class="search-loading">Searching...</div>';
        
        try {
            // Check cache first
            const cacheKey = query.toLowerCase();
            if (this.searchCache.has(cacheKey)) {
                this.displaySearchResults(this.searchCache.get(cacheKey), query);
                return;
            }
            
            // Perform search via API
            const results = await this.searchStocks(query);
            
            // Cache results
            this.searchCache.set(cacheKey, results);
            
            // Display results
            this.displaySearchResults(results, query);
            
        } catch (error) {
            console.error('Search error:', error);
            resultsContainer.innerHTML = `
                <div class="search-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div>Search failed. Please try again.</div>
                </div>
            `;
        } finally {
            this.isSearching = false;
            searchBtn.innerHTML = '<i class="fas fa-search"></i>';
        }
    }

    async searchStocks(query) {
        try {
            // Try using the API endpoint if available
            if (window.equityAPI) {
                return await window.equityAPI.searchStocks(query);
            }
        } catch (error) {
            console.log('API search not available, using fallback');
        }
        
        // Fallback: validate as direct symbol lookup
        return await this.validateSymbol(query);
    }

    async validateSymbol(symbol) {
        try {
            const upperSymbol = symbol.toUpperCase();
            
            // Try to get quote for the symbol
            const quote = await window.equityAPI.getQuote(upperSymbol);
            
            // If successful, return as a result
            return [{
                symbol: upperSymbol,
                displaySymbol: upperSymbol,
                description: upperSymbol,
                type: 'Stock'
            }];
        } catch (error) {
            throw new Error(`Symbol "${symbol}" not found`);
        }
    }

    displaySearchResults(results, query) {
        const resultsContainer = document.getElementById('search-results');
        
        if (!results || results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="search-no-results">
                    <i class="fas fa-search"></i>
                    <div>No results found for "${query}"</div>
                    <div class="search-hint">Try searching for a stock symbol like "AAPL" or "MSFT"</div>
                </div>
            `;
            return;
        }
        
        resultsContainer.innerHTML = '';
        
        // Limit results to prevent overwhelming UI
        const limitedResults = results.slice(0, 10);
        
        limitedResults.forEach(result => {
            const resultItem = this.createSearchResultItem(result);
            resultsContainer.appendChild(resultItem);
        });
    }

    createSearchResultItem(result) {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        
        const symbol = result.symbol || result.displaySymbol || '';
        const description = result.description || result.name || symbol;
        const type = result.type || 'Stock';
        
        // Check if already in watchlist
        const isInWatchlist = window.watchlistManager?.getWatchlist().includes(symbol);
        
        item.innerHTML = `
            <div class="result-info">
                <div class="result-symbol">${symbol}</div>
                <div class="result-description">${description}</div>
                <div class="result-type">${type}</div>
            </div>
            <div class="result-actions">
                ${isInWatchlist ? 
                    '<span class="result-added"><i class="fas fa-check"></i> Added</span>' :
                    '<button class="add-to-watchlist-btn"><i class="fas fa-plus"></i> Add</button>'
                }
            </div>
        `;
        
        // Add click event to add button
        if (!isInWatchlist) {
            const addBtn = item.querySelector('.add-to-watchlist-btn');
            addBtn.addEventListener('click', () => {
                this.addSymbolToWatchlist(symbol, description);
            });
        }
        
        return item;
    }

    async addSymbolToWatchlist(symbol, name = '') {
        try {
            await window.watchlistManager.addSymbol(symbol, name);
            
            // Update the UI to show it's added
            const modal = document.querySelector('#add-stock-modal');
            const resultItems = modal.querySelectorAll('.search-result-item');
            
            resultItems.forEach(item => {
                const symbolEl = item.querySelector('.result-symbol');
                if (symbolEl && symbolEl.textContent === symbol) {
                    const actionsEl = item.querySelector('.result-actions');
                    actionsEl.innerHTML = '<span class="result-added"><i class="fas fa-check"></i> Added</span>';
                }
            });
            
            // Show success message
            this.showToast(`${symbol} added to watchlist`, 'success');
            
            // Auto-close modal after a short delay
            setTimeout(() => {
                this.hideModal();
            }, 1000);
            
        } catch (error) {
            console.error('Error adding symbol:', error);
            this.showToast(error.message, 'error');
        }
    }

    showPopularStocks() {
        const popularStocks = [
            { symbol: 'AAPL', description: 'Apple Inc.', type: 'Stock' },
            { symbol: 'MSFT', description: 'Microsoft Corporation', type: 'Stock' },
            { symbol: 'GOOGL', description: 'Alphabet Inc.', type: 'Stock' },
            { symbol: 'AMZN', description: 'Amazon.com Inc.', type: 'Stock' },
            { symbol: 'TSLA', description: 'Tesla Inc.', type: 'Stock' },
            { symbol: 'META', description: 'Meta Platforms Inc.', type: 'Stock' },
            { symbol: 'NVDA', description: 'NVIDIA Corporation', type: 'Stock' },
            { symbol: 'SPY', description: 'SPDR S&P 500 ETF Trust', type: 'ETF' },
            { symbol: 'QQQ', description: 'Invesco QQQ Trust', type: 'ETF' },
            { symbol: 'BTC-USD', description: 'Bitcoin USD', type: 'Cryptocurrency' }
        ];
        
        const resultsContainer = document.getElementById('search-results');
        resultsContainer.innerHTML = '<div class="search-section-header">Popular Stocks</div>';
        
        popularStocks.forEach(stock => {
            const item = this.createSearchResultItem(stock);
            resultsContainer.appendChild(item);
        });
    }

    showToast(message, type = 'info') {
        // Create or get toast container
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Hide toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.parentElement.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// Global stock search manager instance
window.stockSearchManager = new StockSearchManager();

console.log('Stock search manager loaded successfully');