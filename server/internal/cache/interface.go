package cache

import (
	"context"
	"time"
)

// Cache interface defines caching operations
type Cache interface {
	Get(ctx context.Context, key string) ([]byte, error)
	Set(ctx context.Context, key string, value []byte, expiration time.Duration) error
	Delete(ctx context.Context, key string) error
	Exists(ctx context.Context, key string) (bool, error)
}

// Common errors
var (
	ErrCacheMiss = &CacheError{Message: "cache miss"}
	ErrCacheSet  = &CacheError{Message: "failed to set cache"}
)

// CacheError represents a cache operation error
type CacheError struct {
	Message string
	Err     error
}

func (e *CacheError) Error() string {
	if e.Err != nil {
		return e.Message + ": " + e.Err.Error()
	}
	return e.Message
}

// Cache TTL constants
const (
	QuoteTTL     = 1 * time.Minute
	CandleTTL    = 5 * time.Minute
	ProfileTTL   = 24 * time.Hour
	NewsTTL      = 15 * time.Minute
	OrderBookTTL = 5 * time.Second
	SearchTTL    = 1 * time.Hour
)