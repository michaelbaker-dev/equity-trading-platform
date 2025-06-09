// Error boundary component for handling React errors gracefully
// Provides fallback UI when components crash

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to console and external service
    console.error('🚨 React Error Boundary caught an error:', error);
    console.error('📋 Error Info:', errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // TODO: Send error to monitoring service (e.g., Sentry)
    // if (window.gtag) {
    //   window.gtag('event', 'exception', {
    //     description: error.toString(),
    //     fatal: false
    //   });
    // }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f8f9fa'
        }}>
          <div style={{
            maxWidth: '600px',
            padding: '30px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
            
            <h1 style={{ 
              color: '#dc3545', 
              marginBottom: '15px',
              fontSize: '24px'
            }}>
              Something went wrong
            </h1>
            
            <p style={{ 
              color: '#666', 
              marginBottom: '25px',
              lineHeight: '1.5'
            }}>
              The Equity Trading Platform encountered an unexpected error. 
              This might be a temporary issue.
            </p>

            <div style={{ 
              display: 'flex', 
              gap: '15px', 
              justifyContent: 'center',
              marginBottom: '25px'
            }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Try Again
              </button>
              
              <button
                onClick={this.handleReload}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Reload Page
              </button>
            </div>

            {/* Error details in development */}
            {import.meta.env.DEV && this.state.error && (
              <details style={{ 
                textAlign: 'left', 
                backgroundColor: '#f8f9fa', 
                padding: '15px', 
                borderRadius: '5px',
                marginTop: '20px'
              }}>
                <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>
                  Error Details (Development)
                </summary>
                <pre style={{ 
                  fontSize: '12px', 
                  overflow: 'auto',
                  color: '#dc3545'
                }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}