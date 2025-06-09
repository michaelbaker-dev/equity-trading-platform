// Lightweight API client for the Go server
class EquityAPIClient {
    constructor(baseURL = '/api/v1') {
        this.baseURL = baseURL;
        this.cache = new Map();
        this.ws = null;
        this.subscriptions = new Set();
        this.messageHandlers = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.debugMode = false; // Can be enabled for verbose logging
        this.requestStats = {
            total: 0,
            successful: 0,
            failed: 0,
            retries: 0
        };
    }

    // Enable/disable debug mode
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`[API Debug] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    // Get API request statistics
    getStats() {
        return {
            ...this.requestStats,
            successRate: this.requestStats.total > 0 ? 
                ((this.requestStats.successful / this.requestStats.total) * 100).toFixed(2) + '%' : '0%',
            cacheSize: this.cache.size
        };
    }

    // Clear cache and reset stats
    reset() {
        this.cache.clear();
        this.requestStats = {
            total: 0,
            successful: 0,
            failed: 0,
            retries: 0
        };
        console.log('[API Debug] Cache and stats reset');
    }

    // Helper method for testing API connectivity
    async testConnection() {
        try {
            console.log('[API Test] Testing connection to server...');
            const startTime = performance.now();
            
            const response = await fetch(`${this.baseURL}/market/status`);
            const endTime = performance.now();
            
            const result = {
                success: response.ok,
                status: response.status,
                statusText: response.statusText,
                responseTime: Math.round(endTime - startTime),
                url: response.url,
                timestamp: new Date().toISOString()
            };
            
            if (response.ok) {
                const data = await response.json();
                result.data = data;
                console.log('[API Test] Connection successful:', result);
            } else {
                console.error('[API Test] Connection failed:', result);
            }
            
            return result;
        } catch (error) {
            const result = {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
            console.error('[API Test] Connection test failed:', result);
            return result;
        }
    }

    // REST API methods
    async getQuote(symbol) {
        try {
            const response = await fetch(`${this.baseURL}/stocks/quote/${symbol}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Failed to fetch quote for ${symbol}:`, error);
            throw error;
        }
    }

    async getBatchQuotes(symbols) {
        try {
            const symbolsParam = symbols.join(',');
            const response = await fetch(`${this.baseURL}/stocks/quotes/batch?symbols=${symbolsParam}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch batch quotes:', error);
            throw error;
        }
    }

    async getCandles(symbol, resolution = 'D', from, to, retryCount = 0) {
        const maxRetries = 3;
        const retryDelay = 1000; // 1 second base delay
        
        // Track request statistics
        if (retryCount === 0) {
            this.requestStats.total++;
        } else {
            this.requestStats.retries++;
        }
        
        try {
            // Input validation
            if (!symbol || typeof symbol !== 'string') {
                throw new Error('Symbol is required and must be a string');
            }
            
            // Validate resolution
            const validResolutions = ['1', '5', '15', '30', '60', 'D', 'W', 'M'];
            if (!validResolutions.includes(resolution)) {
                console.warn(`Invalid resolution '${resolution}'. Using default 'D'. Valid options: ${validResolutions.join(', ')}`);
                resolution = 'D';
            }
            
            // Validate date parameters if provided
            if (from && isNaN(Date.parse(from))) {
                throw new Error(`Invalid 'from' date: ${from}`);
            }
            if (to && isNaN(Date.parse(to))) {
                throw new Error(`Invalid 'to' date: ${to}`);
            }
            
            // Build parameters
            const params = new URLSearchParams({
                resolution,
                ...(from && { from }),
                ...(to && { to })
            });
            
            const url = `${this.baseURL}/stocks/${symbol}/candles?${params}`;
            
            // Log request details for debugging
            if (this.debugMode || retryCount > 0) {
                console.log(`[API Debug] Fetching candles for ${symbol}:`, {
                    url,
                    resolution,
                    from,
                    to,
                    retryAttempt: retryCount + 1,
                    stats: this.getStats()
                });
            }
            
            const startTime = performance.now();
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                // Add timeout to prevent hanging requests
                signal: AbortSignal.timeout(30000) // 30 second timeout
            });
            
            const endTime = performance.now();
            const requestDuration = Math.round(endTime - startTime);
            
            if (this.debugMode || !response.ok) {
                console.log(`[API Debug] Request completed in ${requestDuration}ms:`, {
                    status: response.status,
                    statusText: response.statusText,
                    url: response.url,
                    headers: Object.fromEntries(response.headers.entries())
                });
            }
            
            if (!response.ok) {
                // Try to get error details from response body
                let errorDetails = '';
                try {
                    const errorBody = await response.text();
                    if (errorBody) {
                        try {
                            const errorJson = JSON.parse(errorBody);
                            errorDetails = errorJson.error || errorJson.message || errorBody;
                        } catch {
                            errorDetails = errorBody;
                        }
                    }
                } catch (parseError) {
                    console.warn('Could not parse error response body:', parseError);
                }
                
                const errorMessage = `HTTP ${response.status}: ${response.statusText}${errorDetails ? ` - ${errorDetails}` : ''}`;
                
                // Log detailed error information
                console.error(`[API Error] Failed to fetch candles for ${symbol}:`, {
                    status: response.status,
                    statusText: response.statusText,
                    url: response.url,
                    errorDetails,
                    requestDuration: `${requestDuration}ms`,
                    retryAttempt: retryCount + 1
                });
                
                // Check if error is retryable (5xx server errors or network issues)
                const isRetryableError = response.status >= 500 || response.status === 429; // 429 = Too Many Requests
                
                if (isRetryableError && retryCount < maxRetries) {
                    const delay = retryDelay * Math.pow(2, retryCount); // Exponential backoff
                    console.log(`[API Retry] Retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
                    
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return this.getCandles(symbol, resolution, from, to, retryCount + 1);
                }
                
                throw new Error(errorMessage);
            }
            
            // Parse and validate response
            const responseText = await response.text();
            let data;
            
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('[API Error] Failed to parse JSON response:', {
                    error: parseError,
                    responseText: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''),
                    symbol,
                    url
                });
                throw new Error(`Invalid JSON response: ${parseError.message}`);
            }
            
            // Validate response structure
            if (!data || typeof data !== 'object') {
                console.error('[API Error] Invalid response structure:', {
                    data,
                    symbol,
                    url
                });
                throw new Error('Invalid response structure: expected object');
            }
            
            // Track successful request
            this.requestStats.successful++;
            
            // Log successful response details
            if (this.debugMode) {
                console.log(`[API Success] Candles fetched for ${symbol}:`, {
                    dataPoints: Array.isArray(data.candles) ? data.candles.length : 'unknown',
                    hasData: !!data.candles,
                    requestDuration: `${requestDuration}ms`,
                    symbol,
                    resolution,
                    stats: this.getStats()
                });
            }
            
            // Cache successful responses
            const cacheKey = `candles_${symbol}_${resolution}_${from || 'null'}_${to || 'null'}`;
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now(),
                ttl: 60000 // 1 minute cache
            });
            
            return data;
            
        } catch (error) {
            // Track failed request (only on first attempt)
            if (retryCount === 0) {
                this.requestStats.failed++;
            }
            
            // Enhanced error logging
            console.error(`[API Error] getCandles failed for ${symbol}:`, {
                error: error.message,
                stack: error.stack,
                symbol,
                resolution,
                from,
                to,
                retryAttempt: retryCount + 1,
                maxRetries,
                timestamp: new Date().toISOString(),
                stats: this.getStats()
            });
            
            // Check if we should retry on network errors
            if ((error.name === 'TypeError' || error.name === 'AbortError') && retryCount < maxRetries) {
                const delay = retryDelay * Math.pow(2, retryCount);
                console.log(`[API Retry] Network error, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.getCandles(symbol, resolution, from, to, retryCount + 1);
            }
            
            // Try to return cached data if available and error is not critical
            const cacheKey = `candles_${symbol}_${resolution}_${from || 'null'}_${to || 'null'}`;
            const cached = this.cache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < cached.ttl * 5) { // Allow stale cache during errors
                console.warn(`[API Fallback] Returning cached data for ${symbol} due to error`);
                return cached.data;
            }
            
            throw error;
        }
    }

    async getProfile(symbol) {
        try {
            const response = await fetch(`${this.baseURL}/stocks/${symbol}/profile`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Failed to fetch profile for ${symbol}:`, error);
            throw error;
        }
    }

    async getNews(symbol, from, to) {
        try {
            const params = new URLSearchParams({
                ...(from && { from }),
                ...(to && { to })
            });
            
            const response = await fetch(`${this.baseURL}/stocks/${symbol}/news?${params}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Failed to fetch news for ${symbol}:`, error);
            throw error;
        }
    }

    async getOrderBook(symbol) {
        try {
            const response = await fetch(`${this.baseURL}/stocks/${symbol}/orderbook`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Failed to fetch order book for ${symbol}:`, error);
            throw error;
        }
    }

    async searchStocks(query) {
        try {
            const response = await fetch(`${this.baseURL}/search/stocks?q=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Failed to search stocks for ${query}:`, error);
            throw error;
        }
    }

    async getMarketStatus() {
        try {
            const response = await fetch(`${this.baseURL}/market/status`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch market status:', error);
            throw error;
        }
    }

    // WebSocket methods
    connectWebSocket() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${location.host}/api/v1/ws/stocks`;
            
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.reconnectAttempts = 0;
                
                // Resubscribe to all symbols
                this.subscriptions.forEach(symbol => {
                    this.subscribeToSymbol(symbol);
                });
                
                resolve();
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleWebSocketMessage(message);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };
            
            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.handleReconnect();
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            };
        });
    }

    subscribeToSymbol(symbol) {
        this.subscriptions.add(symbol);
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'subscribe',
                symbol: symbol
            }));
        }
    }

    unsubscribeFromSymbol(symbol) {
        this.subscriptions.delete(symbol);
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'unsubscribe',
                symbol: symbol
            }));
        }
    }

    onQuoteUpdate(handler) {
        this.messageHandlers.set('quote', handler);
    }

    onWelcome(handler) {
        this.messageHandlers.set('welcome', handler);
    }

    handleWebSocketMessage(message) {
        const handler = this.messageHandlers.get(message.type);
        if (handler) {
            handler(message);
        }
    }

    async handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            
            console.log(`Reconnecting... Attempt ${this.reconnectAttempts} in ${delay}ms`);
            
            setTimeout(() => {
                this.connectWebSocket().catch(error => {
                    console.error('Reconnection failed:', error);
                });
            }, delay);
        } else {
            console.error('Max reconnection attempts reached');
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.subscriptions.clear();
        this.messageHandlers.clear();
    }
}

// Global API client instance
window.equityAPI = new EquityAPIClient();

/*
 * Enhanced API Client Debug Features:
 * 
 * To enable debug mode and see detailed request/response logs:
 *   window.equityAPI.setDebugMode(true);
 * 
 * To test server connectivity:
 *   window.equityAPI.testConnection();
 * 
 * To view API request statistics:
 *   window.equityAPI.getStats();
 * 
 * To reset cache and statistics:
 *   window.equityAPI.reset();
 * 
 * The getCandles method now includes:
 * - Input validation for symbol, resolution, and date parameters
 * - Automatic retry logic with exponential backoff for server errors
 * - Detailed request/response logging with performance metrics
 * - Request timeout protection (30 seconds)
 * - Response caching with TTL
 * - Fallback to cached data during errors
 * - Comprehensive error handling with detailed error context
 */