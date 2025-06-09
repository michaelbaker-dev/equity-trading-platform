package handlers

import (
	"equity-server/internal/hub"

	"github.com/gin-gonic/gin"
)

// WebSocketHandler handles WebSocket connections
type WebSocketHandler struct {
	hub *hub.Hub
}

// NewWebSocketHandler creates a new WebSocket handler
func NewWebSocketHandler(hub *hub.Hub) *WebSocketHandler {
	return &WebSocketHandler{
		hub: hub,
	}
}

// HandleWebSocket handles WebSocket upgrade requests
func (h *WebSocketHandler) HandleWebSocket(c *gin.Context) {
	// Convert Gin context to standard HTTP
	h.hub.HandleWebSocket(c.Writer, c.Request)
}