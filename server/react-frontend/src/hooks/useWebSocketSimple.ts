// Simplified WebSocket hook to fix connection issues
import { useEffect, useRef, useState } from 'react';
import { stockAPI } from '../services/api';
import { useStockStore } from '../stores/stockStore';
import type { WebSocketMessage } from '../types';

export const useWebSocketSimple = (symbols: string[]) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const { updateRealTimePrice } = useStockStore();

  useEffect(() => {
    // Only connect if we have symbols to subscribe to
    if (symbols.length === 0) return;

    const wsUrl = stockAPI.getWebSocketUrl();
    console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);
    
    // Create WebSocket connection
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    setIsConnecting(true);

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
      setIsConnecting(false);
      setLastError(null);
      
      // Subscribe to all symbols
      symbols.forEach(symbol => {
        const message: WebSocketMessage = {
          type: 'subscribe',
          symbol: symbol
        };
        ws.send(JSON.stringify(message));
        console.log(`🔔 Subscribed to ${symbol}`);
      });
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log(`📥 WebSocket received:`, message);
        
        // Handle quote updates
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

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setLastError('WebSocket connection error');
      setIsConnecting(false);
    };

    ws.onclose = (event) => {
      console.log(`🔌 WebSocket disconnected: ${event.code} ${event.reason}`);
      setIsConnected(false);
      setIsConnecting(false);
      
      // Don't show error for clean closes
      if (event.code !== 1000 && event.code !== 1001) {
        setLastError(`Connection closed: ${event.code}`);
      }
    };

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up WebSocket connection');
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [symbols.join(','), updateRealTimePrice]); // Use symbols.join to create stable dependency

  return {
    isConnected,
    isConnecting,
    lastError
  };
};