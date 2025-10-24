import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useStockStore } from '../stores/stockStore';

describe('WebSocket Integration Tests', () => {
  let mockWebSocket: any;
  
  beforeEach(() => {
    // Mock WebSocket
    mockWebSocket = {
      readyState: WebSocket.CONNECTING,
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onopen: null,
      onclose: null,
      onerror: null,
      onmessage: null
    };

    global.WebSocket = vi.fn(() => mockWebSocket) as any;
    
    // Mock console to reduce noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should connect to correct WebSocket URL in development', () => {
    // Mock dev environment
    vi.stubGlobal('import.meta.env.DEV', true);
    
    renderHook(() => useWebSocket(['AAPL']));

    // Should connect to backend directly
    expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:8080/api/v1/ws/stocks');
  });

  it('should subscribe to symbols after connection', async () => {
    const { result } = renderHook(() => useWebSocket(['AAPL', 'GOOGL']));

    // Simulate connection open
    mockWebSocket.readyState = WebSocket.OPEN;
    mockWebSocket.onopen?.({} as Event);

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Check subscriptions were sent
    expect(mockWebSocket.send).toHaveBeenCalledTimes(2);
    expect(mockWebSocket.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'subscribe', symbol: 'AAPL' })
    );
    expect(mockWebSocket.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'subscribe', symbol: 'GOOGL' })
    );
  });

  it('should update store when receiving price updates', async () => {
    renderHook(() => useWebSocket(['AAPL']));

    // Simulate connection and subscription
    mockWebSocket.readyState = WebSocket.OPEN;
    mockWebSocket.onopen?.({} as Event);

    // Simulate price update message
    const priceUpdate = {
      type: 'quote',
      data: {
        symbol: 'AAPL',
        c: 175.50,
        t: Date.now()
      }
    };

    mockWebSocket.onmessage?.({
      data: JSON.stringify(priceUpdate)
    } as MessageEvent);

    // Check store was updated
    await waitFor(() => {
      const price = useStockStore.getState().realTimePrices.AAPL;
      expect(price).toBe(175.50);
    });
  });

  it('should handle reconnection on unexpected disconnect', async () => {
    const { result } = renderHook(() => useWebSocket(['AAPL']));

    // Simulate connection
    mockWebSocket.readyState = WebSocket.OPEN;
    mockWebSocket.onopen?.({} as Event);

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Simulate unexpected disconnect
    mockWebSocket.onclose?.({
      code: 1006, // Abnormal closure
      reason: 'Connection lost'
    } as CloseEvent);

    // Should attempt reconnection
    await waitFor(() => {
      expect(global.WebSocket).toHaveBeenCalledTimes(2); // Initial + reconnect
    });
  });

  it('should handle subscribe and unsubscribe correctly', async () => {
    const { result } = renderHook(() => useWebSocket([]));

    // Simulate connection
    mockWebSocket.readyState = WebSocket.OPEN;
    mockWebSocket.onopen?.({} as Event);

    // Subscribe to a symbol
    result.current.subscribe('TSLA');

    await waitFor(() => {
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'subscribe', symbol: 'TSLA' })
      );
    });

    // Unsubscribe from the symbol
    result.current.unsubscribe('TSLA');

    await waitFor(() => {
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'unsubscribe', symbol: 'TSLA' })
      );
    });
  });

  it('should not send messages when WebSocket is not open', () => {
    const { result } = renderHook(() => useWebSocket(['AAPL']));

    // WebSocket is still connecting
    mockWebSocket.readyState = WebSocket.CONNECTING;

    // Try to subscribe
    result.current.subscribe('MSFT');

    // Should not send any messages
    expect(mockWebSocket.send).not.toHaveBeenCalled();
  });
});