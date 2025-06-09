package clients

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"time"

	"equity-server/internal/cache"
	"equity-server/internal/models"

	"golang.org/x/time/rate"
)

// FinnhubClient handles communication with Finnhub API
type FinnhubClient struct {
	apiKey      string
	baseURL     string
	httpClient  *http.Client
	rateLimiter *rate.Limiter
	cache       cache.Cache
	mutex       sync.RWMutex
}

// NewFinnhubClient creates a new Finnhub API client
func NewFinnhubClient(apiKey string, cache cache.Cache) *FinnhubClient {
	return &FinnhubClient{
		apiKey:  apiKey,
		baseURL: "https://finnhub.io/api/v1",
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		// Finnhub allows 60 requests per minute for free tier
		rateLimiter: rate.NewLimiter(rate.Every(time.Minute/60), 10),
		cache:       cache,
	}
}

// GetQuote fetches a stock quote
func (c *FinnhubClient) GetQuote(ctx context.Context, symbol string) (*models.Quote, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("quote:%s", symbol)
	if cached, err := c.cache.Get(ctx, cacheKey); err == nil {
		var quote models.Quote
		if err := json.Unmarshal(cached, &quote); err == nil {
			return &quote, nil
		}
	}

	// Rate limiting
	if err := c.rateLimiter.Wait(ctx); err != nil {
		return nil, fmt.Errorf("rate limit exceeded: %w", err)
	}

	// Fetch from API
	url := fmt.Sprintf("%s/quote?symbol=%s&token=%s", c.baseURL, symbol, c.apiKey)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API request failed with status: %d", resp.StatusCode)
	}

	var quoteResp map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&quoteResp); err != nil {
		return nil, err
	}

	quote := &models.Quote{
		Symbol:        symbol,
		CurrentPrice:  getFloat64(quoteResp, "c"),
		Change:        getFloat64(quoteResp, "d"),
		PercentChange: getFloat64(quoteResp, "dp"),
		High:          getFloat64(quoteResp, "h"),
		Low:           getFloat64(quoteResp, "l"),
		Open:          getFloat64(quoteResp, "o"),
		PreviousClose: getFloat64(quoteResp, "pc"),
		Timestamp:     time.Now(),
	}

	// Cache the result
	if data, err := json.Marshal(quote); err == nil {
		c.cache.Set(ctx, cacheKey, data, cache.QuoteTTL)
	}

	return quote, nil
}

// GetCandles fetches candlestick data
func (c *FinnhubClient) GetCandles(ctx context.Context, symbol, resolution string, from, to int64) (*models.CandleData, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("candles:%s:%s:%d:%d", symbol, resolution, from, to)
	if cached, err := c.cache.Get(ctx, cacheKey); err == nil {
		var candles models.CandleData
		if err := json.Unmarshal(cached, &candles); err == nil {
			return &candles, nil
		}
	}

	// Rate limiting
	if err := c.rateLimiter.Wait(ctx); err != nil {
		return nil, fmt.Errorf("rate limit exceeded: %w", err)
	}

	// Fetch from API
	url := fmt.Sprintf("%s/stock/candle?symbol=%s&resolution=%s&from=%d&to=%d&token=%s",
		c.baseURL, symbol, resolution, from, to, c.apiKey)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var candleResp models.CandleData
	if err := json.NewDecoder(resp.Body).Decode(&candleResp); err != nil {
		return nil, err
	}

	candleResp.Symbol = symbol

	// Cache the result
	if data, err := json.Marshal(candleResp); err == nil {
		c.cache.Set(ctx, cacheKey, data, cache.CandleTTL)
	}

	return &candleResp, nil
}

// GetProfile fetches company profile
func (c *FinnhubClient) GetProfile(ctx context.Context, symbol string) (*models.CompanyProfile, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("profile:%s", symbol)
	if cached, err := c.cache.Get(ctx, cacheKey); err == nil {
		var profile models.CompanyProfile
		if err := json.Unmarshal(cached, &profile); err == nil {
			return &profile, nil
		}
	}

	// Rate limiting
	if err := c.rateLimiter.Wait(ctx); err != nil {
		return nil, fmt.Errorf("rate limit exceeded: %w", err)
	}

	// Fetch from API
	url := fmt.Sprintf("%s/stock/profile2?symbol=%s&token=%s", c.baseURL, symbol, c.apiKey)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var profile models.CompanyProfile
	if err := json.NewDecoder(resp.Body).Decode(&profile); err != nil {
		return nil, err
	}

	profile.Symbol = symbol

	// Cache the result
	if data, err := json.Marshal(profile); err == nil {
		c.cache.Set(ctx, cacheKey, data, cache.ProfileTTL)
	}

	return &profile, nil
}

// GetNews fetches company news
func (c *FinnhubClient) GetNews(ctx context.Context, symbol, from, to string) ([]models.NewsItem, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("news:%s:%s:%s", symbol, from, to)
	if cached, err := c.cache.Get(ctx, cacheKey); err == nil {
		var news []models.NewsItem
		if err := json.Unmarshal(cached, &news); err == nil {
			return news, nil
		}
	}

	// Rate limiting
	if err := c.rateLimiter.Wait(ctx); err != nil {
		return nil, fmt.Errorf("rate limit exceeded: %w", err)
	}

	// Fetch from API
	url := fmt.Sprintf("%s/company-news?symbol=%s&from=%s&to=%s&token=%s",
		c.baseURL, symbol, from, to, c.apiKey)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var newsResp []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&newsResp); err != nil {
		return nil, err
	}

	news := make([]models.NewsItem, 0, len(newsResp))
	for i, item := range newsResp {
		if i >= 10 { // Limit to 10 items
			break
		}

		newsItem := models.NewsItem{
			ID:       fmt.Sprintf("%s-%d", symbol, i),
			Headline: getString(item, "headline"),
			Summary:  getString(item, "summary"),
			Source:   getString(item, "source"),
			URL:      getString(item, "url"),
			Image:    getString(item, "image"),
			Symbol:   symbol,
		}

		// Parse datetime
		if dt := getFloat64(item, "datetime"); dt > 0 {
			newsItem.DateTime = time.Unix(int64(dt), 0)
		}

		news = append(news, newsItem)
	}

	// Cache the result
	if data, err := json.Marshal(news); err == nil {
		c.cache.Set(ctx, cacheKey, data, cache.NewsTTL)
	}

	return news, nil
}

// GetOrderBook fetches order book data (mock implementation)
func (c *FinnhubClient) GetOrderBook(ctx context.Context, symbol string) (*models.OrderBook, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("orderbook:%s", symbol)
	if cached, err := c.cache.Get(ctx, cacheKey); err == nil {
		var orderBook models.OrderBook
		if err := json.Unmarshal(cached, &orderBook); err == nil {
			return &orderBook, nil
		}
	}

	// Generate mock order book data since Finnhub doesn't provide this for free
	quote, err := c.GetQuote(ctx, symbol)
	if err != nil {
		return nil, err
	}

	orderBook := c.generateMockOrderBook(symbol, quote.CurrentPrice)

	// Cache the result
	if data, err := json.Marshal(orderBook); err == nil {
		c.cache.Set(ctx, cacheKey, data, cache.OrderBookTTL)
	}

	return orderBook, nil
}

// SearchSymbols searches for stock symbols
func (c *FinnhubClient) SearchSymbols(ctx context.Context, query string) ([]models.SearchResult, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("search:%s", query)
	if cached, err := c.cache.Get(ctx, cacheKey); err == nil {
		var results []models.SearchResult
		if err := json.Unmarshal(cached, &results); err == nil {
			return results, nil
		}
	}

	// Rate limiting
	if err := c.rateLimiter.Wait(ctx); err != nil {
		return nil, fmt.Errorf("rate limit exceeded: %w", err)
	}

	// Fetch from API
	url := fmt.Sprintf("%s/search?q=%s&token=%s", c.baseURL, query, c.apiKey)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var searchResp map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&searchResp); err != nil {
		return nil, err
	}

	results := make([]models.SearchResult, 0)
	if resultList, ok := searchResp["result"].([]interface{}); ok {
		for i, item := range resultList {
			if i >= 20 { // Limit to 20 results
				break
			}
			if itemMap, ok := item.(map[string]interface{}); ok {
				result := models.SearchResult{
					Symbol:      getString(itemMap, "symbol"),
					Description: getString(itemMap, "description"),
					Type:        getString(itemMap, "type"),
				}
				results = append(results, result)
			}
		}
	}

	// Cache the result
	if data, err := json.Marshal(results); err == nil {
		c.cache.Set(ctx, cacheKey, data, cache.SearchTTL)
	}

	return results, nil
}

// generateMockOrderBook creates realistic mock order book data with dynamic volumes
func (c *FinnhubClient) generateMockOrderBook(symbol string, basePrice float64) *models.OrderBook {
	bids := make([]models.PriceLevel, 10)
	asks := make([]models.PriceLevel, 10)

	// Use time and symbol for pseudo-randomness to create dynamic but deterministic data
	timeBasedSeed := time.Now().Unix() / 10 // Changes every 10 seconds
	symbolHash := int64(0)
	for _, char := range symbol {
		symbolHash += int64(char)
	}
	baseVariation := (timeBasedSeed + symbolHash) % 1000

	// Generate bids (lower prices) with realistic volumes
	for i := 0; i < 10; i++ {
		priceDelta := float64(i+1) * 0.01
		price := basePrice - priceDelta
		
		// Generate more realistic, dynamic volumes
		baseVolume := 50 + (i * 25) // Base volume increases with distance from current price
		volumeVariation := (baseVariation + int64(i*37)) % 500 // Pseudo-random variation
		volume := int64(baseVolume) + volumeVariation
		
		// Ensure volume is reasonable (50-2000 range)
		if volume < 50 {
			volume = 50
		}
		if volume > 2000 {
			volume = 2000
		}

		bids[i] = models.PriceLevel{
			Price:  price,
			Volume: volume,
		}
	}

	// Generate asks (higher prices) with realistic volumes
	for i := 0; i < 10; i++ {
		priceDelta := float64(i+1) * 0.01
		price := basePrice + priceDelta
		
		// Generate different volumes for asks vs bids
		baseVolume := 50 + (i * 30) // Slightly different pattern for asks
		volumeVariation := (baseVariation + int64(i*43)) % 600 // Different variation pattern
		volume := int64(baseVolume) + volumeVariation
		
		// Ensure volume is reasonable (50-2000 range)
		if volume < 50 {
			volume = 50
		}
		if volume > 2000 {
			volume = 2000
		}

		asks[i] = models.PriceLevel{
			Price:  price,
			Volume: volume,
		}
	}

	return &models.OrderBook{
		Symbol: symbol,
		Bids:   bids,
		Asks:   asks,
	}
}

// Helper functions
func getFloat64(data map[string]interface{}, key string) float64 {
	if val, ok := data[key]; ok {
		switch v := val.(type) {
		case float64:
			return v
		case string:
			if f, err := strconv.ParseFloat(v, 64); err == nil {
				return f
			}
		}
	}
	return 0
}

func getString(data map[string]interface{}, key string) string {
	if val, ok := data[key]; ok {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return ""
}