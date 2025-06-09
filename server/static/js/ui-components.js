// UI components and utility functions for the equity trading platform

// Initialize the watchlist
function initWatchlist() {
    const watchlistContainer = document.getElementById('watchlist');
    if (!watchlistContainer) return;
    
    // Clear existing items (keep the static ones for now)
    // In production, you'd replace all static items with dynamic ones
    
    // Add click event listeners to existing watchlist items
    const watchlistItems = document.querySelectorAll('.watchlist-item');
    watchlistItems.forEach((item, index) => {
        const symbol = item.querySelector('.stock-symbol')?.textContent;
        if (symbol && WATCHLIST_SYMBOLS.includes(symbol)) {
            item.addEventListener('click', function() {
                selectWatchlistItem(symbol, item);
            });
        }
    });
    
    // Mark the first item as selected by default
    const firstItem = watchlistContainer.querySelector('.watchlist-item');
    if (firstItem) {
        firstItem.classList.add('active');
    }
}

function selectWatchlistItem(symbol, item) {
    console.log('Selecting watchlist item:', symbol);
    
    // Update currently selected symbol
    currentlySelectedSymbol = symbol;
    
    // Update UI to show this is the selected stock
    document.querySelectorAll('.watchlist-item').forEach(i => {
        i.classList.remove('active');
    });
    item.classList.add('active');
    
    // Update stock detail panel
    updateStockDetailPanel(symbol);
    
    // Update order book
    updateOrderBook(symbol);
    
    // Subscribe to real-time updates for this symbol
    if (window.equityAPI && window.equityAPI.ws) {
        window.equityAPI.subscribeToSymbol(symbol);
    }
}

// Update time period UI
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

// Chart rendering functions
function updateChartWithData(data) {
    if (!data || !data.c || data.c.length === 0) {
        console.error('Invalid chart data received:', data);
        return;
    }
    
    // Calculate percentage changes from the first price
    const firstPrice = data.c[0];
    const percentChanges = data.c.map(price => ((price - firstPrice) / firstPrice) * 100);
    
    // Create SVG path for the chart
    const chartContainer = document.querySelector('.stock-chart');
    if (!chartContainer) return;
    
    const width = 600;
    const height = 300;
    
    // Find min and max percentage changes for scaling
    const minPercent = Math.min(...percentChanges);
    const maxPercent = Math.max(...percentChanges);
    const paddingPercent = (maxPercent - minPercent) * 0.1;
    const adjustedMinPercent = minPercent - paddingPercent;
    const adjustedMaxPercent = maxPercent + paddingPercent;
    const range = adjustedMaxPercent - adjustedMinPercent;
    
    // Create path data
    let pathData = '';
    let areaPathData = '';
    
    percentChanges.forEach((percent, index) => {
        const normalizedY = height - ((percent - adjustedMinPercent) / range) * height;
        const x = (index / (percentChanges.length - 1)) * width;
        
        if (index === 0) {
            pathData += `M${x},${normalizedY}`;
            areaPathData += `M${x},${height} L${x},${normalizedY}`;
        } else {
            pathData += ` L${x},${normalizedY}`;
            areaPathData += ` L${x},${normalizedY}`;
        }
    });
    
    // Complete the area path
    areaPathData += ` L${width},${height} L0,${height} Z`;
    
    // Update the SVG paths
    const chartPath = document.querySelector('.chart-path');
    const chartArea = document.querySelector('.chart-area');
    
    if (chartPath && chartArea) {
        const isPositive = percentChanges[percentChanges.length - 1] >= 0;
        const lineColor = isPositive ? '#28a745' : '#dc3545';
        const areaColor = isPositive ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)';
        
        chartPath.setAttribute('stroke', lineColor);
        chartPath.setAttribute('d', pathData);
        chartArea.setAttribute('d', areaPathData);
        chartArea.setAttribute('fill', areaColor);
        
        // Update chart container background
        chartContainer.style.backgroundColor = isPositive ? 'rgba(40, 167, 69, 0.05)' : 'rgba(220, 53, 69, 0.05)';
    }
    
    // Update y-axis labels
    updateYAxisLabels(adjustedMinPercent, adjustedMaxPercent);
    
    // Update x-axis labels with dates
    if (data.t && data.t.length > 0) {
        updateXAxisLabels(data.t);
    }
    
    // Update volume information
    if (data.v && data.v.length > 0) {
        const totalVolume = data.v.reduce((sum, vol) => sum + vol, 0);
        const volumeValueElement = document.querySelector('.volume-value');
        if (volumeValueElement) {
            volumeValueElement.textContent = `VOL ${totalVolume.toLocaleString()}`;
        }
    }
}

function updateYAxisLabels(minPercent, maxPercent) {
    const yAxisLabels = document.querySelectorAll('.y-axis-label');
    const range = maxPercent - minPercent;
    const percentStep = range / (yAxisLabels.length - 1);
    
    yAxisLabels.forEach((label, index) => {
        const percent = maxPercent - (index * percentStep);
        label.textContent = percent.toFixed(2) + '%';
    });
}

function updateXAxisLabels(timestamps) {
    if (!timestamps || timestamps.length === 0) return;
    
    const xAxisLabels = document.querySelectorAll('.x-axis-label');
    
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

// Order book UI updates with price change detection
function updateOrderBookUI(bids, asks) {
    const orderBookTable = document.getElementById('order-book');
    if (!orderBookTable) return;
    
    // Store previous order book data for comparison
    if (!window.previousOrderBookData) {
        window.previousOrderBookData = { bids: [], asks: [] };
    }
    
    // Clear existing rows
    orderBookTable.innerHTML = '';
    
    // Determine how many rows to display
    const rowCount = Math.min(Math.max(bids.length, asks.length), 10);
    
    for (let i = 0; i < rowCount; i++) {
        const bid = bids[i] || { price: '', volume: '' };
        const ask = asks[i] || { price: '', volume: '' };
        
        const orderRow = document.createElement('div');
        orderRow.className = 'order-row';
        
        // Check if bid/ask prices changed from previous data
        const prevBid = window.previousOrderBookData.bids[i] || { price: '', volume: '' };
        const prevAsk = window.previousOrderBookData.asks[i] || { price: '', volume: '' };
        
        const bidPriceChanged = prevBid.price !== bid.price;
        const askPriceChanged = prevAsk.price !== ask.price;
        const bidVolumeChanged = prevBid.volume !== bid.volume;
        const askVolumeChanged = prevAsk.volume !== ask.volume;
        
        orderRow.innerHTML = `
            <div class="bid-side">
                <div class="quantity ${bidVolumeChanged ? 'volume-changed' : ''}">${bid.volume || ''}</div>
                <div class="price ${bidPriceChanged ? 'price-changed-bid' : ''}">${bid.price ? parseFloat(bid.price).toFixed(3) : ''}</div>
                <div class="exchange">ARCA</div>
            </div>
            <div class="ask-side">
                <div class="exchange">ARCA</div>
                <div class="price ${askPriceChanged ? 'price-changed-ask' : ''}">${ask.price ? parseFloat(ask.price).toFixed(3) : ''}</div>
                <div class="quantity ${askVolumeChanged ? 'volume-changed' : ''}">${ask.volume || ''}</div>
            </div>
        `;
        
        orderBookTable.appendChild(orderRow);
        
        // Add flash effects for changed elements
        if (bidPriceChanged || bidVolumeChanged) {
            const bidSide = orderRow.querySelector('.bid-side');
            if (bidPriceChanged) {
                const bidPriceEl = bidSide.querySelector('.price');
                setTimeout(() => flashPriceElement(bidPriceEl, true), 10);
            }
            if (bidVolumeChanged) {
                const bidVolumeEl = bidSide.querySelector('.quantity');
                setTimeout(() => flashPriceElement(bidVolumeEl, true), 10);
            }
        }
        
        if (askPriceChanged || askVolumeChanged) {
            const askSide = orderRow.querySelector('.ask-side');
            if (askPriceChanged) {
                const askPriceEl = askSide.querySelector('.price');
                setTimeout(() => flashPriceElement(askPriceEl, false), 10);
            }
            if (askVolumeChanged) {
                const askVolumeEl = askSide.querySelector('.quantity');
                setTimeout(() => flashPriceElement(askVolumeEl, false), 10);
            }
        }
    }
    
    // Update bid/ask summary
    if (bids.length > 0 && asks.length > 0) {
        updateBidAskSummary(bids[0], asks[0]);
    }
    
    // Store current data for next comparison
    window.previousOrderBookData = { bids: [...bids], asks: [...asks] };
}

function updateBidAskSummary(bestBid, bestAsk) {
    const totalVolume = parseFloat(bestBid.volume) + parseFloat(bestAsk.volume);
    const bidPercentage = (parseFloat(bestBid.volume) / totalVolume * 100).toFixed(2);
    const askPercentage = (parseFloat(bestAsk.volume) / totalVolume * 100).toFixed(2);
    
    // Store previous values for comparison
    if (!window.previousBidAskSummary) {
        window.previousBidAskSummary = {
            bidPrice: '',
            bidVolume: '',
            bidPercentage: '',
            askPrice: '',
            askVolume: '',
            askPercentage: ''
        };
    }
    
    const prev = window.previousBidAskSummary;
    const newBidPrice = parseFloat(bestBid.price).toFixed(3);
    const newAskPrice = parseFloat(bestAsk.price).toFixed(3);
    
    // Update bid container
    const bidPercentageEl = document.querySelector('.bid-percentage');
    const bidPriceEl = document.querySelector('.bid-price');
    const bidQuantityEl = document.querySelector('.bid-quantity');
    
    if (bidPercentageEl) {
        const newValue = bidPercentage + '%';
        if (prev.bidPercentage !== newValue) {
            bidPercentageEl.textContent = newValue;
            flashPriceElement(bidPercentageEl, true);
        }
        prev.bidPercentage = newValue;
    }
    
    if (bidPriceEl) {
        if (prev.bidPrice !== newBidPrice) {
            bidPriceEl.textContent = newBidPrice;
            flashPriceElement(bidPriceEl, true);
        }
        prev.bidPrice = newBidPrice;
    }
    
    if (bidQuantityEl) {
        const newValue = bestBid.volume;
        if (prev.bidVolume !== newValue) {
            bidQuantityEl.textContent = newValue;
            flashPriceElement(bidQuantityEl, true);
        }
        prev.bidVolume = newValue;
    }
    
    // Update ask container
    const askPercentageEl = document.querySelector('.ask-percentage');
    const askPriceEl = document.querySelector('.ask-price');
    const askQuantityEl = document.querySelector('.ask-quantity');
    
    if (askPercentageEl) {
        const newValue = askPercentage + '%';
        if (prev.askPercentage !== newValue) {
            askPercentageEl.textContent = newValue;
            flashPriceElement(askPercentageEl, false);
        }
        prev.askPercentage = newValue;
    }
    
    if (askPriceEl) {
        if (prev.askPrice !== newAskPrice) {
            askPriceEl.textContent = newAskPrice;
            flashPriceElement(askPriceEl, false);
        }
        prev.askPrice = newAskPrice;
    }
    
    if (askQuantityEl) {
        const newValue = bestAsk.volume;
        if (prev.askVolume !== newValue) {
            askQuantityEl.textContent = newValue;
            flashPriceElement(askQuantityEl, false);
        }
        prev.askVolume = newValue;
    }
}

// Company profile UI updates
function updateCompanyProfileUI(profile) {
    // Update company name in stock title
    const companyNameElement = document.querySelector('.stock-title h3');
    if (companyNameElement && profile.name) {
        companyNameElement.textContent = profile.name;
    }
}

// News display functions
function displayCompanyNews(newsItems) {
    const newsContainer = document.querySelector('.news-container');
    if (!newsContainer) return;
    
    // Clear existing news
    newsContainer.innerHTML = `
        <div class="news-header">
            <h3>Latest News for <span class="news-symbol">${currentlySelectedSymbol}</span></h3>
        </div>
        <div class="news-list"></div>
    `;
    
    const newsList = newsContainer.querySelector('.news-list');
    
    if (!newsItems || newsItems.length === 0) {
        newsList.innerHTML = '<div class="no-news">No recent news available for this stock.</div>';
        return;
    }
    
    // Add news items
    newsItems.forEach(news => {
        const newsItem = document.createElement('div');
        newsItem.classList.add('news-item-card');
        
        // Format date
        const date = new Date(news.datetime);
        const formattedDate = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        newsItem.innerHTML = `
            <div class="news-item-header">
                <div class="news-source">${news.source || 'Unknown Source'}</div>
                <div class="news-date">${formattedDate}</div>
            </div>
            <div class="news-title">${news.headline || 'No headline available'}</div>
            <div class="news-summary">${news.summary || news.headline || 'No summary available'}</div>
        `;
        
        // Add click event to open news in new tab
        if (news.url) {
            newsItem.addEventListener('click', function() {
                window.open(news.url, '_blank');
            });
            newsItem.style.cursor = 'pointer';
        }
        
        newsList.appendChild(newsItem);
    });
}

// Panel resizing
function setEqualPanelWidths() {
    const panels = document.querySelectorAll('.watchlist-panel, .stock-detail-panel, .order-book-panel');
    panels.forEach(panel => {
        panel.style.flex = '1';
    });
}

// Initialize resizable panels
function initResizablePanels() {
    const leftHandle = document.getElementById('handle-left');
    const rightHandle = document.getElementById('handle-right');
    const watchlistPanel = document.querySelector('.watchlist-panel');
    const stockDetailPanel = document.querySelector('.stock-detail-panel');
    const orderBookPanel = document.querySelector('.order-book-panel');
    
    if (!leftHandle || !rightHandle || !watchlistPanel || !stockDetailPanel || !orderBookPanel) {
        console.log('Resize handles or panels not found');
        return;
    }
    
    let isResizing = false;
    let currentHandle = null;
    
    // Left handle resizing (between watchlist and stock detail)
    leftHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        currentHandle = 'left';
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        leftHandle.classList.add('active');
        e.preventDefault();
    });
    
    // Right handle resizing (between stock detail and order book)
    rightHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        currentHandle = 'right';
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        rightHandle.classList.add('active');
        e.preventDefault();
    });
    
    // Mouse move handler
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const containerRect = document.querySelector('.app-container').getBoundingClientRect();
        const mouseX = e.clientX - containerRect.left;
        const containerWidth = containerRect.width;
        
        if (currentHandle === 'left') {
            // Resize watchlist and stock detail panels
            const minWidth = 250; // Minimum panel width
            const maxWidth = containerWidth - 500; // Leave space for other panels
            
            const watchlistWidth = Math.max(minWidth, Math.min(maxWidth, mouseX));
            const watchlistPercent = (watchlistWidth / containerWidth) * 100;
            
            watchlistPanel.style.flex = `0 0 ${watchlistPercent}%`;
            
        } else if (currentHandle === 'right') {
            // Resize stock detail and order book panels
            const watchlistWidth = watchlistPanel.getBoundingClientRect().width;
            const availableWidth = containerWidth - watchlistWidth - 16; // 16px for handles
            const stockDetailWidth = mouseX - watchlistWidth - 8;
            
            const minWidth = 250;
            const maxStockDetailWidth = availableWidth - minWidth;
            
            const clampedStockDetailWidth = Math.max(minWidth, Math.min(maxStockDetailWidth, stockDetailWidth));
            const stockDetailPercent = (clampedStockDetailWidth / containerWidth) * 100;
            const remainingPercent = ((availableWidth - clampedStockDetailWidth) / containerWidth) * 100;
            
            stockDetailPanel.style.flex = `0 0 ${stockDetailPercent}%`;
            orderBookPanel.style.flex = `0 0 ${remainingPercent}%`;
        }
    });
    
    // Mouse up handler
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            currentHandle = null;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            leftHandle.classList.remove('active');
            rightHandle.classList.remove('active');
        }
    });
    
    console.log('Resizable panels initialized');
}

// Modal functionality
function initModal() {
    const modal = document.getElementById('add-stock-modal');
    const openBtn = document.getElementById('add-stock-btn');
    const closeBtn = document.querySelector('.close-modal');
    
    if (openBtn && modal) {
        openBtn.addEventListener('click', function() {
            modal.style.display = 'block';
        });
    }
    
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside
    if (modal) {
        window.addEventListener('click', function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
}

// Mock data generation (fallback when API fails)
function generateMockCandleData(symbol, period) {
    const dataPoints = period === '1D' ? 78 : period === '1W' ? 38 : 30;
    const basePrice = 100 + Math.random() * 400; // Random base price
    
    const closePrices = [];
    const openPrices = [];
    const highPrices = [];
    const lowPrices = [];
    const volumes = [];
    const timestamps = [];
    
    let currentPrice = basePrice;
    const now = new Date();
    
    for (let i = 0; i < dataPoints; i++) {
        const changePercent = (Math.random() * 4 - 2); // -2% to +2%
        const changeAmount = currentPrice * (changePercent / 100);
        
        const open = currentPrice;
        currentPrice += changeAmount;
        const close = currentPrice;
        
        const highExtra = Math.random() * Math.abs(changeAmount) * 0.5;
        const high = Math.max(open, close) + highExtra;
        
        const lowExtra = Math.random() * Math.abs(changeAmount) * 0.5;
        const low = Math.min(open, close) - lowExtra;
        
        const volume = Math.floor(Math.random() * 9900000) + 100000;
        
        openPrices.push(open);
        closePrices.push(close);
        highPrices.push(high);
        lowPrices.push(low);
        volumes.push(volume);
        
        // Calculate timestamp based on period
        const timeOffset = i * (period === '1D' ? 5 * 60 : period === '1W' ? 60 * 60 : 24 * 60 * 60);
        timestamps.push(Math.floor((now.getTime() - (dataPoints - i) * timeOffset * 1000) / 1000));
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

console.log('UI components loaded successfully');