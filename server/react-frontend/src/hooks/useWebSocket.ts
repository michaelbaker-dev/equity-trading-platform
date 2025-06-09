// WebSocket hook for real-time data updates
// Maintains connection to Go backend WebSocket endpoint

import { useEffect, useRef, useCallback, useState } from 'react';
import { stockAPI } from '../services/api';
import { useStockStore } from '../stores/stockStore';
import type { WebSocketMessage } from '../types';

interface UseWebSocketOptions {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  enabled?: boolean;
}

export const useWebSocket = (
  symbols: string[], 
  options: UseWebSocketOptions = {}
) => {
  const {
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    enabled = true
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reconnectAttemptsRef = useRef(0);
  const subscribedSymbolsRef = useRef<Set<string>>(new Set());
  const lastConnectionAttemptRef = useRef(0);
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const { updateRealTimePrice } = useStockStore();

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      console.log(`📤 WebSocket sent:`, message);
    } else {
      console.warn('⚠️  WebSocket not ready, cannot send message:', message);
    }
  }, []);

  const subscribe = useCallback((symbol: string) => {
    if (!subscribedSymbolsRef.current.has(symbol)) {
      subscribedSymbolsRef.current.add(symbol);
      sendMessage({
        type: 'subscribe',
        symbol: symbol
      });
      console.log(`🔔 Subscribed to ${symbol}`);
    }
  }, [sendMessage]);

  const unsubscribe = useCallback((symbol: string) => {
    if (subscribedSymbolsRef.current.has(symbol)) {
      subscribedSymbolsRef.current.delete(symbol);
      sendMessage({
        type: 'unsubscribe',
        symbol: symbol
      });
      console.log(`🔕 Unsubscribed from ${symbol}`);
    }
  }, [sendMessage]);

  const connect = useCallback(() => {
    if (!enabled || isConnecting || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Throttle connection attempts (minimum 2 seconds between attempts)
    const now = Date.now();
    if (now - lastConnectionAttemptRef.current < 2000) {
      console.log('⏳ Throttling WebSocket connection attempt');
      return;
    }
    lastConnectionAttemptRef.current = now;

    setIsConnecting(true);
    setLastError(null);

    try {
      const wsUrl = stockAPI.getWebSocketUrl();
      console.log(`🔌 Main app connecting to WebSocket: ${wsUrl}`);
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('✅ Main app WebSocket connected');
        setIsConnected(true);
        setIsConnecting(false);
        reconnectAttemptsRef.current = 0;
        
        // Subscribe to all current symbols
        symbols.forEach(symbol => subscribe(symbol));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log(`📥 WebSocket received:`, message);
          
          // Handle quote updates (real-time price data)
          if (message.type === 'quote' && message.data) {
            const { symbol, c: price } = message.data;
            if (symbol && typeof price === 'number') {
              updateRealTimePrice(symbol, price);
            }
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log(`🔌 Main app WebSocket disconnected: ${event.code} ${event.reason}`);
        setIsConnected(false);
        setIsConnecting(false);
        
        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`🔄 Main app attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setLastError('Maximum reconnection attempts reached');
          console.error('❌ Main app maximum reconnection attempts reached');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setLastError('WebSocket connection error');
        setIsConnecting(false);
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setLastError('Failed to create WebSocket connection');
      setIsConnecting(false);
    }
  }, [enabled, isConnecting, subscribe, maxReconnectAttempts, reconnectInterval, updateRealTimePrice]);

  // Connect on mount and when symbols change
  useEffect(() => {
    if (enabled && symbols.length > 0) {
      // Add a small delay to avoid rapid reconnections
      const timer = setTimeout(() => {
        connect();
      }, 100);
      
      return () => {
        clearTimeout(timer);
        cleanup();
      };
    }
    
    return cleanup;
  }, [enabled, symbols.length, connect]);

  // Subscribe/unsubscribe when symbols array changes
  useEffect(() => {
    if (!isConnected) return;

    const currentSubscribed = Array.from(subscribedSymbolsRef.current);
    const toUnsubscribe = currentSubscribed.filter(symbol => !symbols.includes(symbol));
    const toSubscribe = symbols.filter(symbol => !subscribedSymbolsRef.current.has(symbol));

    toUnsubscribe.forEach(unsubscribe);
    toSubscribe.forEach(subscribe);
  }, [symbols, isConnected, subscribe, unsubscribe]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    isConnected,
    isConnecting,
    lastError,
    subscribe,
    unsubscribe,
    reconnect: connect,
    disconnect: cleanup
  };
};