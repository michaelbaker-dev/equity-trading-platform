package hub

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"equity-server/internal/cache"
	"equity-server/internal/clients"
	"equity-server/internal/models"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

// Hub manages WebSocket connections and data distribution
type Hub struct {
	// Registered clients
	clients map[*Client]bool

	// Register client requests
	register chan *Client

	// Unregister client requests
	unregister chan *Client

	// Symbol subscriptions - maps symbol to set of clients
	subscriptions map[string]map[*Client]bool

	// Finnhub client for data fetching
	finnhubClient *clients.FinnhubClient

	// Cache for data storage
	cache cache.Cache

	// Message buffer for throttling
	messageBuffer map[string]*models.Quote
	bufferMutex   sync.RWMutex

	// Control channels
	shutdown chan struct{}
	ctx      context.Context
	cancel   context.CancelFunc

	// Metrics
	metrics *HubMetrics
}

// Client represents a WebSocket client
type Client struct {
	// WebSocket connection
	conn *websocket.Conn

	// Buffered channel of outbound messages
	send chan []byte

	// Client subscriptions
	subscriptions map[string]bool

	// Hub reference
	hub *Hub

	// Client metadata
	id        string
	userAgent string
	ipAddress string

	// Rate limiting
	lastMessageTime time.Time
	messageCount    int
}

// HubMetrics tracks hub performance
type HubMetrics struct {
	ConnectedClients   int
	TotalSubscriptions int
	MessagesPerSecond  float64
	mutex              sync.RWMutex
}

// NewHub creates a new WebSocket hub
func NewHub(finnhubClient *clients.FinnhubClient, cache cache.Cache) *Hub {
	ctx, cancel := context.WithCancel(context.Background())
	
	return &Hub{
		clients:       make(map[*Client]bool),
		register:      make(chan *Client),
		unregister:    make(chan *Client),
		subscriptions: make(map[string]map[*Client]bool),
		finnhubClient: finnhubClient,
		cache:         cache,
		messageBuffer: make(map[string]*models.Quote),
		shutdown:      make(chan struct{}),
		ctx:           ctx,
		cancel:        cancel,
		metrics: &HubMetrics{
			ConnectedClients:   0,
			TotalSubscriptions: 0,
			MessagesPerSecond:  0,
		},
	}
}

// Run starts the hub
func (h *Hub) Run() {
	// Start message buffer flusher
	go h.flushMessageBuffer()

	// Start periodic quote updates
	go h.periodicQuoteUpdates()

	for {
		select {
		case client := <-h.register:
			h.registerClient(client)

		case client := <-h.unregister:
			h.unregisterClient(client)

		case <-h.shutdown:
			log.Println("Hub shutting down...")
			h.cancel()
			return

		case <-h.ctx.Done():
			return
		}
	}
}

// Shutdown gracefully shuts down the hub
func (h *Hub) Shutdown() {
	close(h.shutdown)
}

// HandleWebSocket handles WebSocket connections
func (h *Hub) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	client := &Client{
		conn:          conn,
		send:          make(chan []byte, 256),
		subscriptions: make(map[string]bool),
		hub:           h,
		id:            generateClientID(),
		userAgent:     r.Header.Get("User-Agent"),
		ipAddress:     r.RemoteAddr,
		lastMessageTime: time.Now(),
		messageCount:    0,
	}

	// Register client
	h.register <- client

	// Start client handlers
	go client.writePump()
	go client.readPump()
}

func (h *Hub) registerClient(client *Client) {
	h.clients[client] = true

	// Send welcome message
	welcomeMsg := models.WebSocketMessage{
		Type:      "welcome",
		Data:      map[string]interface{}{"clientId": client.id, "serverTime": time.Now()},
		Timestamp: time.Now(),
	}

	if data, err := json.Marshal(welcomeMsg); err == nil {
		select {
		case client.send <- data:
		default:
			close(client.send)
			delete(h.clients, client)
		}
	}

	h.metrics.mutex.Lock()
	h.metrics.ConnectedClients = len(h.clients)
	h.metrics.mutex.Unlock()

	log.Printf("Client %s connected. Total clients: %d", client.id, len(h.clients))
}

func (h *Hub) unregisterClient(client *Client) {
	if _, ok := h.clients[client]; ok {
		// Remove from all subscriptions
		for symbol := range client.subscriptions {
			h.unsubscribeClientFromSymbol(client, symbol)
		}

		delete(h.clients, client)
		close(client.send)

		h.metrics.mutex.Lock()
		h.metrics.ConnectedClients = len(h.clients)
		h.metrics.mutex.Unlock()

		log.Printf("Client %s disconnected. Total clients: %d", client.id, len(h.clients))
	}
}

func (h *Hub) subscribeClientToSymbol(client *Client, symbol string) {
	// Add client to symbol subscription
	if h.subscriptions[symbol] == nil {
		h.subscriptions[symbol] = make(map[*Client]bool)
	}

	h.subscriptions[symbol][client] = true
	client.subscriptions[symbol] = true

	h.metrics.mutex.Lock()
	h.metrics.TotalSubscriptions++
	h.metrics.mutex.Unlock()

	log.Printf("Client %s subscribed to %s", client.id, symbol)

	// Send current quote immediately
	go func() {
		if quote, err := h.finnhubClient.GetQuote(h.ctx, symbol); err == nil {
			h.bufferQuoteUpdate(symbol, quote)
		}
	}()
}

func (h *Hub) unsubscribeClientFromSymbol(client *Client, symbol string) {
	if subscribers, exists := h.subscriptions[symbol]; exists {
		if subscribers[client] {
			delete(subscribers, client)
			delete(client.subscriptions, symbol)

			// Remove subscription if no more clients
			if len(subscribers) == 0 {
				delete(h.subscriptions, symbol)
			}

			h.metrics.mutex.Lock()
			h.metrics.TotalSubscriptions--
			h.metrics.mutex.Unlock()

			log.Printf("Client %s unsubscribed from %s", client.id, symbol)
		}
	}
}

func (h *Hub) bufferQuoteUpdate(symbol string, quote *models.Quote) {
	h.bufferMutex.Lock()
	h.messageBuffer[symbol] = quote
	h.bufferMutex.Unlock()
}

// Flush message buffer every 500ms to throttle updates
func (h *Hub) flushMessageBuffer() {
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			h.flushBuffer()
		case <-h.ctx.Done():
			return
		}
	}
}

func (h *Hub) flushBuffer() {
	h.bufferMutex.Lock()
	updates := make(map[string]*models.Quote)
	for symbol, quote := range h.messageBuffer {
		updates[symbol] = quote
	}
	// Clear buffer
	h.messageBuffer = make(map[string]*models.Quote)
	h.bufferMutex.Unlock()

	// Send updates to subscribers
	for symbol, quote := range updates {
		if subscribers, exists := h.subscriptions[symbol]; exists && len(subscribers) > 0 {
			message := models.WebSocketMessage{
				Type:      "quote",
				Symbol:    symbol,
				Data:      quote,
				Timestamp: time.Now(),
			}

			if data, err := json.Marshal(message); err == nil {
				for client := range subscribers {
					select {
					case client.send <- data:
					default:
						// Client's send channel is full, disconnect them
						h.unregisterClient(client)
					}
				}
			}
		}
	}

	// Update metrics
	h.metrics.mutex.Lock()
	h.metrics.MessagesPerSecond = float64(len(updates)) / 0.5
	h.metrics.mutex.Unlock()
}

// Periodic quote updates for subscribed symbols
func (h *Hub) periodicQuoteUpdates() {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			// Get all subscribed symbols
			symbols := make([]string, 0)
			for symbol := range h.subscriptions {
				if len(h.subscriptions[symbol]) > 0 {
					symbols = append(symbols, symbol)
				}
			}

			// Fetch quotes for all symbols
			for _, symbol := range symbols {
				go func(sym string) {
					if quote, err := h.finnhubClient.GetQuote(h.ctx, sym); err == nil {
						h.bufferQuoteUpdate(sym, quote)
					}
				}(symbol)
			}

		case <-h.ctx.Done():
			return
		}
	}
}

func generateClientID() string {
	return time.Now().Format("20060102150405") + "-" + randomString(6)
}

func randomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	result := make([]byte, length)
	for i := range result {
		result[i] = charset[time.Now().UnixNano()%int64(len(charset))]
	}
	return string(result)
}