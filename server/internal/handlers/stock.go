package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"equity-server/internal/cache"
	"equity-server/internal/clients"
	"equity-server/internal/models"

	"github.com/gin-gonic/gin"
)

// StockHandler handles stock-related HTTP requests
type StockHandler struct {
	finnhubClient *clients.FinnhubClient
	cache         cache.Cache
}

// NewStockHandler creates a new stock handler
func NewStockHandler(finnhubClient *clients.FinnhubClient, cache cache.Cache) *StockHandler {
	return &StockHandler{
		finnhubClient: finnhubClient,
		cache:         cache,
	}
}

// GetQuote handles GET /api/v1/stocks/quote/:symbol
func (h *StockHandler) GetQuote(c *gin.Context) {
	symbol := strings.ToUpper(c.Param("symbol"))
	if symbol == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_symbol",
			Message: "Symbol is required",
			Code:    http.StatusBadRequest,
		})
		return
	}

	quote, err := h.finnhubClient.GetQuote(c.Request.Context(), symbol)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "fetch_failed",
			Message: "Failed to fetch quote: " + err.Error(),
			Code:    http.StatusInternalServerError,
		})
		return
	}

	c.Header("Cache-Control", "public, max-age=60")
	c.JSON(http.StatusOK, quote)
}

// GetBatchQuotes handles GET /api/v1/stocks/quotes/batch?symbols=AAPL,MSFT,GOOGL
func (h *StockHandler) GetBatchQuotes(c *gin.Context) {
	symbolsParam := c.Query("symbols")
	if symbolsParam == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "missing_symbols",
			Message: "symbols parameter is required",
			Code:    http.StatusBadRequest,
		})
		return
	}

	symbols := strings.Split(strings.ToUpper(symbolsParam), ",")
	if len(symbols) > 50 {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "too_many_symbols",
			Message: "Maximum 50 symbols allowed",
			Code:    http.StatusBadRequest,
		})
		return
	}

	quotes := make(map[string]*models.Quote)
	var wg sync.WaitGroup
	var mutex sync.Mutex
	errorChan := make(chan error, len(symbols))

	// Concurrent fetching with limited goroutines
	semaphore := make(chan struct{}, 5)

	for _, symbol := range symbols {
		symbol = strings.TrimSpace(symbol)
		if symbol == "" {
			continue
		}

		wg.Add(1)
		go func(sym string) {
			defer wg.Done()
			semaphore <- struct{}{}
			defer func() { <-semaphore }()

			quote, err := h.finnhubClient.GetQuote(c.Request.Context(), sym)
			if err != nil {
				errorChan <- err
				return
			}

			mutex.Lock()
			quotes[sym] = quote
			mutex.Unlock()
		}(symbol)
	}

	wg.Wait()
	close(errorChan)

	// Check for errors (non-blocking)
	select {
	case err := <-errorChan:
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Error:   "fetch_failed",
				Message: "Failed to fetch some quotes: " + err.Error(),
				Code:    http.StatusInternalServerError,
			})
			return
		}
	default:
	}

	c.Header("Cache-Control", "public, max-age=60")
	c.JSON(http.StatusOK, quotes)
}

// GetCandles handles GET /api/v1/stocks/:symbol/candles
func (h *StockHandler) GetCandles(c *gin.Context) {
	symbol := strings.ToUpper(c.Param("symbol"))
	resolution := c.DefaultQuery("resolution", "D")
	fromStr := c.Query("from")
	toStr := c.Query("to")

	var from, to int64
	var err error

	if fromStr != "" {
		from, err = strconv.ParseInt(fromStr, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{
				Error:   "invalid_from",
				Message: "Invalid from timestamp",
				Code:    http.StatusBadRequest,
			})
			return
		}
	} else {
		from = time.Now().AddDate(0, -1, 0).Unix() // Default to 1 month ago
	}

	if toStr != "" {
		to, err = strconv.ParseInt(toStr, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{
				Error:   "invalid_to",
				Message: "Invalid to timestamp",
				Code:    http.StatusBadRequest,
			})
			return
		}
	} else {
		to = time.Now().Unix()
	}

	candles, err := h.finnhubClient.GetCandles(c.Request.Context(), symbol, resolution, from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "fetch_failed",
			Message: "Failed to fetch candles: " + err.Error(),
			Code:    http.StatusInternalServerError,
		})
		return
	}

	c.Header("Cache-Control", "public, max-age=300")
	c.JSON(http.StatusOK, candles)
}

// GetProfile handles GET /api/v1/stocks/:symbol/profile
func (h *StockHandler) GetProfile(c *gin.Context) {
	symbol := strings.ToUpper(c.Param("symbol"))
	if symbol == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_symbol",
			Message: "Symbol is required",
			Code:    http.StatusBadRequest,
		})
		return
	}

	profile, err := h.finnhubClient.GetProfile(c.Request.Context(), symbol)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "fetch_failed",
			Message: "Failed to fetch profile: " + err.Error(),
			Code:    http.StatusInternalServerError,
		})
		return
	}

	c.Header("Cache-Control", "public, max-age=86400") // 24 hours
	c.JSON(http.StatusOK, profile)
}

// GetNews handles GET /api/v1/stocks/:symbol/news
func (h *StockHandler) GetNews(c *gin.Context) {
	symbol := strings.ToUpper(c.Param("symbol"))
	from := c.DefaultQuery("from", time.Now().AddDate(0, 0, -7).Format("2006-01-02"))
	to := c.DefaultQuery("to", time.Now().Format("2006-01-02"))

	news, err := h.finnhubClient.GetNews(c.Request.Context(), symbol, from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "fetch_failed",
			Message: "Failed to fetch news: " + err.Error(),
			Code:    http.StatusInternalServerError,
		})
		return
	}

	c.Header("Cache-Control", "public, max-age=900") // 15 minutes
	c.JSON(http.StatusOK, news)
}

// GetOrderBook handles GET /api/v1/stocks/:symbol/orderbook
func (h *StockHandler) GetOrderBook(c *gin.Context) {
	symbol := strings.ToUpper(c.Param("symbol"))
	if symbol == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_symbol",
			Message: "Symbol is required",
			Code:    http.StatusBadRequest,
		})
		return
	}

	orderBook, err := h.finnhubClient.GetOrderBook(c.Request.Context(), symbol)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "fetch_failed",
			Message: "Failed to fetch order book: " + err.Error(),
			Code:    http.StatusInternalServerError,
		})
		return
	}

	c.Header("Cache-Control", "public, max-age=5") // 5 seconds
	c.JSON(http.StatusOK, orderBook)
}

// SearchStocks handles GET /api/v1/search/stocks
func (h *StockHandler) SearchStocks(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "missing_query",
			Message: "Query parameter 'q' is required",
			Code:    http.StatusBadRequest,
		})
		return
	}

	results, err := h.finnhubClient.SearchSymbols(c.Request.Context(), query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "search_failed",
			Message: "Failed to search stocks: " + err.Error(),
			Code:    http.StatusInternalServerError,
		})
		return
	}

	c.Header("Cache-Control", "public, max-age=3600") // 1 hour
	c.JSON(http.StatusOK, results)
}

// GetMarketStatus handles GET /api/v1/market/status
func (h *StockHandler) GetMarketStatus(c *gin.Context) {
	// Mock market status - in production this would call a real API
	status := models.MarketStatus{
		Exchange:  "US",
		Holiday:   "",
		IsOpen:    isMarketOpen(),
		Session:   getMarketSession(),
		Timezone:  "America/New_York",
		Timestamp: time.Now().Unix(),
	}

	c.Header("Cache-Control", "public, max-age=300") // 5 minutes
	c.JSON(http.StatusOK, status)
}

// Helper functions
func isMarketOpen() bool {
	now := time.Now()
	// Simple check: market is open weekdays 9:30 AM - 4:00 PM ET
	if now.Weekday() == time.Saturday || now.Weekday() == time.Sunday {
		return false
	}

	// Convert to ET (simplified - doesn't handle DST)
	hour := now.Hour()
	return hour >= 9 && hour < 16
}

func getMarketSession() string {
	now := time.Now()
	hour := now.Hour()

	if hour < 4 {
		return "closed"
	} else if hour < 9 {
		return "pre-market"
	} else if hour < 16 {
		return "market"
	} else if hour < 20 {
		return "after-hours"
	} else {
		return "closed"
	}
}