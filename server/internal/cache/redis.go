package cache

import (
	"context"
	"time"

	"equity-server/internal/config"

	"github.com/go-redis/redis/v8"
)

// RedisCache implements Cache interface using Redis
type RedisCache struct {
	client *redis.Client
}

// NewRedisCache creates a new Redis cache client
func NewRedisCache(cfg config.RedisConfig) (*RedisCache, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     cfg.URL,
		Password: cfg.Password,
		DB:       cfg.DB,
		PoolSize: cfg.PoolSize,
	})

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, err
	}

	return &RedisCache{client: client}, nil
}

// Get retrieves a value from Redis
func (r *RedisCache) Get(ctx context.Context, key string) ([]byte, error) {
	val, err := r.client.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, ErrCacheMiss
		}
		return nil, &CacheError{Message: "redis get failed", Err: err}
	}
	return []byte(val), nil
}

// Set stores a value in Redis with expiration
func (r *RedisCache) Set(ctx context.Context, key string, value []byte, expiration time.Duration) error {
	err := r.client.SetEX(ctx, key, value, expiration).Err()
	if err != nil {
		return &CacheError{Message: "redis set failed", Err: err}
	}
	return nil
}

// Delete removes a value from Redis
func (r *RedisCache) Delete(ctx context.Context, key string) error {
	err := r.client.Del(ctx, key).Err()
	if err != nil {
		return &CacheError{Message: "redis delete failed", Err: err}
	}
	return nil
}

// Exists checks if a key exists in Redis
func (r *RedisCache) Exists(ctx context.Context, key string) (bool, error) {
	count, err := r.client.Exists(ctx, key).Result()
	if err != nil {
		return false, &CacheError{Message: "redis exists failed", Err: err}
	}
	return count > 0, nil
}

// Close closes the Redis connection
func (r *RedisCache) Close() error {
	return r.client.Close()
}