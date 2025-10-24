// Main App component with Supabase authentication
// Sets up React Query client, authentication, and renders the trading platform

// import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { WebSocketTest } from './components/debug/WebSocketTest';
// import { WebSocketDebug } from './components/debug/WebSocketDebug';
// import { AuthGuard } from './components/auth/AuthGuard';
// import { useWatchlistSync } from './hooks/useWatchlistSync';

// Import styles
import './styles/equity-trading.css';

// Create React Query client with configuration matching the existing app
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds - matches existing cache behavior
      gcTime: 5 * 60 * 1000, // 5 minutes (renamed from cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (like 404, 401)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Simple app component without complex auth flows for now
function SimpleApp() {
  return (
    <div className="App localStorage-mode">
      <div className="mode-indicator">
        <i className="fas fa-info-circle"></i>
        <span>Running in offline mode - using local storage</span>
      </div>
      <AppLayout />
      {/* Debug WebSocket connection - controlled by startup script */}
      {import.meta.env.DEV && import.meta.env.VITE_SHOW_DEBUG_WINDOW === 'true' && <WebSocketTest />}
      {/* WebSocket Debug Panel - uncomment to debug WebSocket issues */}
      {/* {import.meta.env.DEV && <WebSocketDebug />} */}
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <SimpleApp />
        
        {/* React Query DevTools - only in development */}
        {import.meta.env.DEV && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;