import React, { useEffect, useState } from 'react';
import { useWebSocketSimple } from '../../hooks/useWebSocketSimple';
import { useWatchlistSymbols } from '../../stores/watchlistStore';
import { useStockStore } from '../../stores/stockStore';

export const WebSocketDebug: React.FC = () => {
  const symbols = useWatchlistSymbols();
  const { isConnected, isConnecting, lastError } = useWebSocketSimple(symbols);
  const stocks = useStockStore(state => state.stocks);
  const [updateCount, setUpdateCount] = useState(0);
  
  // Track price updates
  useEffect(() => {
    setUpdateCount(prev => prev + 1);
  }, [stocks]);
  
  return (
    <div style={{
      position: 'fixed',
      top: 10,
      right: 10,
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <h4 style={{ margin: '0 0 10px 0' }}>WebSocket Debug</h4>
      <div>Status: {isConnecting ? '🟡 Connecting' : isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
      {lastError && <div style={{ color: '#ff6666' }}>Error: {lastError}</div>}
      <div>Symbols: {symbols.join(', ')}</div>
      <div>Updates: {updateCount}</div>
      <hr style={{ margin: '10px 0' }} />
      <div>Prices:</div>
      {Object.entries(stocks).map(([symbol, data]) => (
        <div key={symbol} style={{ fontSize: '11px' }}>
          {symbol}: ${data.currentPrice?.toFixed(2) || 'N/A'}
        </div>
      ))}
    </div>
  );
};