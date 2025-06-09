// Watchlist Management System
class WatchlistManager {
    constructor() {
        this.watchlist = [];
        this.storageKey = 'equity-watchlist';
        this.selectedSymbolKey = 'equity-selected-symbol';
        this.defaultSymbols = ['MSFT', 'AAPL', 'NVDA', 'GOOGL', 'AMZN'];
        this.maxWatchlistSize = 50;
        
        // Load watchlist from storage
        this.loadWatchlist();
        
        // Load selected symbol from storage
        this.loadSelectedSymbol();
        
        // Initialize event listeners
        this.initializeEventListeners();
    }

    // Load watchlist from localStorage
    loadWatchlist() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Validate that it's an array
                if (Array.isArray(parsed) && parsed.length > 0) {
                    this.watchlist = parsed;
                    console.log('Loaded watchlist from storage:', this.watchlist);
                    return;
                }
            }
            
            // Use default symbols for first-time users or invalid storage
            this.watchlist = [...this.defaultSymbols];
            this.saveWatchlist();
            console.log('Initialized default watchlist:', this.watchlist);
        } catch (error) {
            console.error('Error loading watchlist:', error);
            this.watchlist = [...this.defaultSymbols];
            this.saveWatchlist();
        }
    }

    // Load selected symbol from localStorage
    loadSelectedSymbol() {
        try {
            const stored = localStorage.getItem(this.selectedSymbolKey);
            if (stored && this.watchlist.includes(stored)) {
                window.currentlySelectedSymbol = stored;
                console.log('Restored selected symbol:', stored);
            } else if (this.watchlist.length > 0) {
                window.currentlySelectedSymbol = this.watchlist[0];
                this.saveSelectedSymbol();
            }
        } catch (error) {
            console.error('Error loading selected symbol:', error);
            if (this.watchlist.length > 0) {
                window.currentlySelectedSymbol = this.watchlist[0];
            }
        }
    }

    // Save selected symbol to localStorage
    saveSelectedSymbol() {
        try {
            localStorage.setItem(this.selectedSymbolKey, window.currentlySelectedSymbol);
        } catch (error) {
            console.error('Error saving selected symbol:', error);
        }
    }

    // Save watchlist to localStorage
    saveWatchlist() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.watchlist));
            console.log('Saved watchlist to storage:', this.watchlist);
        } catch (error) {
            console.error('Error saving watchlist:', error);
        }
    }

    // Add symbol to watchlist
    addSymbol(symbol, name = '') {
        const upperSymbol = symbol.toUpperCase();
        
        // Validate symbol
        if (!upperSymbol || upperSymbol.length > 10) {
            throw new Error('Invalid symbol format');
        }
        
        // Check if already exists
        if (this.watchlist.includes(upperSymbol)) {
            throw new Error('Symbol already in watchlist');
        }
        
        // Check size limit
        if (this.watchlist.length >= this.maxWatchlistSize) {
            throw new Error(`Watchlist limit of ${this.maxWatchlistSize} symbols reached`);
        }
        
        // Add to watchlist
        this.watchlist.push(upperSymbol);
        this.saveWatchlist();
        
        // Re-render watchlist
        this.renderWatchlist();
        
        // Subscribe to real-time updates
        if (window.equityAPI) {
            window.equityAPI.subscribeToSymbol(upperSymbol);
        }
        
        console.log(`Added ${upperSymbol} to watchlist`);
        return true;
    }

    // Remove symbol from watchlist
    removeSymbol(symbol) {
        const upperSymbol = symbol.toUpperCase();
        const index = this.watchlist.indexOf(upperSymbol);
        
        if (index === -1) {
            throw new Error('Symbol not found in watchlist');
        }
        
        // Remove from watchlist
        this.watchlist.splice(index, 1);
        this.saveWatchlist();
        
        // Re-render watchlist
        this.renderWatchlist();
        
        // Unsubscribe from real-time updates
        if (window.equityAPI) {
            window.equityAPI.unsubscribeFromSymbol(upperSymbol);
        }
        
        // If removed symbol was selected, select the first available
        if (window.currentlySelectedSymbol === upperSymbol && this.watchlist.length > 0) {
            window.currentlySelectedSymbol = this.watchlist[0];
            updateStockDetailPanel(this.watchlist[0]);
            updateOrderBook(this.watchlist[0]);
        }
        
        console.log(`Removed ${upperSymbol} from watchlist`);
        return true;
    }

    // Clear all symbols
    clearAll() {
        const confirmed = confirm('Are you sure you want to remove all symbols from your watchlist?');
        if (!confirmed) return false;
        
        // Unsubscribe from all symbols
        if (window.equityAPI) {
            this.watchlist.forEach(symbol => {
                window.equityAPI.unsubscribeFromSymbol(symbol);
            });
        }
        
        this.watchlist = [];
        this.saveWatchlist();
        this.renderWatchlist();
        
        console.log('Cleared all watchlist symbols');
        return true;
    }

    // Sort watchlist alphabetically
    sortAlphabetically() {
        this.watchlist.sort();
        this.saveWatchlist();
        this.renderWatchlist();
        console.log('Sorted watchlist alphabetically');
    }

    // Get current watchlist
    getWatchlist() {
        return [...this.watchlist];
    }

    // Render the watchlist in the DOM
    async renderWatchlist() {
        const container = document.getElementById('watchlist');
        if (!container) return;
        
        // Store current scroll position
        const scrollTop = container.scrollTop;
        
        // Show empty state if no symbols
        if (this.watchlist.length === 0) {
            container.innerHTML = `
                <div class="empty-watchlist">
                    <div class="empty-icon"><i class="fas fa-chart-line"></i></div>
                    <div class="empty-text">Your watchlist is empty</div>
                    <div class="empty-subtext">Click the + button to add stocks</div>
                </div>
            `;
            return;
        }
        
        // Check if we need to actually re-render or just update prices
        const existingItems = container.querySelectorAll('.watchlist-item');
        const currentSymbols = Array.from(existingItems).map(item => 
            item.querySelector('.stock-symbol')?.textContent
        );
        
        // If symbols haven't changed, just update prices without full re-render
        if (JSON.stringify(currentSymbols) === JSON.stringify(this.watchlist)) {
            await this.fetchFreshDataForAll();
            return;
        }
        
        // Full re-render needed
        container.innerHTML = '';
        
        // Fetch quotes for all symbols
        try {
            const quotes = await window.equityAPI.getBatchQuotes(this.watchlist);
            
            // Render each watchlist item
            this.watchlist.forEach((symbol) => {
                const quote = quotes[symbol];
                const isActive = symbol === window.currentlySelectedSymbol;
                const item = this.createWatchlistItem(symbol, quote, isActive);
                container.appendChild(item);
            });
            
            // Restore scroll position
            container.scrollTop = scrollTop;
            
            console.log('Rendered watchlist with', this.watchlist.length, 'symbols');
            
        } catch (error) {
            console.error('Error fetching quotes for watchlist:', error);
            
            // Render items without price data
            this.watchlist.forEach((symbol) => {
                const isActive = symbol === window.currentlySelectedSymbol;
                const item = this.createWatchlistItem(symbol, null, isActive);
                container.appendChild(item);
            });
            
            // Restore scroll position
            container.scrollTop = scrollTop;
        }
    }

    // Note: updateExistingPrices method replaced with fetchFreshDataForAll for better functionality

    // Update individual watchlist item price without full re-render
    updateWatchlistItemPrice(symbol, quote) {
        const items = document.querySelectorAll('.watchlist-item');
        items.forEach(item => {
            const itemSymbol = item.querySelector('.stock-symbol')?.textContent;
            if (itemSymbol === symbol) {
                const priceElement = item.querySelector('.price-value');
                const changeElement = item.querySelector('.price-change');
                
                if (priceElement) {
                    const newPrice = quote.c.toFixed(3);
                    const oldPrice = priceElement.textContent;
                    
                    if (oldPrice !== newPrice) {
                        priceElement.textContent = newPrice;
                        flashPriceElement(priceElement, quote.d >= 0);
                    }
                }
                
                if (changeElement) {
                    const changePercent = quote.dp || 0;
                    const newChangeText = (changePercent >= 0 ? '+' : '') + changePercent.toFixed(2) + '%';
                    const oldChangeText = changeElement.textContent;
                    
                    if (oldChangeText !== newChangeText) {
                        changeElement.textContent = newChangeText;
                        changeElement.className = `price-change ${changePercent >= 0 ? 'positive' : 'negative'}`;
                        flashPriceElement(changeElement, changePercent >= 0);
                    }
                }
            }
        });
    }

    // Create a watchlist item element
    createWatchlistItem(symbol, quote, isActive = false) {
        const item = document.createElement('div');
        item.className = `watchlist-item ${isActive ? 'active' : ''}`;
        item.dataset.symbol = symbol;
        
        const price = quote ? quote.c.toFixed(3) : '---';
        const change = quote ? quote.dp : 0;
        const changeText = quote ? (change >= 0 ? '+' : '') + change.toFixed(2) + '%' : '---';
        const changeClass = quote ? (change >= 0 ? 'positive' : 'negative') : '';
        
        item.innerHTML = `
            <div class="stock-info">
                <div class="stock-symbol">${symbol}</div>
                <div class="stock-name">Loading...</div>
            </div>
            <div class="stock-price">
                <div class="price-chart mini-chart">
                    <svg class="mini-chart-svg" viewBox="0 0 60 30" preserveAspectRatio="none">
                        <path class="mini-chart-path" d="M0,15 L10,18 L20,10 L30,20 L40,15 L50,5 L60,10" 
                              stroke="${change >= 0 ? '#28a745' : '#dc3545'}" stroke-width="1.5" fill="none"></path>
                    </svg>
                </div>
                <div class="price-value">${price}</div>
                <div class="price-change ${changeClass}">${changeText}</div>
            </div>
            <button class="remove-stock-btn" title="Remove ${symbol}">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add click event for selection
        item.addEventListener('click', async (e) => {
            if (!e.target.closest('.remove-stock-btn')) {
                await this.selectSymbol(symbol, item);
            }
        });
        
        // Add remove button event
        const removeBtn = item.querySelector('.remove-stock-btn');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeSymbol(symbol);
        });
        
        // Fetch company name asynchronously
        this.fetchCompanyName(symbol, item);
        
        return item;
    }

    // Fetch company name for a symbol
    async fetchCompanyName(symbol, itemElement) {
        try {
            const profile = await window.equityAPI.getProfile(symbol);
            const nameElement = itemElement.querySelector('.stock-name');
            if (nameElement && profile.name) {
                nameElement.textContent = profile.name.length > 20 ? 
                    profile.name.substring(0, 17) + '...' : profile.name;
            }
        } catch (error) {
            console.error(`Error fetching profile for ${symbol}:`, error);
            const nameElement = itemElement.querySelector('.stock-name');
            if (nameElement) {
                nameElement.textContent = symbol;
            }
        }
    }

    // Select a symbol and update UI
    async selectSymbol(symbol, itemElement) {
        // Update currently selected symbol
        window.currentlySelectedSymbol = symbol;
        
        // Save selection to localStorage
        this.saveSelectedSymbol();
        
        // Update UI to show selection
        document.querySelectorAll('.watchlist-item').forEach(item => {
            item.classList.remove('active');
        });
        itemElement.classList.add('active');
        
        console.log('Selected symbol:', symbol);
        
        // Add loading indicator to the selected item
        const priceElement = itemElement.querySelector('.price-value');
        const originalPrice = priceElement?.textContent;
        if (priceElement) {
            priceElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }
        
        try {
            // Immediately fetch fresh data for the selected symbol
            await this.fetchFreshDataForSymbol(symbol);
            
            // Update detail panels with fresh data
            await updateStockDetailPanel(symbol);
            await updateOrderBook(symbol);
            
            // Update professional chart if it exists
            if (window.professionalChart) {
                await window.professionalChart.updateChart(symbol);
            }
            
        } catch (error) {
            console.error(`Error loading data for ${symbol}:`, error);
            
            // Restore original price if fetch failed
            if (priceElement && originalPrice) {
                priceElement.textContent = originalPrice;
            }
        }
    }

    // Fetch fresh data for a specific symbol
    async fetchFreshDataForSymbol(symbol) {
        try {
            console.log(`Fetching fresh data for ${symbol}...`);
            
            // Fetch latest quote
            const quote = await window.equityAPI.getQuote(symbol);
            
            // Update the watchlist item immediately with fresh data
            this.updateWatchlistItemPrice(symbol, quote);
            
            // Also update the main price display if this is the selected symbol
            if (symbol === window.currentlySelectedSymbol) {
                const formattedPrice = quote.c.toFixed(3);
                updateMainPriceDisplay(formattedPrice, quote.d, quote.dp);
                
                // Update professional chart if it exists
                if (window.professionalChart) {
                    window.professionalChart.updateLivePriceData(symbol, quote);
                }
            }
            
            console.log(`Updated ${symbol} with fresh data:`, quote);
            return quote;
            
        } catch (error) {
            console.error(`Error fetching fresh data for ${symbol}:`, error);
            throw error;
        }
    }

    // Fetch fresh data for all watchlist symbols
    async fetchFreshDataForAll() {
        try {
            console.log('Fetching fresh data for all watchlist symbols...');
            
            // Use batch quote API for better performance
            const quotes = await window.equityAPI.getBatchQuotes(this.watchlist);
            
            // Update all watchlist items with fresh data
            Object.keys(quotes).forEach(symbol => {
                this.updateWatchlistItemPrice(symbol, quotes[symbol]);
            });
            
            // Update main price display if current symbol was updated
            if (quotes[window.currentlySelectedSymbol]) {
                const quote = quotes[window.currentlySelectedSymbol];
                const formattedPrice = quote.c.toFixed(3);
                updateMainPriceDisplay(formattedPrice, quote.d, quote.dp);
                
                // Update professional chart if it exists
                if (window.professionalChart) {
                    window.professionalChart.updateLivePriceData(window.currentlySelectedSymbol, quote);
                }
            }
            
            console.log('Updated all watchlist symbols with fresh data');
            return quotes;
            
        } catch (error) {
            console.error('Error fetching fresh data for all symbols:', error);
            throw error;
        }
    }

    // Initialize event listeners for management buttons
    initializeEventListeners() {
        // Clear all button
        document.getElementById('clear-watchlist-btn')?.addEventListener('click', () => {
            this.clearAll();
        });
        
        // Sort button
        document.getElementById('sort-watchlist-btn')?.addEventListener('click', () => {
            this.sortAlphabetically();
        });
        
        // Search within watchlist
        document.getElementById('search-watchlist-btn')?.addEventListener('click', () => {
            this.showSearchModal();
        });
        
        // Manage button (future: bulk operations, import/export)
        document.getElementById('manage-watchlist-btn')?.addEventListener('click', () => {
            this.showManageModal();
        });
    }

    // Show search modal for filtering watchlist
    showSearchModal() {
        const modal = document.getElementById('add-stock-modal');
        const modalHeader = modal.querySelector('.modal-header h3');
        const searchInput = modal.querySelector('#stock-search-input');
        
        modalHeader.textContent = 'Search Watchlist';
        searchInput.placeholder = 'Type to filter your watchlist...';
        searchInput.value = '';
        
        modal.style.display = 'block';
        searchInput.focus();
        
        // TODO: Implement watchlist filtering
    }

    // Show manage modal for bulk operations
    showManageModal() {
        alert('Manage features (import/export, bulk operations) coming soon!');
    }
}

// Global watchlist manager instance
window.watchlistManager = new WatchlistManager();

console.log('Watchlist manager loaded successfully');