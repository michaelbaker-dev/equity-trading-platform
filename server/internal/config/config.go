package config

import (
	"os"
)

type Config struct {
	Port           string
	Environment    string
	FinnhubAPIKey  string
	Redis          RedisConfig
}

type RedisConfig struct {
	URL      string
	Password string
	DB       int
	PoolSize int
}

func Load() *Config {
	return &Config{
		Port:          getEnv("PORT", "8080"),
		Environment:   getEnv("ENVIRONMENT", "development"),
		FinnhubAPIKey: getEnv("FINNHUB_API_KEY", "d0s5c1pr01qrmnclmaggd0s5c1pr01qrmnclmah0"),
		Redis: RedisConfig{
			URL:      getEnv("REDIS_URL", "localhost:6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       0,
			PoolSize: 10,
		},
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}