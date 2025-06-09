package models

import "time"

// Quote represents a stock quote
type Quote struct {
	Symbol           string    `json:"symbol"`
	CurrentPrice     float64   `json:"c"`
	Change           float64   `json:"d"`
	PercentChange    float64   `json:"dp"`
	High             float64   `json:"h"`
	Low              float64   `json:"l"`
	Open             float64   `json:"o"`
	PreviousClose    float64   `json:"pc"`
	Timestamp        time.Time `json:"timestamp"`
}

// CandleData represents candlestick data
type CandleData struct {
	Symbol     string    `json:"symbol"`
	Close      []float64 `json:"c"`
	High       []float64 `json:"h"`
	Low        []float64 `json:"l"`
	Open       []float64 `json:"o"`
	Volume     []int64   `json:"v"`
	Timestamps []int64   `json:"t"`
	Status     string    `json:"s"`
}

// CompanyProfile represents company information
type CompanyProfile struct {
	Symbol                string  `json:"symbol"`
	Name                  string  `json:"name"`
	Exchange              string  `json:"exchange"`
	Industry              string  `json:"finnhubIndustry"`
	MarketCapitalization  float64 `json:"marketCapitalization"`
	ShareOutstanding      float64 `json:"shareOutstanding"`
	Logo                  string  `json:"logo"`
	WebURL                string  `json:"weburl"`
}

// NewsItem represents a news article
type NewsItem struct {
	ID       string    `json:"id"`
	Headline string    `json:"headline"`
	Summary  string    `json:"summary"`
	Source   string    `json:"source"`
	URL      string    `json:"url"`
	Image    string    `json:"image"`
	DateTime time.Time `json:"datetime"`
	Symbol   string    `json:"symbol"`
}

// OrderBook represents order book data
type OrderBook struct {
	Symbol string       `json:"symbol"`
	Bids   []PriceLevel `json:"bids"`
	Asks   []PriceLevel `json:"asks"`
}

// PriceLevel represents a price level in the order book
type PriceLevel struct {
	Price  float64 `json:"price"`
	Volume int64   `json:"volume"`
}

// SearchResult represents a search result
type SearchResult struct {
	Symbol      string `json:"symbol"`
	Description string `json:"description"`
	Type        string `json:"type"`
}

// MarketStatus represents market status information
type MarketStatus struct {
	Exchange   string `json:"exchange"`
	Holiday    string `json:"holiday"`
	IsOpen     bool   `json:"isOpen"`
	Session    string `json:"session"`
	Timezone   string `json:"timezone"`
	Timestamp  int64  `json:"t"`
}

// WebSocketMessage represents a WebSocket message
type WebSocketMessage struct {
	Type      string      `json:"type"`
	Symbol    string      `json:"symbol,omitempty"`
	Data      interface{} `json:"data"`
	Timestamp time.Time   `json:"timestamp"`
}

// SubscriptionMessage represents a subscription request
type SubscriptionMessage struct {
	Type   string `json:"type"`
	Symbol string `json:"symbol"`
}

// ErrorResponse represents an API error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
	Code    int    `json:"code"`
}