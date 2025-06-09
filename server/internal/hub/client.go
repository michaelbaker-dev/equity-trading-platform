package hub

import (
	"encoding/json"
	"log"
	"time"

	"equity-server/internal/models"

	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer
	maxMessageSize = 512
)

// readPump pumps messages from the websocket connection to the hub
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		// Rate limiting check
		now := time.Now()
		if now.Sub(c.lastMessageTime) < 100*time.Millisecond {
			c.messageCount++
			if c.messageCount > 10 {
				log.Printf("Rate limit exceeded for client %s", c.id)
				continue
			}
		} else {
			c.messageCount = 0
			c.lastMessageTime = now
		}

		// Process message
		c.processMessage(message)
	}
}

// writePump pumps messages from the hub to the websocket connection
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued messages to the current websocket message
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// processMessage handles incoming messages from the client
func (c *Client) processMessage(message []byte) {
	var msg models.SubscriptionMessage
	if err := json.Unmarshal(message, &msg); err != nil {
		log.Printf("Error parsing message from client %s: %v", c.id, err)
		return
	}

	switch msg.Type {
	case "subscribe":
		if msg.Symbol != "" {
			c.hub.subscribeClientToSymbol(c, msg.Symbol)
		}

	case "unsubscribe":
		if msg.Symbol != "" {
			c.hub.unsubscribeClientFromSymbol(c, msg.Symbol)
		}

	case "ping":
		// Send pong response
		pongMsg := models.WebSocketMessage{
			Type:      "pong",
			Timestamp: time.Now(),
		}
		if data, err := json.Marshal(pongMsg); err == nil {
			select {
			case c.send <- data:
			default:
				// Channel is full, client might be slow
			}
		}

	default:
		log.Printf("Unknown message type '%s' from client %s", msg.Type, c.id)
	}
}