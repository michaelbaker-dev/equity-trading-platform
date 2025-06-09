// Mini chart component for watchlist items
// Displays a small SVG chart showing price trend

import React, { useMemo } from 'react';
import { useCandleData } from '../../hooks/useStockData';

interface MiniChartProps {
  symbol: string;
  width?: number;
  height?: number;
}

export const MiniChart: React.FC<MiniChartProps> = ({ 
  symbol, 
  width = 60, 
  height = 30 
}) => {
  const { data: candleData, isLoading } = useCandleData(symbol, '1D');

  const chartPath = useMemo(() => {
    if (!candleData || !(candleData as any).c || (candleData as any).c.length === 0) {
      // Return a flat line if no data
      return `M0,${height/2} L${width},${height/2}`;
    }

    const prices = (candleData as any).c;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    
    // If all prices are the same, draw a flat line
    if (priceRange === 0) {
      return `M0,${height/2} L${width},${height/2}`;
    }

    // Generate path data
    const stepX = width / (prices.length - 1);
    let path = '';

    prices.forEach((price: number, index: number) => {
      const x = index * stepX;
      const y = height - ((price - minPrice) / priceRange) * height;
      
      if (index === 0) {
        path += `M${x},${y}`;
      } else {
        path += ` L${x},${y}`;
      }
    });

    return path;
  }, [candleData, width, height]);

  const isPositiveTrend = useMemo(() => {
    if (!candleData || !(candleData as any).c || (candleData as any).c.length < 2) {
      return true; // Default to positive
    }
    
    const prices = (candleData as any).c;
    return prices[prices.length - 1] >= prices[0];
  }, [candleData]);

  if (isLoading) {
    return (
      <div className="mini-chart" style={{ width, height }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          fontSize: '10px',
          color: '#999'
        }}>
          ...
        </div>
      </div>
    );
  }

  return (
    <div className="mini-chart" style={{ width, height }}>
      <svg 
        className="mini-chart-svg" 
        width={width} 
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        <path
          className={`mini-chart-path ${isPositiveTrend ? 'positive' : 'negative'}`}
          d={chartPath}
          stroke={isPositiveTrend ? '#28a745' : '#dc3545'}
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};