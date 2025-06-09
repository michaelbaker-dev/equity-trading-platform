package cache

import (
	"context"
	"sync"
	"time"
)

// MemoryCache implements Cache interface using in-memory storage
type MemoryCache struct {
	data  map[string]*cacheItem
	mutex sync.RWMutex
}

type cacheItem struct {
	value      []byte
	expiration time.Time
}

// NewMemoryCache creates a new in-memory cache
func NewMemoryCache() *MemoryCache {
	cache := &MemoryCache{
		data: make(map[string]*cacheItem),
	}
	
	// Start cleanup goroutine
	go cache.cleanup()
	
	return cache
}

// Get retrieves a value from memory cache
func (m *MemoryCache) Get(ctx context.Context, key string) ([]byte, error) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	item, exists := m.data[key]
	if !exists {
		return nil, ErrCacheMiss
	}

	// Check if expired
	if time.Now().After(item.expiration) {
		return nil, ErrCacheMiss
	}

	return item.value, nil
}

// Set stores a value in memory cache with expiration
func (m *MemoryCache) Set(ctx context.Context, key string, value []byte, expiration time.Duration) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	m.data[key] = &cacheItem{
		value:      value,
		expiration: time.Now().Add(expiration),
	}

	return nil
}

// Delete removes a value from memory cache
func (m *MemoryCache) Delete(ctx context.Context, key string) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	delete(m.data, key)
	return nil
}

// Exists checks if a key exists in memory cache
func (m *MemoryCache) Exists(ctx context.Context, key string) (bool, error) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	item, exists := m.data[key]
	if !exists {
		return false, nil
	}

	// Check if expired
	if time.Now().After(item.expiration) {
		return false, nil
	}

	return true, nil
}

// cleanup removes expired items from the cache
func (m *MemoryCache) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		m.mutex.Lock()
		now := time.Now()
		for key, item := range m.data {
			if now.After(item.expiration) {
				delete(m.data, key)
			}
		}
		m.mutex.Unlock()
	}
}