import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    TradingView: any;
  }
}

interface TradingViewChartProps {
  symbol: string;
  theme?: 'light' | 'dark';
  height?: number;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({ 
  symbol, 
  theme = 'dark',
  height = 400 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    let isCleanedUp = false;

    // Function to safely remove widget
    const removeWidget = () => {
      if (widgetRef.current) {
        try {
          // Check if the widget's container still exists in the DOM
          const widgetContainer = document.getElementById(`tradingview_${symbol}`);
          if (widgetContainer && widgetContainer.parentNode) {
            widgetRef.current.remove();
          }
        } catch (error) {
          // Silently catch any errors during cleanup
          console.debug('TradingView widget cleanup error:', error);
        }
        widgetRef.current = null;
      }
    };

    // Clean up previous widget if it exists
    removeWidget();

    // Only load script if TradingView is not already loaded
    if (!window.TradingView) {
      scriptRef.current = document.createElement('script');
      scriptRef.current.src = 'https://s3.tradingview.com/tv.js';
      scriptRef.current.async = true;
      scriptRef.current.onload = () => {
        if (!isCleanedUp && containerRef.current && window.TradingView) {
          createWidget();
        }
      };
      document.head.appendChild(scriptRef.current);
    } else {
      // TradingView already loaded, create widget immediately
      if (containerRef.current) {
        createWidget();
      }
    }

    function createWidget() {
      if (containerRef.current && !isCleanedUp) {
        // Create container div
        const containerId = `tradingview_${symbol}_${Date.now()}`;
        containerRef.current.innerHTML = `<div class="tradingview-widget-container__widget" id="${containerId}" style="height: ${height}px;"></div>`;
        
        try {
          widgetRef.current = new window.TradingView.widget({
            autosize: true,
            symbol: symbol,
            interval: 'D',
            timezone: 'Etc/UTC',
            theme: theme,
            style: '1',
            locale: 'en',
            toolbar_bg: '#f1f3f6',
            enable_publishing: false,
            allow_symbol_change: false,
            container_id: containerId,
            hide_top_toolbar: false,
            hide_legend: false,
            save_image: false,
            studies: [],
            show_popup_button: true,
            popup_width: '1000',
            popup_height: '650'
          });
        } catch (error) {
          console.error('Failed to create TradingView widget:', error);
        }
      }
    }

    // Cleanup
    return () => {
      isCleanedUp = true;
      removeWidget();
      
      // Clear the container
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, theme, height]);

  return (
    <div className="tradingview-widget-container" style={{ height: '100%', width: '100%' }}>
      <div ref={containerRef} style={{ height: 'calc(100% - 32px)' }}></div>
      <div className="tradingview-widget-copyright">
        <a href={`https://www.tradingview.com/symbols/${symbol}/`} rel="noopener noreferrer" target="_blank">
          <span className="blue-text">{symbol} chart</span> by TradingView
        </a>
      </div>
    </div>
  );
};