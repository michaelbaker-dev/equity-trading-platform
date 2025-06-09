// Equity trading platform with Finnhub API integration
const FINNHUB_API_KEY = 'd0s5c1pr01qrmnclmaggd0s5c1pr01qrmnclmah0';

// Load watchlist from localStorage or use default if not available
let WATCHLIST_SYMBOLS = JSON.parse(localStorage.getItem('watchlist')) || 
    ['MSFT', 'AAPL', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'BAC', 'SPY', 'QQQ'];

// Store mini chart data for each symbol
const miniChartData = {};

// Variable to store the currently selected symbol
let currentlySelectedSymbol = 'MSFT';

// Track which symbols are currently subscribed in the WebSocket
let subscribedSymbols = new Set();

// WebSocket connection reference
let websocket = null;

// Variables to store refresh intervals
let orderBookRefreshInterval;
let intradayDataRefreshInterval;

// Performance monitoring
const PERFORMANCE_METRICS = {
    apiCalls: 0,
    cacheHits: 0,
    cacheMisses: 0,
    renderTime: []
};

// Enhanced cache for API responses with localStorage persistence
const apiCache = {
    profiles: {},
    quotes: {},
    candles: {},
    news: {},
    orderBooks: {}
};

// Cache expiration times (in milliseconds)
const CACHE_EXPIRATION = {
    profiles: 24 * 60 * 60 * 1000, // 24 hours
    quotes: 60 * 1000,             // 1 minute
    candles: 5 * 60 * 1000,        // 5 minutes
    news: 15 * 60 * 1000,          // 15 minutes
    orderBooks: 5 * 1000           // 5 seconds
};

// Initialize cache from localStorage if available
function initializeCache() {
    try {
        // Load cache from localStorage
        Object.keys(apiCache).forEach(cacheType => {
            const storedCache = localStorage.getItem(`equity_cache_${cacheType}`);
            if (storedCache) {
                const parsedCache = JSON.parse(storedCache);
                
                // Only restore valid cache entries
                Object.keys(parsedCache).forEach(key => {
                    if (parsedCache[key] && 
                        parsedCache[key].timestamp && 
                        Date.now() - parsedCache[key].timestamp < CACHE_EXPIRATION[cacheType]) {
                        apiCache[cacheType][key] = parsedCache[key];
                    }
                });
                
                console.log(`Restored ${Object.keys(apiCache[cacheType]).length} items from ${cacheType} cache`);
            }
        });
    } catch (e) {
        console.error('Error initializing cache from localStorage:', e);
        // Clear localStorage cache if there was an error
        clearCacheFromLocalStorage();
    }
}

// Save cache to localStorage
function saveCache(cacheType) {
    try {
        // Only save if we have items in the cache
        if (Object.keys(apiCache[cacheType]).length > 0) {
            localStorage.setItem(`equity_cache_${cacheType}`, JSON.stringify(apiCache[cacheType]));
        }
    } catch (e) {
        console.error(`Error saving ${cacheType} cache to localStorage:`, e);
    }
}

// Clear cache from localStorage
function clearCacheFromLocalStorage() {
    try {
        Object.keys(apiCache).forEach(cacheType => {
            localStorage.removeItem(`equity_cache_${cacheType}`);
        });
        console.log('Cache cleared from localStorage');
    } catch (e) {
        console.error('Error clearing cache from localStorage:', e);
    }
}

// Throttle function to limit how often a function can be called
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Debounce function to limit how often a function can be called
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Function to check if a cached item is still valid
function isCacheValid(cacheKey, cacheType) {
    const isValid = (
        apiCache[cacheType][cacheKey] &&
        Date.now() - apiCache[cacheType][cacheKey].timestamp < CACHE_EXPIRATION[cacheType]
    );
    
    // Track cache hits/misses for performance monitoring
    if (isValid) {
        PERFORMANCE_METRICS.cacheHits++;
    } else {
        PERFORMANCE_METRICS.cacheMisses++;
    }
    
    return isValid;
}

// Function to add an item to the cache
function addToCache(cacheKey, cacheType, data) {
    apiCache[cacheType][cacheKey] = {
        data: data,
        timestamp: Date.now()
    };
    
    // Save to localStorage (throttled to prevent excessive writes)
    throttledSaveCache(cacheType);
}

// Throttled version of saveCache to prevent excessive localStorage writes
const throttledSaveCache = throttle(saveCache, 5000); // Save at most every 5 seconds

// Function to clear expired cache entries
function cleanupCache() {
    const now = Date.now();
    
    Object.keys(apiCache).forEach(cacheType => {
        Object.keys(apiCache[cacheType]).forEach(key => {
            if (now - apiCache[cacheType][key].timestamp >= CACHE_EXPIRATION[cacheType]) {
                delete apiCache[cacheType][key];
            }
        });
    });
}

// Periodically clean up cache to prevent memory leaks
setInterval(cleanupCache, 60000); // Clean up every minute

// Flag to track if the page is fully loaded
let pageFullyLoaded = false;

// Performance optimization: Use requestIdleCallback for non-critical tasks
const scheduleIdleTask = (callback) => {
    if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(callback, { timeout: 2000 });
    } else {
        // Fallback for browsers that don't support requestIdleCallback
        setTimeout(callback, 1);
    }
};

// Initialize performance monitoring
function initPerformanceMonitoring() {
    // Monitor page load performance
    if (window.performance) {
        // Get navigation timing data
        const perfData = window.performance.timing;
        const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
        
        console.log(`Page load time: ${pageLoadTime}ms`);
        
        // Monitor memory usage if available
        if (window.performance.memory) {
            const memoryUsage = window.performance.memory;
            console.log(`Memory usage: ${Math.round(memoryUsage.usedJSHeapSize / (1024 * 1024))}MB / ${Math.round(memoryUsage.jsHeapSizeLimit / (1024 * 1024))}MB`);
        }
    }
    
    // Set up periodic performance logging
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            console.log(`Performance metrics - API calls: ${PERFORMANCE_METRICS.apiCalls}, Cache hits: ${PERFORMANCE_METRICS.cacheHits}, Cache misses: ${PERFORMANCE_METRICS.cacheMisses}`);
            
            // Calculate average render time
            if (PERFORMANCE_METRICS.renderTime.length > 0) {
                const avgRenderTime = PERFORMANCE_METRICS.renderTime.reduce((sum, time) => sum + time, 0) / PERFORMANCE_METRICS.renderTime.length;
                console.log(`Average chart render time: ${avgRenderTime.toFixed(2)}ms`);
            }
        }
    }, 60000); // Log every minute
}

// Handle page refresh and beforeunload events
window.addEventListener('beforeunload', function() {
    // Save cache to localStorage before page unloads
    Object.keys(apiCache).forEach(cacheType => {
        saveCache(cacheType);
    });
    
    // Close WebSocket connection gracefully
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.close();
    }
});

document.addEventListener('DOMContentLoaded', function() {
    console.time('Initial Page Load');
    
    // Initialize cache from localStorage first (improves perceived performance)
    initializeCache();
    
    // Set initial equal widths for all panels - this is critical for layout
    setEqualPanelWidths();
    
    // Initialize the watchlist UI first (critical for user experience)
    initWatchlist();
    
    // Initialize performance monitoring
    scheduleIdleTask(initPerformanceMonitoring);
    
    // Initialize modal functionality (can be deferred)
    scheduleIdleTask(initModal);
    
    // Add event listeners to navigation items - using event delegation for better performance
    document.addEventListener('click', function(e) {
        const navItem = e.target.closest('.nav-item, .action-button');
        if (!navItem) return;
        
        // Find the parent navigation container
        const parent = navItem.parentElement;
        if (!parent.classList.contains('chart-navigation') && 
            !parent.classList.contains('order-book-navigation') &&
            !parent.classList.contains('action-button')) {
            return;
        }
        
        // Performance optimization: Use DocumentFragment for batch DOM updates
        const fragment = document.createDocumentFragment();
        const siblings = parent.querySelectorAll('.nav-item, .action-button');
        
        // Remove active class from all siblings
        siblings.forEach(i => {
            i.classList.remove('active');
            fragment.appendChild(i.cloneNode(true));
        });
        
        // Add active class to clicked item
        navItem.classList.add('active');
        
        // Ensure navigation menus are always visible
        if (parent.classList.contains('chart-navigation') || parent.classList.contains('order-book-navigation')) {
            parent.style.display = 'flex';
        }
        
        // Handle tab content visibility in the middle and right panels
        if (parent.classList.contains('chart-navigation') || parent.classList.contains('order-book-navigation')) {
            const tabText = navItem.textContent.trim();
            const chartContainer = document.querySelector('.stock-chart-container');
            const newsContainer = document.querySelector('.news-container');
            const chartTimeSelector = document.querySelector('.chart-time-selector');
            const chartNavigation = document.querySelector('.chart-navigation');
            
            // Ensure the navigation menu is always visible
            if (chartNavigation) {
                chartNavigation.style.display = 'flex';
            }
            
            // First, ensure the chart time selector is always visible
            if (chartTimeSelector) {
                chartTimeSelector.style.display = 'flex';
            }
            
            // Hide all content containers but keep the navigation visible
            chartContainer.style.display = 'none';
            newsContainer.style.display = 'none';
            
            // Show the appropriate container based on the clicked tab
            if (tabText === 'Chart') {
                chartContainer.style.display = 'block';
                // Move the chart time selector back inside the chart container when in Chart view
                if (chartTimeSelector && !chartContainer.contains(chartTimeSelector)) {
                    chartContainer.appendChild(chartTimeSelector);
                }
            } else if (tabText === 'News') {
                newsContainer.style.display = 'block';
                // Hide the chart time selector when in News view
                if (chartTimeSelector) {
                    chartTimeSelector.style.display = 'none';
                }
                // Only fetch news if we don't have cached data
                if (!isCacheValid(currentlySelectedSymbol, 'news')) {
                    fetchCompanyNews(currentlySelectedSymbol);
                } else {
                    displayCompanyNews(apiCache.news[currentlySelectedSymbol].data);
                }
            }
            // Add more conditions for other tabs as needed
        }
    });
    
    // Add event listeners to time period selector - using event delegation for better performance
    document.querySelector('.chart-time-selector')?.addEventListener('click', function(e) {
        if (e.target.classList.contains('time-option')) {
            const period = e.target.getAttribute('data-period');
            fetchStockCandles(currentlySelectedSymbol, period);
        }
    });
    
    // Initialize the application in stages to improve initial load time
    
    // Stage 1: Initialize critical UI components
    initializeStage1();
    
    // Stage 2: Load data for the selected stock (delayed)
    setTimeout(initializeStage2, 300); // Increased delay for better initial rendering
    
    // Stage 3: Initialize real-time updates and secondary features (further delayed)
    setTimeout(() => {
        // Initialize resizable panels (non-critical UI feature)
        initResizablePanels();
        
        // Only initialize Stage 3 if the page is visible
        if (document.visibilityState === 'visible') {
            initializeStage3();
        } else {
            // If page is not visible, wait until it becomes visible
            const handleVisibilityChange = () => {
                if (document.visibilityState === 'visible' && !pageFullyLoaded) {
                    initializeStage3();
                    document.removeEventListener('visibilitychange', handleVisibilityChange);
                    pageFullyLoaded = true;
                }
            };
            document.addEventListener('visibilitychange', handleVisibilityChange);
        }
        
        console.timeEnd('Initial Page Load');
    }, 1000); // Increased delay for better initial performance
});

// Stage 1: Initialize critical UI components
function initializeStage1() {
    // Add main chart to stock detail panel
    addMainChart();
    
    // Initialize the watchlist UI without data
    addMiniCharts();
}

// Stage 2: Load data for the selected stock
function initializeStage2() {
    // Fetch initial stock data for MSFT (default selected stock)
    fetchStockCandles('MSFT');
    
    // Initialize order book for MSFT
    updateOrderBook('MSFT');
}

// Stage 3: Initialize real-time updates and secondary features
function initializeStage3() {
    // Fetch intraday data for watchlist items
    fetchIntradayDataForWatchlist();
    
    // Initialize real-time price updates
    initRealTimePrices();
    
    // Set up periodic refresh of order book data with increased interval
    resetOrderBookRefreshInterval();
}

// Function to reset the order book refresh interval
function resetOrderBookRefreshInterval() {
    // Clear any existing interval
    if (orderBookRefreshInterval) {
        clearInterval(orderBookRefreshInterval);
    }
    
    // Set a new interval to refresh the order book every 5 seconds (increased from 2)
    orderBookRefreshInterval = setInterval(() => {
        // Only update if the tab is visible to save resources
        if (document.visibilityState === 'visible') {
            updateOrderBook(currentlySelectedSymbol);
        }
    }, 5000); // 5000 ms = 5 seconds
}

// Add visibility change listener to pause heavy operations when tab is not visible
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
        // Pause heavy operations when tab is not visible
        if (orderBookRefreshInterval) {
            clearInterval(orderBookRefreshInterval);
        }
        if (intradayDataRefreshInterval) {
            clearInterval(intradayDataRefreshInterval);
        }
    } else {
        // Resume operations when tab becomes visible again
        resetOrderBookRefreshInterval();
        fetchIntradayDataForWatchlist();
    }
});

// WebSocket connection state
let wsReconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_BASE = 3000; // 3 seconds base delay

// Initialize WebSocket connection for real-time price updates
function initRealTimePrices() {
    // Only initialize WebSocket if the page is visible
    if (document.visibilityState !== 'visible') {
        console.log('Page not visible, delaying WebSocket connection');
        
        // Set up a one-time visibility change listener to initialize when visible
        const initWhenVisible = () => {
            if (document.visibilityState === 'visible') {
                document.removeEventListener('visibilitychange', initWhenVisible);
                initRealTimePrices();
            }
        };
        document.addEventListener('visibilitychange', initWhenVisible);
        return;
    }
    
    // Close existing connection if any
    if (websocket && websocket.readyState !== WebSocket.CLOSED) {
        websocket.close();
    }
    
    // Performance optimization: Create WebSocket connection with a timeout
    const connectWithTimeout = () => {
        // Create a timeout to abort connection attempt if it takes too long
        const connectionTimeout = setTimeout(() => {
            console.log('WebSocket connection timeout, using fallback data');
            if (websocket && websocket.readyState === WebSocket.CONNECTING) {
                websocket.close();
                // Use mock data instead
                useMockPriceUpdates();
            }
        }, 5000); // 5 second timeout
        
        try {
            websocket = new WebSocket('wss://ws.finnhub.io?token=' + FINNHUB_API_KEY);
            
            // Connection opened -> Subscribe to symbols
            websocket.addEventListener('open', function() {
                console.log('WebSocket connection established');
                clearTimeout(connectionTimeout);
                wsReconnectAttempts = 0; // Reset reconnect attempts on successful connection
                
                // Clear the set of subscribed symbols
                subscribedSymbols.clear();
                
                // Only subscribe to the currently selected symbol and a few others to reduce load
                // This is a significant optimization to reduce WebSocket traffic
                const prioritySymbols = [currentlySelectedSymbol];
                // Add a few more symbols from the watchlist (up to 3 total to reduce load)
                WATCHLIST_SYMBOLS.forEach(symbol => {
                    if (prioritySymbols.length < 3 && !prioritySymbols.includes(symbol)) {
                        prioritySymbols.push(symbol);
                    }
                });
                
                // Subscribe to priority symbols
                prioritySymbols.forEach(symbol => {
                    subscribeToSymbol(symbol);
                });
            });
            
            // Use a buffer to batch price updates instead of updating on every message
            let priceUpdateBuffer = {};
            let isProcessingBuffer = false;
            let lastProcessTime = 0;
            const THROTTLE_INTERVAL = 500; // Process at most every 500ms
            
            // Listen for messages
            websocket.addEventListener('message', function(event) {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === 'trade') {
                        // Only process trades for symbols we care about
                        data.data.forEach(trade => {
                            if (subscribedSymbols.has(trade.s)) {
                                // Add to buffer instead of updating immediately
                                priceUpdateBuffer[trade.s] = trade.p;
                                
                                // Schedule buffer processing if not already scheduled and throttle
                                const now = Date.now();
                                if (!isProcessingBuffer && now - lastProcessTime >= THROTTLE_INTERVAL) {
                                    isProcessingBuffer = true;
                                    lastProcessTime = now;
                                    // Use requestAnimationFrame for smoother UI updates
                                    requestAnimationFrame(processPriceUpdateBuffer);
                                }
                            }
                        });
                    }
                } catch (e) {
                    console.error('Error processing WebSocket message:', e);
                }
            });
            
            // Function to process the buffered price updates
            function processPriceUpdateBuffer() {
                // Performance optimization: Only update visible elements
                if (document.visibilityState === 'visible') {
                    // Update all prices in the buffer
                    Object.keys(priceUpdateBuffer).forEach(symbol => {
                        updatePriceDisplay(symbol, priceUpdateBuffer[symbol]);
                        
                        // Only update order book for currently selected symbol and less frequently
                        if (symbol === currentlySelectedSymbol && Math.random() < 0.1) { // 10% chance to update (reduced from 20%)
                            // Use a debounced version to prevent too frequent updates
                            debouncedUpdateOrderBook(symbol);
                        }
                    });
                }
                
                // Clear the buffer
                priceUpdateBuffer = {};
                isProcessingBuffer = false;
            }
            
            // Handle errors
            websocket.addEventListener('error', function(error) {
                console.error('WebSocket error:', error);
                clearTimeout(connectionTimeout);
                handleWebSocketFailure();
            });
            
            // Handle connection close
            websocket.addEventListener('close', function() {
                console.log('WebSocket connection closed');
                clearTimeout(connectionTimeout);
                handleWebSocketFailure();
            });
            
        } catch (e) {
            console.error('Error creating WebSocket:', e);
            clearTimeout(connectionTimeout);
            handleWebSocketFailure();
        }
    };
    
    // Start connection attempt
    connectWithTimeout();
    
    // Create a debounced version of updateOrderBook
    const debouncedUpdateOrderBook = debounce(updateOrderBook, 2000); // Increased debounce time
    
    // Set up a ping to keep the connection alive, but less frequently
    const pingInterval = setInterval(() => {
        if (document.visibilityState !== 'visible') {
            // Don't ping if page is not visible
            return;
        }
        
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            try {
                // Send a ping message to keep the connection alive
                websocket.send(JSON.stringify({'type': 'ping'}));
            } catch (e) {
                console.error('Error sending ping:', e);
                clearInterval(pingInterval);
                handleWebSocketFailure();
            }
        } else if (websocket && websocket.readyState !== WebSocket.CONNECTING) {
            // If not open or connecting, clear interval and try to reconnect
            clearInterval(pingInterval);
            handleWebSocketFailure();
        }
    }, 60000); // Every 60 seconds (increased from 45)
}

// Handle WebSocket connection failure with exponential backoff
function handleWebSocketFailure() {
    wsReconnectAttempts++;
    
    if (wsReconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
        // Exponential backoff for reconnection attempts
        const delay = RECONNECT_DELAY_BASE * Math.pow(2, wsReconnectAttempts - 1);
        console.log(`WebSocket reconnect attempt ${wsReconnectAttempts} in ${delay}ms`);
        
        setTimeout(() => {
            // Only attempt to reconnect if the page is visible
            if (document.visibilityState === 'visible') {
                initRealTimePrices();
            } else {
                // If page is not visible, wait until it becomes visible
                const reconnectWhenVisible = () => {
                    if (document.visibilityState === 'visible') {
                        document.removeEventListener('visibilitychange', reconnectWhenVisible);
                        initRealTimePrices();
                    }
                };
                document.addEventListener('visibilitychange', reconnectWhenVisible);
            }
        }, delay);
    } else {
        console.log('Max WebSocket reconnect attempts reached, using mock data');
        useMockPriceUpdates();
    }
}

// Fallback to mock price updates when WebSocket fails
function useMockPriceUpdates() {
    console.log('Using mock price updates');
    
    // Clear any existing mock update interval
    if (window.mockUpdateInterval) {
        clearInterval(window.mockUpdateInterval);
    }
    
    // Create mock price updates for watchlist symbols
    window.mockUpdateInterval = setInterval(() => {
        // Only update if the page is visible
        if (document.visibilityState !== 'visible') {
            return;
        }
        
        // Update prices for watchlist symbols
        WATCHLIST_SYMBOLS.forEach(symbol => {
            // Get current price from UI
            const watchlistItems = document.querySelectorAll('.watchlist-item');
            let currentPrice = 100;
            
            watchlistItems.forEach(item => {
                const itemSymbol = item.querySelector('.stock-symbol')?.textContent;
                if (itemSymbol === symbol) {
                    const priceElement = item.querySelector('.price-value');
                    if (priceElement) {
                        currentPrice = parseFloat(priceElement.textContent) || 100;
                    }
                }
            });
            
            // Generate random price change (-0.5% to +0.5%)
            const changePercent = (Math.random() - 0.5) * 1;
            const newPrice = currentPrice * (1 + changePercent / 100);
            
            // Update price display
            updatePriceDisplay(symbol, newPrice);
            
            // Update order book occasionally for selected symbol
            if (symbol === currentlySelectedSymbol && Math.random() < 0.1) {
                updateOrderBook(symbol);
            }
        });
    }, 3000); // Update every 3 seconds
}

// Function to subscribe to a symbol
function subscribeToSymbol(symbol) {
    if (!subscribedSymbols.has(symbol) && websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({'type': 'subscribe', 'symbol': symbol}));
        subscribedSymbols.add(symbol);
        console.log(`Subscribed to ${symbol}`);
    }
}

// Function to unsubscribe from a symbol
function unsubscribeFromSymbol(symbol) {
    if (subscribedSymbols.has(symbol) && websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({'type': 'unsubscribe', 'symbol': symbol}));
        subscribedSymbols.delete(symbol);
        console.log(`Unsubscribed from ${symbol}`);
    }
}

// Current time period for chart
let currentTimePeriod = '1W';

// Fetch stock candles data for chart
function fetchStockCandles(symbol, period = currentTimePeriod) {
    // Check if we have valid cached data
    const cacheKey = `${symbol}-${period}`;
    if (isCacheValid(cacheKey, 'candles')) {
        console.log(`Using cached candle data for ${symbol} (${period})`);
        updateTimePeriodUI(period);
        currentTimePeriod = period;
        updateChartWithData(apiCache.candles[cacheKey].data);
        return;
    }
    
    // Set resolution and time range based on period
    let resolution, from;
    const to = Math.floor(Date.now() / 1000);
    
    switch(period) {
        case '1D':
            resolution = '5'; // 5-minute candles
            from = to - 60 * 60 * 24; // 1 day ago
            break;
        case '1W':
            resolution = '60'; // 1-hour candles
            from = to - 60 * 60 * 24 * 7; // 7 days ago
            break;
        case '1M':
            resolution = 'D'; // Daily candles
            from = to - 60 * 60 * 24 * 30; // 30 days ago
            break;
        case '3M':
            resolution = 'D'; // Daily candles
            from = to - 60 * 60 * 24 * 90; // 90 days ago
            break;
        case '1Y':
            resolution = 'W'; // Weekly candles
            from = to - 60 * 60 * 24 * 365; // 1 year ago
            break;
        case '5Y':
            resolution = 'M'; // Monthly candles
            from = to - 60 * 60 * 24 * 365 * 5; // 5 years ago
            break;
        default:
            resolution = 'D'; // Default to daily candles
            from = to - 60 * 60 * 24 * 30; // Default to 30 days ago
    }
    
    // Update current time period
    currentTimePeriod = period;
    
    // Update UI to show active time period
    updateTimePeriodUI(period);
    
    // Show loading state
    showChartLoading();
    
    fetch(`https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`)
        .then(response => response.json())
        .then(data => {
            if (data.s === 'ok') {
                // Cache the data
                apiCache.candles[cacheKey] = {
                    data: data,
                    timestamp: Date.now()
                };
                updateChartWithData(data);
            } else {
                console.error('Failed to fetch candle data:', data);
                // Use mock data if API fails
                const mockData = generateMockCandleData(symbol, period);
                updateChartWithData(mockData);
            }
        })
        .catch(error => {
            console.error('Error fetching candle data:', error);
            // Use mock data if API fails
            const mockData = generateMockCandleData(symbol, period);
            updateChartWithData(mockData);
        })
        .finally(() => {
            // Hide loading state
            hideChartLoading();
        });
}

// Function to generate mock candle data
function generateMockCandleData(symbol, period) {
    // Get base price from the UI if available
    let basePrice = 100;
    
    // Find the watchlist item with the matching symbol
    const watchlistItems = document.querySelectorAll('.watchlist-item');
    watchlistItems.forEach(item => {
        const itemSymbol = item.querySelector('.stock-symbol')?.textContent;
        if (itemSymbol === symbol) {
            const priceElement = item.querySelector('.price-value');
            if (priceElement) {
                basePrice = parseFloat(priceElement.textContent) || 100;
            }
        }
    });
    
    // Determine number of data points based on period
    let dataPoints;
    switch(period) {
        case '1D': dataPoints = 78; break; // 5-min candles for 6.5 hours
        case '1W': dataPoints = 38; break; // Hourly candles for 5 trading days
        case '1M': dataPoints = 22; break; // Daily candles for ~22 trading days
        case '3M': dataPoints = 65; break; // Daily candles for ~65 trading days
        case '1Y': dataPoints = 52; break; // Weekly candles for 1 year
        case '5Y': dataPoints = 60; break; // Monthly candles for 5 years
        default: dataPoints = 30;
    }
    
    // Generate random price movements
    const closePrices = [];
    const openPrices = [];
    const highPrices = [];
    const lowPrices = [];
    const volumes = [];
    const timestamps = [];
    
    let currentPrice = basePrice;
    const now = new Date();
    let currentTime = new Date(now);
    
    // Adjust start time based on period
    switch(period) {
        case '1D':
            currentTime.setHours(9, 30, 0, 0); // Start at market open
            break;
        case '1W':
            currentTime.setDate(currentTime.getDate() - 7);
            currentTime.setHours(9, 30, 0, 0);
            break;
        case '1M':
            currentTime.setMonth(currentTime.getMonth() - 1);
            break;
        case '3M':
            currentTime.setMonth(currentTime.getMonth() - 3);
            break;
        case '1Y':
            currentTime.setFullYear(currentTime.getFullYear() - 1);
            break;
        case '5Y':
            currentTime.setFullYear(currentTime.getFullYear() - 5);
            break;
    }
    
    // Generate data points
    for (let i = 0; i < dataPoints; i++) {
        // Random price change between -2% and +2%
        const changePercent = (Math.random() * 4 - 2);
        const changeAmount = currentPrice * (changePercent / 100);
        
        // Calculate prices for this candle
        const open = currentPrice;
        currentPrice += changeAmount;
        const close = currentPrice;
        
        // High is the higher of open and close, plus a random amount
        const highExtra = Math.random() * Math.abs(changeAmount) * 0.5;
        const high = Math.max(open, close) + highExtra;
        
        // Low is the lower of open and close, minus a random amount
        const lowExtra = Math.random() * Math.abs(changeAmount) * 0.5;
        const low = Math.min(open, close) - lowExtra;
        
        // Random volume between 100K and 10M
        const volume = Math.floor(Math.random() * 9900000) + 100000;
        
        // Add data point
        openPrices.push(open);
        closePrices.push(close);
        highPrices.push(high);
        lowPrices.push(low);
        volumes.push(volume);
        timestamps.push(Math.floor(currentTime.getTime() / 1000));
        
        // Increment time based on period
        switch(period) {
            case '1D':
                currentTime = new Date(currentTime.getTime() + 5 * 60 * 1000); // 5 minutes
                break;
            case '1W':
                currentTime = new Date(currentTime.getTime() + 60 * 60 * 1000); // 1 hour
                break;
            case '1M':
            case '3M':
                currentTime.setDate(currentTime.getDate() + 1); // 1 day
                break;
            case '1Y':
                currentTime.setDate(currentTime.getDate() + 7); // 1 week
                break;
            case '5Y':
                currentTime.setMonth(currentTime.getMonth() + 1); // 1 month
                break;
        }
    }
    
    return {
        c: closePrices,
        o: openPrices,
        h: highPrices,
        l: lowPrices,
        v: volumes,
        t: timestamps,
        s: 'ok'
    };
}

// Function to update the time period UI
function updateTimePeriodUI(period) {
    const timeOptions = document.querySelectorAll('.time-option');
    timeOptions.forEach(option => {
        if (option.getAttribute('data-period') === period) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
}

// Function to show chart loading state
function showChartLoading() {
    const chartContainer = document.querySelector('.stock-chart');
    
    // Check if loading indicator already exists
    if (!document.querySelector('.chart-loading')) {
        const loadingIndicator = document.createElement('div');
        loadingIndicator.classList.add('chart-loading');
        loadingIndicator.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">Loading chart data...</div>
        `;
        chartContainer.appendChild(loadingIndicator);
    }
}

// Function to hide chart loading state
function hideChartLoading() {
    const loadingIndicator = document.querySelector('.chart-loading');
    if (loadingIndicator) {
        loadingIndicator.remove();
    }
}

// Update price display with flashing effect - optimized version
function updatePriceDisplay(symbol, price) {
    // Format the price to match our display format
    const formattedPrice = parseFloat(price).toFixed(3);
    
    // Use requestAnimationFrame for smoother UI updates
    requestAnimationFrame(() => {
        // Find all elements that display this symbol's price
        const watchlistItems = document.querySelectorAll('.watchlist-item');
        watchlistItems.forEach(item => {
            const itemSymbol = item.querySelector('.stock-symbol').textContent;
            if (itemSymbol === symbol) {
                const priceElement = item.querySelector('.price-value');
                
                // Only update if the price has changed
                if (priceElement.textContent !== formattedPrice) {
                    // Add flash effect with stronger visual indication
                    priceElement.classList.add('price-flash');
                    
                    // Update the price
                    priceElement.textContent = formattedPrice;
                    
                    // Remove flash effect after animation completes
                    setTimeout(() => {
                        priceElement.classList.remove('price-flash');
                    }, 600);
                    
                    // Update the mini chart for this symbol less frequently
                    // Only update mini charts occasionally to reduce API calls
                    if (Math.random() < 0.2) { // 20% chance to update
                        debouncedFetchIntradayData(symbol);
                    }
                }
            }
        });
        
        // Check if this is the currently selected stock
        const selectedSymbol = document.querySelector('.stock-title h2').textContent;
        if (selectedSymbol === symbol) {
            // Update main price display
            const currentPrice = document.querySelector('.current-price');
            if (currentPrice) {
                const priceText = currentPrice.childNodes[0];
                
                // Only update if the price has changed
                if (priceText.textContent !== formattedPrice) {
                    // Add flash effect
                    currentPrice.classList.add('price-flash');
                    
                    // Update the price
                    priceText.textContent = formattedPrice;
                    
                    // Remove flash effect after animation completes
                    setTimeout(() => {
                        currentPrice.classList.remove('price-flash');
                    }, 600);
                }
            }
            
            // Also update the price in the order book header
            const orderBookPrice = document.querySelector('.order-book-header .stock-price');
            if (orderBookPrice) {
                const orderBookPriceText = orderBookPrice.childNodes[0];
                
                if (orderBookPriceText.textContent !== formattedPrice) {
                    // Add flash effect
                    orderBookPrice.classList.add('price-flash');
                    
                    // Update the price
                    orderBookPriceText.textContent = formattedPrice;
                    
                    // Remove flash effect after animation completes
                    setTimeout(() => {
                        orderBookPrice.classList.remove('price-flash');
                    }, 600);
                }
            }
        }
    });
}

// Create a debounced version of fetchIntradayData
const debouncedFetchIntradayData = debounce(fetchIntradayData, 2000);

// Chart rendering optimization variables
let chartRenderingAnimationFrame = null;
let chartDataCache = null;

// Update chart with candle data - optimized version
function updateChartWithData(data) {
    // Ensure we have valid data
    if (!data || !data.c || data.c.length === 0) {
        console.error('Invalid chart data received:', data);
        return;
    }
    
    // Store data in cache for potential reuse (e.g., on window resize)
    chartDataCache = data;
    
    // Cancel any pending animation frame to prevent multiple renders
    if (chartRenderingAnimationFrame) {
        cancelAnimationFrame(chartRenderingAnimationFrame);
    }
    
    // Use requestAnimationFrame for smoother rendering
    chartRenderingAnimationFrame = requestAnimationFrame(() => {
        renderChart(data);
    });
}

// Separate rendering function for better performance
function renderChart(data) {
    console.time('Chart Rendering');
    
    // Calculate percentage changes from the first price
    const firstPrice = data.c[0];
    const percentChanges = data.c.map(price => ((price - firstPrice) / firstPrice) * 100);
    
    // Create SVG path for the chart
    const chartContainer = document.querySelector('.stock-chart');
    if (!chartContainer) return;
    
    // Get actual dimensions from the container for responsive rendering
    const containerRect = chartContainer.getBoundingClientRect();
    const width = 600; // Keep fixed width for viewBox
    const height = 300; // Keep fixed height for viewBox
    const xStep = width / (percentChanges.length - 1);
    
    // Performance optimization: Use Web Workers for heavy calculations if available
    // For now, we'll do the calculations in the main thread
    
    // Find min and max percentage changes for scaling
    const minPercent = Math.min(...percentChanges);
    const maxPercent = Math.max(...percentChanges);
    // Add some padding to the range to avoid chart touching the edges
    const paddingPercent = (maxPercent - minPercent) * 0.1;
    const adjustedMinPercent = minPercent - paddingPercent;
    const adjustedMaxPercent = maxPercent + paddingPercent;
    const range = adjustedMaxPercent - adjustedMinPercent;
    
    // Performance optimization: Reduce number of points for smoother rendering
    // Only use a subset of points if there are too many
    let pointsToRender = percentChanges;
    if (percentChanges.length > 200) {
        // Downsample the data for better performance
        const downsampleFactor = Math.ceil(percentChanges.length / 200);
        pointsToRender = percentChanges.filter((_, index) => index % downsampleFactor === 0);
        // Always include first and last points
        if (!pointsToRender.includes(percentChanges[0])) {
            pointsToRender.unshift(percentChanges[0]);
        }
        if (!pointsToRender.includes(percentChanges[percentChanges.length - 1])) {
            pointsToRender.push(percentChanges[percentChanges.length - 1]);
        }
    }
    
    // Create path data with smooth curves
    let pathData = '';
    let areaPathData = '';
    
    // Use a smoothing factor for the curve
    const smoothing = 0.2;
    let prevX, prevY;
    
    // Performance optimization: Use a more efficient path generation approach
    const pathPoints = [];
    const areaPathPoints = [];
    
    pointsToRender.forEach((percent, index) => {
        // Normalize the percentage to the chart height (inverted, as SVG y-axis goes down)
        const normalizedY = height - ((percent - adjustedMinPercent) / range) * height;
        const x = (index / (pointsToRender.length - 1)) * width;
        
        if (index === 0) {
            pathPoints.push(`M${x},${normalizedY}`);
            areaPathPoints.push(`M${x},${height} L${x},${normalizedY}`);
            prevX = x;
            prevY = normalizedY;
        } else {
            // Use bezier curves for smoother lines
            if (index < pointsToRender.length - 1) {
                const nextPercent = pointsToRender[index + 1];
                const nextY = height - ((nextPercent - adjustedMinPercent) / range) * height;
                const nextX = ((index + 1) / (pointsToRender.length - 1)) * width;
                
                // Control points for the curve
                const cp1x = prevX + (x - prevX) * (1 - smoothing);
                const cp1y = prevY;
                const cp2x = x - (nextX - x) * smoothing;
                const cp2y = normalizedY;
                
                pathPoints.push(`C${cp1x},${cp1y} ${cp2x},${cp2y} ${x},${normalizedY}`);
                areaPathPoints.push(`C${cp1x},${cp1y} ${cp2x},${cp2y} ${x},${normalizedY}`);
            } else {
                // Last point
                pathPoints.push(`L${x},${normalizedY}`);
                areaPathPoints.push(`L${x},${normalizedY}`);
            }
            
            prevX = x;
            prevY = normalizedY;
        }
    });
    
    // Join path data for better performance
    pathData = pathPoints.join(' ');
    areaPathData = areaPathPoints.join(' ');
    
    // Complete the area path by closing it at the bottom
    areaPathData += ` L${width},${height} L0,${height} Z`;
    
    // Update the SVG paths
    const chartPath = document.querySelector('.chart-path');
    const chartArea = document.querySelector('.chart-area');
    
    if (chartPath && chartArea) {
        // Determine if the stock is up or down
        const isPositive = percentChanges[percentChanges.length - 1] >= 0;
        const lineColor = isPositive ? '#28a745' : '#dc3545';
        const areaColor = isPositive ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)';
        
        // Performance optimization: Batch DOM updates
        // Use a DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        
        // Update the chart colors
        chartPath.setAttribute('stroke', lineColor);
        chartPath.setAttribute('d', pathData);
        chartArea.setAttribute('d', areaPathData);
        chartArea.setAttribute('fill', areaColor);
        
        // Update the chart container background
        chartContainer.style.backgroundColor = isPositive ? 'rgba(40, 167, 69, 0.05)' : 'rgba(220, 53, 69, 0.05)';
    }
    
    // Update y-axis labels with actual percentage values
    const yAxisLabels = document.querySelectorAll('.y-axis-label');
    const percentStep = range / (yAxisLabels.length - 1);
    
    // Performance optimization: Batch DOM updates for labels
    const yAxisFragment = document.createDocumentFragment();
    yAxisLabels.forEach((label, index) => {
        const percent = adjustedMaxPercent - (index * percentStep);
        label.textContent = percent.toFixed(2) + '%';
        yAxisFragment.appendChild(label.cloneNode(true));
    });
    
    // Update volume information
    const totalVolume = data.v.reduce((sum, vol) => sum + vol, 0);
    const volumeValueElement = document.querySelector('.volume-value');
    if (volumeValueElement) {
        volumeValueElement.textContent = `VOL ${totalVolume.toLocaleString()}`;
    }
    
    // Add data points at key positions - but limit the number for performance
    // Only add data points if we have a reasonable number of points
    if (percentChanges.length <= 500) {
        addChartDataPoints(percentChanges, adjustedMinPercent, range, height, xStep);
    } else {
        // For large datasets, only add a few key points
        const sampledPercentChanges = [];
        const sampleRate = Math.ceil(percentChanges.length / 10);
        for (let i = 0; i < percentChanges.length; i += sampleRate) {
            sampledPercentChanges.push(percentChanges[i]);
        }
        // Always include first and last points
        if (!sampledPercentChanges.includes(percentChanges[0])) {
            sampledPercentChanges.unshift(percentChanges[0]);
        }
        if (!sampledPercentChanges.includes(percentChanges[percentChanges.length - 1])) {
            sampledPercentChanges.push(percentChanges[percentChanges.length - 1]);
        }
        addChartDataPoints(sampledPercentChanges, adjustedMinPercent, range, height, width / (sampledPercentChanges.length - 1));
    }
    
    // Update x-axis labels with dates
    updateXAxisLabels(data.t);
    
    console.timeEnd('Chart Rendering');
}

// Handle window resize for responsive charts
window.addEventListener('resize', debounce(() => {
    // Re-render chart with cached data if available
    if (chartDataCache) {
        renderChart(chartDataCache);
    }
}, 250));

// Function to add data points to the chart
function addChartDataPoints(percentChanges, minPercent, range, height, xStep) {
    // Remove existing data points
    const existingPoints = document.querySelectorAll('.chart-data-point');
    existingPoints.forEach(point => point.remove());
    
    // Add new data points at key positions
    const chartContainer = document.querySelector('.stock-chart');
    
    // Add points at start, end, min, max, and a few in between
    const keyIndices = [
        0, // Start
        percentChanges.length - 1, // End
        percentChanges.indexOf(Math.min(...percentChanges)), // Min
        percentChanges.indexOf(Math.max(...percentChanges)), // Max
        Math.floor(percentChanges.length / 3), // 1/3 point
        Math.floor(percentChanges.length * 2 / 3) // 2/3 point
    ];
    
    // Remove duplicates
    const uniqueIndices = [...new Set(keyIndices)];
    
    uniqueIndices.forEach(index => {
        const percent = percentChanges[index];
        const normalizedY = height - ((percent - minPercent) / range) * height;
        const x = index * xStep;
        
        const dataPoint = document.createElement('div');
        dataPoint.classList.add('chart-data-point');
        dataPoint.style.left = `${x + 40}px`; // Adjust for y-axis width
        dataPoint.style.top = `${normalizedY + 15}px`; // Adjust for padding
        
        // Add tooltip with the exact percentage
        dataPoint.setAttribute('title', `${percent.toFixed(2)}%`);
        
        chartContainer.appendChild(dataPoint);
    });
}

// Function to update x-axis labels with dates
function updateXAxisLabels(timestamps) {
    if (!timestamps || timestamps.length === 0) return;
    
    const xAxisLabels = document.querySelectorAll('.x-axis-label');
    
    // Only update if we have labels
    if (xAxisLabels.length >= 2) {
        // Format the first timestamp (start date)
        const startDate = new Date(timestamps[0] * 1000);
        xAxisLabels[0].textContent = startDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
        
        // Format the last timestamp (end date)
        const endDate = new Date(timestamps[timestamps.length - 1] * 1000);
        xAxisLabels[1].textContent = endDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    }
}

// Function to fetch intraday data for a specific stock
function fetchIntradayData(symbol) {
    // Check if we have valid cached data
    const cacheKey = symbol;
    if (isCacheValid(cacheKey, 'candles')) {
        console.log(`Using cached intraday data for ${symbol}`);
        updateMiniChart(symbol, apiCache.candles[cacheKey].data);
        return;
    }
    
    // Calculate start time (market open or 9:30 AM ET)
    const now = new Date();
    const marketOpen = new Date(now);
    marketOpen.setHours(9, 30, 0, 0); // 9:30 AM
    
    // If it's before market open, use yesterday's data
    if (now < marketOpen) {
        marketOpen.setDate(marketOpen.getDate() - 1);
    }
    
    const from = Math.floor(marketOpen.getTime() / 1000);
    const to = Math.floor(now.getTime() / 1000);
    const resolution = '5'; // 5-minute candles
    
    fetch(`https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`)
        .then(response => response.json())
        .then(data => {
            if (data.s === 'ok' && data.c && data.c.length > 0) {
                // Cache the data
                apiCache.candles[cacheKey] = {
                    data: data,
                    timestamp: Date.now()
                };
                updateMiniChart(symbol, data);
            } else {
                // Use mock data if API fails
                const mockData = generateMockIntradayData(symbol);
                updateMiniChart(symbol, mockData);
            }
        })
        .catch(error => {
            console.error('Error fetching intraday data:', error);
            // Use mock data if API fails
            const mockData = generateMockIntradayData(symbol);
            updateMiniChart(symbol, mockData);
        });
}

// Function to fetch intraday data for all watchlist stocks
function fetchIntradayDataForWatchlist() {
    // Clear any existing interval
    if (intradayDataRefreshInterval) {
        clearInterval(intradayDataRefreshInterval);
    }
    
    // Immediately fetch data for all symbols
    WATCHLIST_SYMBOLS.forEach(symbol => {
        fetchIntradayData(symbol);
    });
    
    // Refresh intraday data every 2 minutes (reduced from 1 minute)
    intradayDataRefreshInterval = setInterval(() => {
        // Only update if the tab is visible
        if (document.visibilityState === 'visible') {
            WATCHLIST_SYMBOLS.forEach(symbol => {
                fetchIntradayData(symbol);
            });
        }
    }, 120 * 1000); // 2 minutes
}

// Function to update mini chart for a specific stock
function updateMiniChart(symbol, data) {
    // Store the data for this symbol
    miniChartData[symbol] = data;
    
    // Find the watchlist item for this symbol
    const watchlistItems = document.querySelectorAll('.watchlist-item');
    watchlistItems.forEach(item => {
        const itemSymbol = item.querySelector('.stock-symbol').textContent;
        if (itemSymbol === symbol) {
            const miniChart = item.querySelector('.mini-chart-svg');
            const chartPath = item.querySelector('.mini-chart-path');
            const priceChange = item.querySelector('.price-change');
            
            if (miniChart && chartPath && data.c && data.c.length > 0) {
                // Calculate percentage changes from the first price
                const firstPrice = data.c[0];
                const lastPrice = data.c[data.c.length - 1];
                const percentChange = ((lastPrice - firstPrice) / firstPrice) * 100;
                
                // Update price change display
                const changeText = percentChange >= 0 ? `+${percentChange.toFixed(2)}%` : `${percentChange.toFixed(2)}%`;
                priceChange.textContent = changeText;
                
                // Update price change class
                if (percentChange >= 0) {
                    priceChange.classList.remove('negative');
                    priceChange.classList.add('positive');
                    chartPath.setAttribute('stroke', '#28a745'); // Green
                } else {
                    priceChange.classList.remove('positive');
                    priceChange.classList.add('negative');
                    chartPath.setAttribute('stroke', '#dc3545'); // Red
                }
                
                // Create SVG path for the chart
                const width = 60;
                const height = 30;
                const xStep = width / (data.c.length - 1);
                
                // Find min and max prices for scaling
                const minPrice = Math.min(...data.c);
                const maxPrice = Math.max(...data.c);
                const range = maxPrice - minPrice;
                
                // Create path data
                let pathData = '';
                
                data.c.forEach((price, index) => {
                    // Normalize the price to the chart height (inverted, as SVG y-axis goes down)
                    const normalizedY = height - ((price - minPrice) / range) * height;
                    const x = index * xStep;
                    
                    if (index === 0) {
                        pathData += `M${x},${normalizedY}`;
                    } else {
                        pathData += ` L${x},${normalizedY}`;
                    }
                });
                
                // Update the SVG path
                chartPath.setAttribute('d', pathData);
            }
        }
    });
}

// Function to generate mock intraday data
function generateMockIntradayData(symbol) {
    const dataPoints = 20; // Number of data points
    const closePrices = [];
    const timestamps = [];
    
    // Get base price from the UI if available
    let basePrice = 100;
    
    // Find the watchlist item with the matching symbol
    const watchlistItems = document.querySelectorAll('.watchlist-item');
    watchlistItems.forEach(item => {
        const itemSymbol = item.querySelector('.stock-symbol')?.textContent;
        if (itemSymbol === symbol) {
            const priceElement = item.querySelector('.price-value');
            if (priceElement) {
                basePrice = parseFloat(priceElement.textContent) || 100;
            }
        }
    });
    
    // Generate random price movements
    let currentPrice = basePrice;
    const now = new Date();
    let currentTime = new Date(now);
    currentTime.setHours(9, 30, 0, 0); // Start at market open
    
    for (let i = 0; i < dataPoints; i++) {
        // Random price change between -1% and +1%
        const change = (Math.random() * 2 - 1) * basePrice * 0.01;
        currentPrice += change;
        closePrices.push(currentPrice);
        
        // Add 15 minutes for each data point
        currentTime = new Date(currentTime.getTime() + 15 * 60 * 1000);
        timestamps.push(Math.floor(currentTime.getTime() / 1000));
    }
    
    return {
        c: closePrices,
        t: timestamps,
        s: 'ok'
    };
}

// Function to update the order book panel
function updateOrderBook(symbol) {
    // Check if we have valid cached data
    const cacheKey = symbol;
    if (isCacheValid(cacheKey, 'orderBooks')) {
        console.log(`Using cached order book data for ${symbol}`);
        const data = apiCache.orderBooks[cacheKey].data;
        updateOrderBookUI(data.bids, data.asks);
        return;
    }
    
    // Fetch order book data from Finnhub API
    fetch(`https://finnhub.io/api/v1/stock/orderbook?symbol=${symbol}&token=${FINNHUB_API_KEY}`)
        .then(response => response.json())
        .then(data => {
            if (data.bids && data.asks) {
                // Cache the data
                apiCache.orderBooks[cacheKey] = {
                    data: data,
                    timestamp: Date.now()
                };
                updateOrderBookUI(data.bids, data.asks);
            } else {
                console.log('Using mock order book data due to API limitations');
                // Generate mock order book data
                const mockData = generateMockOrderBookData(symbol);
                updateOrderBookUI(mockData.bids, mockData.asks);
            }
        })
        .catch(error => {
            console.log('Using mock order book data due to API error:', error);
            // Generate mock order book data
            const mockData = generateMockOrderBookData(symbol);
            updateOrderBookUI(mockData.bids, mockData.asks);
        });
}

// Function to generate mock order book data
function generateMockOrderBookData(symbol) {
    // Get base price from the UI
    let priceText = document.querySelector('.order-book-header .stock-price')?.textContent;
    // Remove any non-numeric characters except decimal point
    priceText = priceText ? priceText.replace(/[^\d.]/g, '') : '';
    const basePrice = parseFloat(priceText) || 100;
    
    // Generate random bids (slightly lower than base price)
    const bids = [];
    for (let i = 0; i < 10; i++) {
        // Each bid is slightly lower than the previous
        const priceDelta = parseFloat((Math.random() * 0.1 * (i + 1)).toFixed(3));
        const price = (basePrice - priceDelta).toFixed(3);
        
        // Random volume between 1 and 1000
        const volume = Math.floor(Math.random() * 1000) + 1;
        
        bids.push({
            price: price,
            volume: volume.toString()
        });
    }
    
    // Sort bids in descending order by price (highest bid first)
    bids.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    
    // Generate random asks (slightly higher than base price)
    const asks = [];
    for (let i = 0; i < 10; i++) {
        // Each ask is slightly higher than the previous
        const priceDelta = parseFloat((Math.random() * 0.1 * (i + 1)).toFixed(3));
        const price = (basePrice + priceDelta).toFixed(3);
        
        // Random volume between 1 and 1000
        const volume = Math.floor(Math.random() * 1000) + 1;
        
        asks.push({
            price: price,
            volume: volume.toString()
        });
    }
    
    // Sort asks in ascending order by price (lowest ask first)
    asks.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    
    return { bids, asks };
}

// Store previous order book data to compare for changes
let previousBids = [];
let previousAsks = [];

// Function to check if a bid has changed from previous update
function hasBidChanged(bid, index) {
    if (!previousBids[index]) {
        return false; // First time, no change
    }
    
    return bid.price !== previousBids[index].price || 
           bid.volume !== previousBids[index].volume;
}

// Function to check if an ask has changed from previous update
function hasAskChanged(ask, index) {
    if (!previousAsks[index]) {
        return false; // First time, no change
    }
    
    return ask.price !== previousAsks[index].price || 
           ask.volume !== previousAsks[index].volume;
}

// Function to update the order book UI with the fetched data
function updateOrderBookUI(bids, asks) {
    const orderBookTable = document.getElementById('order-book');
    if (!orderBookTable) return;
    
    // Add a visual indicator that the order book is being updated
    const orderBookTitle = document.querySelector('.order-book-title');
    if (orderBookTitle) {
        orderBookTitle.classList.add('updating');
        
        // Remove the updating class after animation completes
        setTimeout(() => {
            orderBookTitle.classList.remove('updating');
        }, 1000);
    }
    
    // Clear existing order book rows
    orderBookTable.innerHTML = '';
    
    // Determine how many rows to display (minimum of bids and asks length, up to 10)
    const rowCount = Math.min(Math.max(bids.length, asks.length), 10);
    
    for (let i = 0; i < rowCount; i++) {
        const bid = bids[i] || { price: '', volume: '' };
        const ask = asks[i] || { price: '', volume: '' };
        
        // Check if bid has changed from previous update
        const bidChanged = hasBidChanged(bid, i);
        
        // Check if ask has changed from previous update
        const askChanged = hasAskChanged(ask, i);
        
        // Create a new order row
        const orderRow = document.createElement('div');
        orderRow.className = 'order-row';
        
        // Format the bid side with change indicator if needed
        orderRow.innerHTML = `
            <div class="bid-side ${bidChanged ? 'changed' : ''}">
                <div class="quantity">${bid.volume || ''}</div>
                <div class="price">${bid.price ? parseFloat(bid.price).toFixed(3) : ''}</div>
                <div class="exchange">ARCA</div>
            </div>
            <div class="ask-side ${askChanged ? 'changed' : ''}">
                <div class="exchange">ARCA</div>
                <div class="price">${ask.price ? parseFloat(ask.price).toFixed(3) : ''}</div>
                <div class="quantity">${ask.volume || ''}</div>
            </div>
        `;
        
        orderBookTable.appendChild(orderRow);
    }
    
    // Update bid/ask container with the best bid and ask
    if (bids.length > 0 && asks.length > 0) {
        const bestBid = bids[0];
        const bestAsk = asks[0];
        
        // Calculate percentages for bid/ask
        const totalVolume = parseFloat(bestBid.volume) + parseFloat(bestAsk.volume);
        const bidPercentage = (parseFloat(bestBid.volume) / totalVolume * 100).toFixed(2);
        const askPercentage = (parseFloat(bestAsk.volume) / totalVolume * 100).toFixed(2);
        
        // Update bid container
        const bidPercentageEl = document.querySelector('.bid-percentage');
        const bidPriceEl = document.querySelector('.bid-price');
        const bidQuantityEl = document.querySelector('.bid-quantity');
        
        if (bidPercentageEl) bidPercentageEl.textContent = bidPercentage + '%';
        if (bidPriceEl) bidPriceEl.textContent = parseFloat(bestBid.price).toFixed(3);
        if (bidQuantityEl) bidQuantityEl.textContent = bestBid.volume;
        
        // Update ask container
        const askPercentageEl = document.querySelector('.ask-percentage');
        const askPriceEl = document.querySelector('.ask-price');
        const askQuantityEl = document.querySelector('.ask-quantity');
        
        if (askPercentageEl) askPercentageEl.textContent = askPercentage + '%';
        if (askPriceEl) askPriceEl.textContent = parseFloat(bestAsk.price).toFixed(3);
        if (askQuantityEl) askQuantityEl.textContent = bestAsk.volume;
    }
    
    // Store current data as previous for the next update
    previousBids = [...bids];
    previousAsks = [...asks];
}

// Function to initialize the watchlist
function initWatchlist() {
    const watchlistContainer = document.querySelector('.watchlist-container');
    if (!watchlistContainer) return;
    
    // Clear existing watchlist items
    watchlistContainer.innerHTML = '';
    
    // Add watchlist items
    WATCHLIST_SYMBOLS.forEach(symbol => {
        const watchlistItem = document.createElement('div');
        watchlistItem.classList.add('watchlist-item');
        watchlistItem.innerHTML = `
            <div class="stock-info">
                <div class="stock-symbol">${symbol}</div>
                <div class="price-value">0.000</div>
            </div>
            <div class="mini-chart">
                <svg class="mini-chart-svg" width="60" height="30">
                    <path class="mini-chart-path" d="M0,15 L60,15" stroke="#999" stroke-width="1.5" fill="none"></path>
                </svg>
            </div>
            <div class="price-change">0.00%</div>
        `;
        
        // Add click event to select this stock
        watchlistItem.addEventListener('click', function() {
            // Update currently selected symbol
            currentlySelectedSymbol = symbol;
            
            // Update UI to show this is the selected stock
            document.querySelectorAll('.watchlist-item').forEach(item => {
                item.classList.remove('selected');
            });
            watchlistItem.classList.add('selected');
            
            // Update stock detail panel
            updateStockDetailPanel(symbol);
            
            // Update order book
            updateOrderBook(symbol);
            
            // Manage WebSocket subscriptions
            // Unsubscribe from all symbols except a few priority ones to reduce load
            subscribedSymbols.forEach(sub => {
                if (sub !== symbol && !WATCHLIST_SYMBOLS.slice(0, 4).includes(sub)) {
                    unsubscribeFromSymbol(sub);
                }
            });
            
            // Subscribe to the newly selected symbol if not already subscribed
            subscribeToSymbol(symbol);
        });
        
        watchlistContainer.appendChild(watchlistItem);
    });
    
    // Mark the first item as selected by default
    const firstItem = watchlistContainer.querySelector('.watchlist-item');
    if (firstItem) {
        firstItem.classList.add('selected');
    }
}

// Function to update the stock detail panel
function updateStockDetailPanel(symbol) {
    // Update stock title
    document.querySelector('.stock-title h2').textContent = symbol;
    
    // Fetch and update stock candles for the chart
    fetchStockCandles(symbol);
    
    // Fetch company profile for additional information
    fetchCompanyProfile(symbol);
}

// Function to fetch company profile
function fetchCompanyProfile(symbol) {
    // Check if we have valid cached data
    if (isCacheValid(symbol, 'profiles')) {
        console.log(`Using cached profile data for ${symbol}`);
        updateCompanyProfileUI(apiCache.profiles[symbol].data);
        return;
    }
    
    fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${FINNHUB_API_KEY}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.name) {
                // Cache the data
                apiCache.profiles[symbol] = {
                    data: data,
                    timestamp: Date.now()
                };
                updateCompanyProfileUI(data);
            }
        })
        .catch(error => {
            console.error('Error fetching company profile:', error);
        });
}

// Function to update company profile UI
function updateCompanyProfileUI(data) {
    // Update company name
    const companyName = document.querySelector('.company-name');
    if (companyName && data.name) {
        companyName.textContent = data.name;
    }
    
    // Update company logo if available
    const companyLogo = document.querySelector('.company-logo img');
    if (companyLogo && data.logo) {
        companyLogo.src = data.logo;
        companyLogo.alt = data.name;
    }
    
    // Update company information
    const companyInfo = document.querySelector('.company-info');
    if (companyInfo) {
        companyInfo.innerHTML = `
            <div><strong>Exchange:</strong> ${data.exchange || 'N/A'}</div>
            <div><strong>Industry:</strong> ${data.finnhubIndustry || 'N/A'}</div>
            <div><strong>Market Cap:</strong> $${(data.marketCapitalization * 1000000).toLocaleString()}</div>
            <div><strong>Shares Outstanding:</strong> ${(data.shareOutstanding * 1000000).toLocaleString()}</div>
        `;
    }
}

// Function to initialize modal functionality
function initModal() {
    // Get modal elements
    const modal = document.getElementById('settings-modal');
    const openModalBtn = document.getElementById('settings-button');
    const closeModalBtn = document.querySelector('.close-modal');
    const saveWatchlistBtn = document.getElementById('save-watchlist');
    const watchlistInput = document.getElementById('watchlist-symbols');
    
    if (!modal || !openModalBtn) return;
    
    // Set initial watchlist value
    if (watchlistInput) {
        watchlistInput.value = WATCHLIST_SYMBOLS.join(', ');
    }
    
    // Open modal
    openModalBtn.addEventListener('click', function() {
        modal.style.display = 'block';
    });
    
    // Close modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Save watchlist
    if (saveWatchlistBtn && watchlistInput) {
        saveWatchlistBtn.addEventListener('click', function() {
            // Get symbols from input, split by comma, trim whitespace, and filter out empty strings
            const symbols = watchlistInput.value
                .split(',')
                .map(symbol => symbol.trim().toUpperCase())
                .filter(symbol => symbol !== '');
            
            // Validate symbols (basic validation)
            if (symbols.length === 0) {
                alert('Please enter at least one valid stock symbol.');
                return;
            }
            
            // Update watchlist
            WATCHLIST_SYMBOLS = symbols;
            
            // Save to localStorage
            localStorage.setItem('watchlist', JSON.stringify(WATCHLIST_SYMBOLS));
            
            // Reinitialize watchlist
            initWatchlist();
            
            // Fetch data for new watchlist
            fetchIntradayDataForWatchlist();
            
            // Close modal
            modal.style.display = 'none';
            
            // Update WebSocket subscriptions
            updateWebSocketSubscriptions();
        });
    }
}

// Function to update WebSocket subscriptions based on current watchlist
function updateWebSocketSubscriptions() {
    // Only proceed if WebSocket is open
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
        return;
    }
    
    // Unsubscribe from all current symbols
    subscribedSymbols.forEach(symbol => {
        unsubscribeFromSymbol(symbol);
    });
    
    // Subscribe to currently selected symbol and a few from watchlist
    const prioritySymbols = [currentlySelectedSymbol];
    
    // Add a few more symbols from the watchlist (up to 5 total)
    WATCHLIST_SYMBOLS.forEach(symbol => {
        if (prioritySymbols.length < 5 && !prioritySymbols.includes(symbol)) {
            prioritySymbols.push(symbol);
        }
    });
    
    // Subscribe to priority symbols
    prioritySymbols.forEach(symbol => {
        subscribeToSymbol(symbol);
    });
}

// Function to add main chart to stock detail panel
function addMainChart() {
    const chartContainer = document.querySelector('.stock-chart');
    if (!chartContainer) return;
    
    // Clear existing chart
    chartContainer.innerHTML = '';
    
    // Create SVG element for the chart
    const chartSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    chartSvg.setAttribute('width', '100%');
    chartSvg.setAttribute('height', '100%');
    chartSvg.setAttribute('viewBox', '0 0 600 300');
    chartSvg.classList.add('chart-svg');
    
    // Create path for the chart line
    const chartPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    chartPath.classList.add('chart-path');
    chartPath.setAttribute('stroke', '#28a745');
    chartPath.setAttribute('stroke-width', '2');
    chartPath.setAttribute('fill', 'none');
    chartPath.setAttribute('d', 'M0,150 L600,150');
    
    // Create path for the chart area
    const chartArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    chartArea.classList.add('chart-area');
    chartArea.setAttribute('fill', 'rgba(40, 167, 69, 0.1)');
    chartArea.setAttribute('d', 'M0,150 L600,150 L600,300 L0,300 Z');
    
    // Add paths to SVG
    chartSvg.appendChild(chartArea);
    chartSvg.appendChild(chartPath);
    
    // Add SVG to chart container
    chartContainer.appendChild(chartSvg);
    
    // Add y-axis labels
    const yAxis = document.createElement('div');
    yAxis.classList.add('y-axis');
    
    // Add 5 labels for the y-axis
    for (let i = 0; i < 5; i++) {
        const label = document.createElement('div');
        label.classList.add('y-axis-label');
        label.textContent = '0.00%';
        yAxis.appendChild(label);
    }
    
    chartContainer.appendChild(yAxis);
    
    // Add x-axis labels
    const xAxis = document.createElement('div');
    xAxis.classList.add('x-axis');
    
    // Add 2 labels for start and end dates
    for (let i = 0; i < 2; i++) {
        const label = document.createElement('div');
        label.classList.add('x-axis-label');
        label.textContent = i === 0 ? 'Start' : 'End';
        xAxis.appendChild(label);
    }
    
    chartContainer.appendChild(xAxis);
    
    // Add volume indicator
    const volumeIndicator = document.createElement('div');
    volumeIndicator.classList.add('volume-indicator');
    volumeIndicator.innerHTML = '<span class="volume-value">VOL 0</span>';
    chartContainer.appendChild(volumeIndicator);
}

// Function to add mini charts to watchlist items
function addMiniCharts() {
    const watchlistItems = document.querySelectorAll('.watchlist-item');
    
    watchlistItems.forEach(item => {
        const miniChart = item.querySelector('.mini-chart');
        if (!miniChart) return;
        
        // Clear existing chart
        miniChart.innerHTML = '';
        
        // Create SVG element for the mini chart
        const chartSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        chartSvg.setAttribute('width', '60');
        chartSvg.setAttribute('height', '30');
        chartSvg.classList.add('mini-chart-svg');
        
        // Create path for the chart line
        const chartPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        chartPath.classList.add('mini-chart-path');
        chartPath.setAttribute('stroke', '#999');
        chartPath.setAttribute('stroke-width', '1.5');
        chartPath.setAttribute('fill', 'none');
        chartPath.setAttribute('d', 'M0,15 L60,15');
        
        // Add path to SVG
        chartSvg.appendChild(chartPath);
        
        // Add SVG to mini chart container
        miniChart.appendChild(chartSvg);
    });
}

// Function to set equal widths for all panels
function setEqualPanelWidths() {
    const container = document.querySelector('.container');
    const panels = document.querySelectorAll('.panel');
    
    if (!container || panels.length === 0) return;
    
    const containerWidth = container.clientWidth;
    const panelWidth = containerWidth / panels.length;
    
    panels.forEach(panel => {
        panel.style.width = `${panelWidth}px`;
    });
}

// Function to initialize resizable panels
function initResizablePanels() {
    const container = document.querySelector('.container');
    const panels = document.querySelectorAll('.panel');
    const resizers = document.querySelectorAll('.resizer');
    
    if (!container || panels.length === 0 || resizers.length === 0) return;
    
    resizers.forEach((resizer, index) => {
        let x = 0;
        let leftPanelWidth = 0;
        
        const leftPanel = panels[index];
        const rightPanel = panels[index + 1];
        
        if (!leftPanel || !rightPanel) return;
        
        const onMouseDown = function(e) {
            x = e.clientX;
            leftPanelWidth = leftPanel.getBoundingClientRect().width;
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            
            // Add resizing class to cursor
            document.body.classList.add('resizing');
        };
        
        const onMouseMove = function(e) {
            const dx = e.clientX - x;
            const newLeftPanelWidth = leftPanelWidth + dx;
            
            // Ensure minimum width for both panels
            const minWidth = 200;
            if (newLeftPanelWidth < minWidth) return;
            if (container.clientWidth - newLeftPanelWidth < minWidth) return;
            
            leftPanel.style.width = `${newLeftPanelWidth}px`;
            rightPanel.style.width = `${container.clientWidth - newLeftPanelWidth - resizer.clientWidth}px`;
        };
        
        const onMouseUp = function() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            
            // Remove resizing class from cursor
            document.body.classList.remove('resizing');
        };
        
        resizer.addEventListener('mousedown', onMouseDown);
    });
    
    // Handle window resize
    window.addEventListener('resize', function() {
        // Reset panel widths on window resize
        setEqualPanelWidths();
    });
}

// Function to fetch company news
function fetchCompanyNews(symbol) {
    // Check if we have valid cached data
    if (isCacheValid(symbol, 'news')) {
        console.log(`Using cached news data for ${symbol}`);
        displayCompanyNews(apiCache.news[symbol].data);
        return;
    }
    
    // Calculate date range (last 7 days)
    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setDate(fromDate.getDate() - 7);
    
    // Format dates as YYYY-MM-DD
    const toDateStr = today.toISOString().split('T')[0];
    const fromDateStr = fromDate.toISOString().split('T')[0];
    
    // Show loading state
    const newsContainer = document.querySelector('.news-container');
    if (newsContainer) {
        newsContainer.innerHTML = '<div class="loading-spinner"></div>';
    }
    
    fetch(`https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${fromDateStr}&to=${toDateStr}&token=${FINNHUB_API_KEY}`)
        .then(response => response.json())
        .then(data => {
            if (Array.isArray(data) && data.length > 0) {
                // Cache the data
                apiCache.news[symbol] = {
                    data: data,
                    timestamp: Date.now()
                };
                displayCompanyNews(data);
            } else {
                // Display message if no news
                if (newsContainer) {
                    newsContainer.innerHTML = '<div class="no-news">No recent news available for this stock.</div>';
                }
            }
        })
        .catch(error => {
            console.error('Error fetching company news:', error);
            // Display error message
            if (newsContainer) {
                newsContainer.innerHTML = '<div class="news-error">Failed to load news. Please try again later.</div>';
            }
        });
}

// Function to display company news
function displayCompanyNews(newsItems) {
    const newsContainer = document.querySelector('.news-container');
    if (!newsContainer) return;
    
    // Clear existing news
    newsContainer.innerHTML = '';
    
    // Limit to 10 news items
    const limitedNews = newsItems.slice(0, 10);
    
    // Add news items
    limitedNews.forEach(news => {
        const newsItem = document.createElement('div');
        newsItem.classList.add('news-item');
        
        // Format date
        const date = new Date(news.datetime * 1000);
        const formattedDate = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Create news item HTML
        newsItem.innerHTML = `
            <div class="news-header">
                <div class="news-source">${news.source || 'Unknown Source'}</div>
                <div class="news-date">${formattedDate}</div>
            </div>
            <div class="news-headline">${news.headline || 'No headline available'}</div>
            <div class="news-summary">${news.summary || news.headline || 'No summary available'}</div>
        `;
        
        // Add click event to open news in new tab
        if (news.url) {
            newsItem.addEventListener('click', function() {
                window.open(news.url, '_blank');
            });
        }
        
        newsContainer.appendChild(newsItem);
    });
    
    // If no news items, display message
    if (limitedNews.length === 0) {
        newsContainer.innerHTML = '<div class="no-news">No recent news available for this stock.</div>';
    }
}
