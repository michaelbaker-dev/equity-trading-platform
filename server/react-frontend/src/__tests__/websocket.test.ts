import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWebSocketSimple } from '../hooks/useWebSocketSimple';
import { useStockStore } from '../stores/stockStore';

// Mock the API client
vi.mock('../services/api', () => ({
  stockAPI: {
    getWebSocketUrl: () => 'ws://localhost:8080/api/v1/ws/stocks'
  }
}));

// Mock WebSocket
class MockWebSocket {
  url: string;
  readyState: number = WebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  
  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 10);
  }
  
  send(data: string) {
    console.log('MockWebSocket send:', data);
  }
  
  close() {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close', { code: 1000 }));
  }
}

describe('WebSocket Hook', () => {
  let mockWebSocket: MockWebSocket;
  
  beforeEach(() => {
    vi.clearAllMocks();
    global.WebSocket = MockWebSocket as any;
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  it('should connect to WebSocket when symbols are provided', async () => {
    const { result } = renderHook(() => 
      useWebSocketSimple(['AAPL', 'MSFT'])
    );
    
    // Initially connecting
    expect(result.current.isConnecting).toBe(true);
    expect(result.current.isConnected).toBe(false);
    
    // Wait for connection
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
      expect(result.current.isConnecting).toBe(false);
    });
  });
  
  it('should handle price updates', async () => {
    const { result } = renderHook(() => 
      useWebSocketSimple(['AAPL'])
    );
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
    
    // Get the WebSocket instance
    const ws = (global.WebSocket as any).mock?.instances?.[0];
    
    // Simulate price update
    const priceMessage = {
      type: 'quote',
      data: {
        symbol: 'AAPL',
        c: 150.25
      }
    };
    
    ws.onmessage?.(new MessageEvent('message', {
      data: JSON.stringify(priceMessage)
    }));
    
    // Check if price was updated in store
    const stockStore = useStockStore.getState();
    expect(stockStore.stocks.AAPL?.currentPrice).toBe(150.25);
  });
  
  it('should not connect when no symbols provided', () => {
    const { result } = renderHook(() => 
      useWebSocketSimple([])
    );
    
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.isConnected).toBe(false);
  });
});