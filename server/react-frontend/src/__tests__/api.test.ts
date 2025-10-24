import { describe, it, expect, beforeEach, vi } from 'vitest';
import { stockAPI } from '../services/api';

describe('API Service Tests', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });

  describe('WebSocket URL Generation', () => {
    it('should return direct backend URL in development', () => {
      // Mock development environment
      vi.stubGlobal('import.meta.env.DEV', true);
      
      const wsUrl = stockAPI.getWebSocketUrl();
      expect(wsUrl).toBe('ws://localhost:8080/api/v1/ws/stocks');
    });

    it('should return relative URL in production', () => {
      // Mock production environment
      vi.stubGlobal('import.meta.env.DEV', false);
      
      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: {
          protocol: 'http:',
          host: 'example.com',
          hostname: 'example.com',
          port: ''
        },
        writable: true
      });
      
      const wsUrl = stockAPI.getWebSocketUrl();
      expect(wsUrl).toBe('ws://example.com/api/v1/ws/stocks');
    });

    it('should use wss:// for https in production', () => {
      // Mock production environment with HTTPS
      vi.stubGlobal('import.meta.env.DEV', false);
      
      Object.defineProperty(window, 'location', {
        value: {
          protocol: 'https:',
          host: 'secure.example.com',
          hostname: 'secure.example.com',
          port: ''
        },
        writable: true
      });
      
      const wsUrl = stockAPI.getWebSocketUrl();
      expect(wsUrl).toBe('wss://secure.example.com/api/v1/ws/stocks');
    });
  });
});