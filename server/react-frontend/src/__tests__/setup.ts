// Test setup file
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock WebSocket for tests
class MockWebSocket {
  static instance: MockWebSocket;
  
  constructor(_url: string) {
    MockWebSocket.instance = this;
  }
  
  send = vi.fn();
  close = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
}

(globalThis as any).WebSocket = MockWebSocket as any;

// Mock window.location for API tests
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
    host: 'localhost:3000',
    protocol: 'http:'
  },
  writable: true,
});

console.log('🧪 Test environment setup complete');