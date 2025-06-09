// Debug component to test WebSocket connection
import React, { useEffect, useState } from 'react';
import { stockAPI } from '../../services/api';

export const WebSocketTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [wsInstance, setWsInstance] = useState<WebSocket | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const [lastCloseCode, setLastCloseCode] = useState<number | null>(null);

  useEffect(() => {
    console.log('🧪 WebSocket Test Component - Starting connection test');
    
    const wsUrl = stockAPI.getWebSocketUrl();
    console.log('🔌 Connecting to:', wsUrl);
    
    try {
      const ws = new WebSocket(wsUrl);
      setWsInstance(ws);
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected in test component');
        setConnectionStatus('Connected');
        
        // Subscribe to a test symbol
        ws.send(JSON.stringify({
          type: 'subscribe',
          symbol: 'AAPL'
        }));
        console.log('📤 Sent test subscription');
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📥 Received in test component:', message);
          setLastMessage(message);
          setMessageCount(prev => prev + 1);
        } catch (error) {
          console.error('❌ Error parsing message:', error);
        }
      };
      
      ws.onclose = (event) => {
        console.log('🔌 WebSocket closed in test component:', event.code, event.reason);
        setConnectionStatus(`Disconnected (${event.code})`);
        setLastCloseCode(event.code);
      };
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error in test component:', error);
        setConnectionStatus(`Error: ${error.type || 'Unknown'}`);
      };
      
    } catch (error) {
      console.error('❌ Failed to create WebSocket in test component:', error);
      setConnectionStatus('Failed to create');
    }
    
    return () => {
      if (wsInstance) {
        wsInstance.close();
      }
    };
  }, []);

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'white', 
      border: '2px solid #ccc', 
      padding: '10px',
      borderRadius: '5px',
      zIndex: 9999,
      fontSize: '12px',
      maxWidth: '300px'
    }}>
      <h4>🧪 WebSocket Debug</h4>
      <div><strong>Status:</strong> {connectionStatus}</div>
      <div><strong>URL:</strong> {stockAPI.getWebSocketUrl()}</div>
      <div><strong>DEV Mode:</strong> {import.meta.env.DEV ? 'Yes' : 'No'}</div>
      <div><strong>Messages:</strong> {messageCount}</div>
      {lastCloseCode && <div><strong>Close Code:</strong> {lastCloseCode}</div>}
      {lastMessage && (
        <div>
          <strong>Last Message:</strong>
          <pre style={{ fontSize: '10px', marginTop: '5px' }}>
            {JSON.stringify(lastMessage, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};