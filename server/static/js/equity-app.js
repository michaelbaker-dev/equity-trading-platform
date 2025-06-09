// Updated Equity Trading Platform - Now uses Go server backend
console.log('Loading Equity Trading Platform...');

// Watchlist symbols are now managed by the WatchlistManager
let WATCHLIST_SYMBOLS = [];

// Currently selected symbol
let currentlySelectedSymbol = 'MSFT';

// Current time period for chart
let currentTimePeriod = '1W';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    
    // Get watchlist symbols from the watchlist manager
    WATCHLIST_SYMBOLS = window.watchlistManager.getWatchlist();
    console.log('Loaded watchlist symbols:', WATCHLIST_SYMBOLS);
    
    // Set the first symbol as the currently selected one if available
    if (WATCHLIST_SYMBOLS.length > 0) {
        currentlySelectedSymbol = WATCHLIST_SYMBOLS[0];
    }
    
    // Set initial panel widths
    setEqualPanelWidths();
    
    // Initialize resizable panels
    initResizablePanels();
    
    // Initialize modal functionality (for other modals, not watchlist)
    initModal();
    
    // Add event listeners
    setupEventListeners();
    
    // Initialize the application in stages
    setTimeout(() => {
        initializeApp();
    }, 100);
});

async function initializeApp() {
    try {
        // Test server connectivity first
        console.log('🔗 Testing server connectivity before app initialization...');
        try {
            const testResponse = await fetch('/api/v1/stocks/quote/AAPL');
            if (testResponse.ok) {
                console.log('✅ Server is running and accessible!');
            } else {
                console.warn('⚠️  Server responded but with error status:', testResponse.status);
            }
        } catch (serverError) {
            console.error('❌ Server appears to be offline or unreachable:', serverError);
            console.log('');
            console.log('🚀 TO START THE SERVER:');
            console.log('   Option 1 (Docker): ./run.sh');
            console.log('   Option 2 (Direct): cd /Users/michaelbaker/Cline/Equity/server && go run cmd/main.go');
            console.log('   Option 3 (Quick):  ./quick-start.sh');
            console.log('');
            console.log('💰 IMPORTANT: You need a Finnhub API key!');
            console.log('   1. Get free API key from: https://finnhub.io/register');
            console.log('   2. Set environment variable: export FINNHUB_API_KEY=your_key_here');
            console.log('   3. Then start the server');
            console.log('');
        }
        
        // Initialize professional chart
        window.professionalChart = new ProfessionalChart('professional-chart-container');
        
        // Connect to WebSocket for real-time updates
        await window.equityAPI.connectWebSocket();
        
        // Set up WebSocket message handlers
        window.equityAPI.onQuoteUpdate((message) => {
            console.log('Received quote update:', message);
            updatePriceDisplay(message.symbol, message.data);
            
            // Update professional chart if it exists and this is the selected symbol
            if (window.professionalChart && message.symbol === currentlySelectedSymbol) {
                window.professionalChart.updateLivePriceData(message.symbol, message.data);
            }
        });
        
        window.equityAPI.onWelcome((message) => {
            console.log('Connected to server:', message.data);
        });
        
        // Render the dynamic watchlist first
        await window.watchlistManager.renderWatchlist();
        
        // Load initial data
        await loadInitialData();
        
        // Initialize professional chart with selected symbol
        if (window.professionalChart && currentlySelectedSymbol) {
            await window.professionalChart.updateChart(currentlySelectedSymbol);
        }
        
        // Subscribe to watchlist symbols for real-time updates
        WATCHLIST_SYMBOLS = window.watchlistManager.getWatchlist();
        WATCHLIST_SYMBOLS.forEach(symbol => {
            window.equityAPI.subscribeToSymbol(symbol);
        });
        
        console.log('App initialization complete');
        
        // Set up smart periodic data refresh with adaptive frequency
        setupSmartPeriodicRefresh();
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        // Continue without WebSocket if connection fails
        await loadInitialData();
    }
}

async function loadInitialData() {
    try {
        // Fetch fresh data for the currently selected symbol
        if (window.watchlistManager && currentlySelectedSymbol) {
            await window.watchlistManager.fetchFreshDataForSymbol(currentlySelectedSymbol);
        }
        
        // Load data for the default selected stock
        await updateStockDetailPanel(currentlySelectedSymbol);
        
        // Load order book and header
        await updateOrderBook(currentlySelectedSymbol);
        
    } catch (error) {
        console.error('Error loading initial data:', error);
    }
}

// Note: loadWatchlistQuotes and updateWatchlistItem functions have been moved 
// to the WatchlistManager class to prevent duplicate updates and flashing

async function updateStockDetailPanel(symbol) {
    try {
        // Update stock title
        document.querySelector('.stock-title h2').textContent = symbol;
        
        // Fetch and update stock candles for the chart
        await fetchStockCandles(symbol);
        
        // Fetch company profile
        await fetchCompanyProfile(symbol);
        
        // Update the currently selected symbol
        currentlySelectedSymbol = symbol;
        
    } catch (error) {
        console.error('Error updating stock detail panel:', error);
    }
}

async function fetchStockCandles(symbol, period = currentTimePeriod) {
    try {
        // Calculate time range based on period
        const { resolution, from, to } = calculateTimeRange(period);
        
        // Update UI to show active time period
        updateTimePeriodUI(period);
        
        // Fetch candles from server
        const data = await window.equityAPI.getCandles(symbol, resolution, from, to);
        
        // Update current time period
        currentTimePeriod = period;
        
        // Update chart with data
        updateChartWithData(data);
        
    } catch (error) {
        console.error('Error fetching candles:', error);
        // Use mock data if API fails
        const mockData = generateMockCandleData(symbol, period);
        updateChartWithData(mockData);
    }
}

async function fetchCompanyProfile(symbol) {
    try {
        const profile = await window.equityAPI.getProfile(symbol);
        updateCompanyProfileUI(profile);
    } catch (error) {
        console.error('Error fetching company profile:', error);
    }
}

async function updateOrderBook(symbol) {
    try {
        console.log('Updating order book for:', symbol);
        
        // Fetch order book data
        const orderBook = await window.equityAPI.getOrderBook(symbol);
        console.log('Order book data:', orderBook);
        
        // Fetch current quote for header
        const quote = await window.equityAPI.getQuote(symbol);
        
        // Update order book header with current symbol and price
        updateOrderBookHeader(symbol, quote);
        
        // Update order book table
        updateOrderBookUI(orderBook.bids, orderBook.asks);
        
    } catch (error) {
        console.error('Error fetching order book:', error);
    }
}

// Update the order book header with current symbol and price data
function updateOrderBookHeader(symbol, quote) {
    // Update symbol
    const symbolElement = document.querySelector('.order-book-panel .stock-symbol');
    if (symbolElement) {
        symbolElement.textContent = symbol;
    }
    
    // Update price with caret direction
    const priceElement = document.querySelector('.order-book-panel .stock-price');
    if (priceElement && quote) {
        const price = quote.c.toFixed(3);
        const change = quote.d || 0;
        const caretIcon = change >= 0 ? 'fa-caret-up' : 'fa-caret-down';
        
        priceElement.innerHTML = `${price}<i class="fas ${caretIcon}"></i>`;
        
        // Flash the price element when it changes
        const oldPrice = priceElement.dataset.lastPrice;
        if (oldPrice && oldPrice !== price) {
            flashPriceElement(priceElement, change >= 0);
        }
        priceElement.dataset.lastPrice = price;
    }
    
    // Update change amount and percentage
    const changeElement = document.querySelector('.order-book-panel .stock-change');
    if (changeElement && quote) {
        const change = quote.d || 0;
        const changePercent = quote.dp || 0;
        const changeClass = change >= 0 ? 'positive' : 'negative';
        const changeSign = change >= 0 ? '+' : '';
        const percentSign = changePercent >= 0 ? '+' : '';
        
        changeElement.textContent = `${changeSign}${change.toFixed(3)} ${percentSign}${changePercent.toFixed(2)}%`;
        changeElement.className = `stock-change ${changeClass}`;
        
        // Flash the change element
        const oldChange = changeElement.dataset.lastChange;
        const newChangeText = changeElement.textContent;
        if (oldChange && oldChange !== newChangeText) {
            flashPriceElement(changeElement, change >= 0);
        }
        changeElement.dataset.lastChange = newChangeText;
    }
    
    console.log(`Updated order book header for ${symbol}: ${quote?.c.toFixed(3)}`);
}

async function fetchCompanyNews(symbol) {
    try {
        const today = new Date();
        const fromDate = new Date(today);
        fromDate.setDate(fromDate.getDate() - 7);
        
        const toDateStr = today.toISOString().split('T')[0];
        const fromDateStr = fromDate.toISOString().split('T')[0];
        
        const news = await window.equityAPI.getNews(symbol, fromDateStr, toDateStr);
        displayCompanyNews(news);
    } catch (error) {
        console.error('Error fetching company news:', error);
        displayCompanyNews([]);
    }
}

function calculateTimeRange(period) {
    const to = Math.floor(Date.now() / 1000);
    let resolution, from;
    
    switch(period) {
        case '1D':
            resolution = '5';
            from = to - 60 * 60 * 24;
            break;
        case '1W':
            resolution = '60';
            from = to - 60 * 60 * 24 * 7;
            break;
        case '1M':
            resolution = 'D';
            from = to - 60 * 60 * 24 * 30;
            break;
        case '3M':
            resolution = 'D';
            from = to - 60 * 60 * 24 * 90;
            break;
        case '1Y':
            resolution = 'W';
            from = to - 60 * 60 * 24 * 365;
            break;
        case '5Y':
            resolution = 'M';
            from = to - 60 * 60 * 24 * 365 * 5;
            break;
        default:
            resolution = 'D';
            from = to - 60 * 60 * 24 * 30;
    }
    
    return { resolution, from, to };
}

function setupEventListeners() {
    // Navigation item click handling
    document.addEventListener('click', function(e) {
        const navItem = e.target.closest('.nav-item, .action-button');
        if (!navItem) return;
        
        const parent = navItem.parentElement;
        if (!parent.classList.contains('chart-navigation') && 
            !parent.classList.contains('order-book-navigation') &&
            !parent.classList.contains('action-button')) {
            return;
        }
        
        // Remove active class from siblings
        parent.querySelectorAll('.nav-item, .action-button').forEach(i => {
            i.classList.remove('active');
        });
        
        // Add active class to clicked item
        navItem.classList.add('active');
        
        // Handle tab content visibility
        handleTabChange(navItem.textContent.trim(), parent);
    });
    
    // Time period selector
    document.querySelector('.chart-time-selector')?.addEventListener('click', function(e) {
        if (e.target.classList.contains('time-option')) {
            const period = e.target.getAttribute('data-period');
            fetchStockCandles(currentlySelectedSymbol, period);
        }
    });
}

function handleTabChange(tabText, parent) {
    if (parent.classList.contains('chart-navigation') || parent.classList.contains('order-book-navigation')) {
        const chartContainer = document.querySelector('.stock-chart-container');
        const newsContainer = document.querySelector('.news-container');
        
        // Hide all containers
        chartContainer.style.display = 'none';
        newsContainer.style.display = 'none';
        
        // Show appropriate container
        if (tabText === 'Chart') {
            chartContainer.style.display = 'block';
        } else if (tabText === 'News') {
            newsContainer.style.display = 'block';
            fetchCompanyNews(currentlySelectedSymbol);
        }
    }
}

// Price flashing utility function
function flashPriceElement(element, isPositive) {
    // Remove any existing flash classes
    element.classList.remove('price-flash-up', 'price-flash-down', 'price-flash');
    
    // Add appropriate flash class based on price direction
    const flashClass = isPositive ? 'price-flash-up' : 'price-flash-down';
    element.classList.add(flashClass);
    
    // Remove flash class after animation
    setTimeout(() => {
        element.classList.remove(flashClass);
    }, 800);
}

// Enhanced price update function with better change detection
function updatePriceDisplay(symbol, priceData) {
    const price = priceData.c || priceData.price || priceData;
    const change = priceData.d || 0;
    const changePercent = priceData.dp || 0;
    const formattedPrice = parseFloat(price).toFixed(3);
    
    // Use WatchlistManager's optimized price update method for watchlist items
    if (window.watchlistManager) {
        window.watchlistManager.updateWatchlistItemPrice(symbol, priceData);
    }
    
    // Update main price display and order book header if this is the selected symbol
    if (symbol === currentlySelectedSymbol) {
        updateMainPriceDisplay(formattedPrice, change, changePercent);
        updateOrderBookHeader(symbol, priceData);
    }
}

// Update main price display in the detail panel
function updateMainPriceDisplay(formattedPrice, change, changePercent) {
    // Update current price in detail panel
    const currentPriceElements = document.querySelectorAll('.current-price, .stock-price-main, .price-main');
    currentPriceElements.forEach(priceElement => {
        if (priceElement) {
            const oldPrice = priceElement.textContent.replace(/[^\d.]/g, ''); // Extract just numbers
            const newPrice = formattedPrice.replace(/[^\d.]/g, '');
            
            if (oldPrice !== newPrice) {
                // Update the text content while preserving any formatting
                if (priceElement.childNodes.length > 0 && priceElement.childNodes[0].nodeType === 3) {
                    priceElement.childNodes[0].textContent = formattedPrice;
                } else {
                    priceElement.textContent = formattedPrice;
                }
                flashPriceElement(priceElement, change >= 0);
            }
        }
    });
    
    // Update change indicators in detail panel
    const changeElements = document.querySelectorAll('.price-change-main, .change-main, .stock-change');
    changeElements.forEach(changeElement => {
        if (changeElement) {
            const newChangeText = (changePercent >= 0 ? '+' : '') + changePercent.toFixed(2) + '%';
            const oldChangeText = changeElement.textContent;
            
            if (oldChangeText !== newChangeText) {
                changeElement.textContent = newChangeText;
                changeElement.className = changeElement.className.replace(/(positive|negative)/g, '') + (changePercent >= 0 ? ' positive' : ' negative');
                flashPriceElement(changeElement, changePercent >= 0);
            }
        }
    });
}

// Smart periodic refresh with adaptive frequency
let currentRefreshInterval = null;

function setupSmartPeriodicRefresh() {
    // Get initial frequency from the frequency manager
    const initialInterval = window.updateFrequencyManager ? 
        window.updateFrequencyManager.getCurrentInterval() : 10000;
    
    startPeriodicRefresh(initialInterval);
    
    // Listen for frequency changes
    window.addEventListener('frequencyChanged', (event) => {
        const newInterval = event.detail.interval;
        console.log(`Frequency changed to ${newInterval}ms`);
        startPeriodicRefresh(newInterval);
    });
    
    // Also provide a global function for manual frequency updates
    window.updateFrequencyChanged = (newInterval) => {
        startPeriodicRefresh(newInterval);
    };
}

function startPeriodicRefresh(interval) {
    // Clear existing interval
    if (currentRefreshInterval) {
        clearInterval(currentRefreshInterval);
    }
    
    // Start new interval
    currentRefreshInterval = setInterval(async () => {
        try {
            // Fetch fresh data for all watchlist symbols
            if (window.watchlistManager) {
                await window.watchlistManager.fetchFreshDataForAll();
            }
            // Update order book and header for current symbol
            await updateOrderBook(currentlySelectedSymbol);
        } catch (error) {
            console.error('Error during periodic refresh:', error);
        }
    }, interval);
    
    console.log(`Started periodic refresh with ${interval}ms interval`);
}

console.log('Equity app script loaded successfully');