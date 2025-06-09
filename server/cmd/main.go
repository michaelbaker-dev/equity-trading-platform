package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"equity-server/internal/cache"
	"equity-server/internal/clients"
	"equity-server/internal/config"
	"equity-server/internal/handlers"
	"equity-server/internal/hub"
	"equity-server/internal/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Load configuration
	cfg := config.Load()

	// Initialize cache
	var cacheClient cache.Cache
	redisCache, err := cache.NewRedisCache(cfg.Redis)
	if err != nil {
		log.Printf("Failed to connect to Redis, using in-memory cache: %v", err)
		cacheClient = cache.NewMemoryCache()
	} else {
		cacheClient = redisCache
	}

	// Initialize Finnhub client
	finnhubClient := clients.NewFinnhubClient(cfg.FinnhubAPIKey, cacheClient)

	// Initialize WebSocket hub
	wsHub := hub.NewHub(finnhubClient, cacheClient)
	go wsHub.Run()

	// Setup Gin router
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	
	router := gin.New()
	router.Use(gin.Logger())
	router.Use(gin.Recovery())

	// CORS middleware
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = []string{"http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8080", "http://127.0.0.1:8080"}
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	corsConfig.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	corsConfig.AllowCredentials = true
	router.Use(cors.New(corsConfig))

	// Rate limiting middleware
	rateLimiter := middleware.NewRateLimiter(100, time.Minute) // 100 requests per minute
	router.Use(rateLimiter.Middleware())

	// Initialize handlers
	stockHandler := handlers.NewStockHandler(finnhubClient, cacheClient)
	wsHandler := handlers.NewWebSocketHandler(wsHub)

	// API routes
	api := router.Group("/api/v1")
	{
		// Stock endpoints
		stocks := api.Group("/stocks")
		{
			stocks.GET("/quote/:symbol", stockHandler.GetQuote)
			stocks.GET("/quotes/batch", stockHandler.GetBatchQuotes)
			stocks.GET("/:symbol/candles", stockHandler.GetCandles)
			stocks.GET("/:symbol/profile", stockHandler.GetProfile)
			stocks.GET("/:symbol/news", stockHandler.GetNews)
			stocks.GET("/:symbol/orderbook", stockHandler.GetOrderBook)
		}

		// Search endpoint
		api.GET("/search/stocks", stockHandler.SearchStocks)

		// Market endpoints
		market := api.Group("/market")
		{
			market.GET("/status", stockHandler.GetMarketStatus)
		}

		// WebSocket endpoint
		api.GET("/ws/stocks", wsHandler.HandleWebSocket)
	}

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "healthy",
			"timestamp": time.Now(),
		})
	})

	// Serve static files for frontend
	router.Static("/js", "./static/js")
	router.StaticFile("/styles.css", "./static/styles.css")
	router.StaticFile("/", "./static/index.html")
	
	// Fallback for SPA routing
	router.NoRoute(func(c *gin.Context) {
		c.File("./static/index.html")
	})

	// Create HTTP server
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Server starting on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Graceful shutdown with 30-second timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Shutdown WebSocket hub
	wsHub.Shutdown()

	// Shutdown HTTP server
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}