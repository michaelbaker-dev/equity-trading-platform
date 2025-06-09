// Stock news panel component
// Displays latest news for the selected stock using Finnhub API

import React from 'react';
import { useStockNews } from '../../hooks/useStockData';

interface StockNewsPanelProps {
  symbol: string;
}

export const StockNewsPanel: React.FC<StockNewsPanelProps> = ({ symbol }) => {
  const { data: news, isLoading, error } = useStockNews(symbol);

  if (isLoading) {
    return (
      <div className="news-container">
        <div className="news-header">
          <h3>Latest News - {symbol}</h3>
        </div>
        <div className="news-loading">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading latest news...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="news-container">
        <div className="news-header">
          <h3>Latest News - {symbol}</h3>
        </div>
        <div className="news-error">
          <i className="fas fa-exclamation-triangle"></i>
          <div className="news-error-message">Failed to load news</div>
          <div className="error-details">
            Please try again later or check your connection
          </div>
        </div>
      </div>
    );
  }

  if (!news || news.length === 0) {
    return (
      <div className="news-container">
        <div className="news-header">
          <h3>Latest News - {symbol}</h3>
        </div>
        <div className="news-empty">
          <i className="fas fa-newspaper"></i>
          <div>No recent news available for {symbol}</div>
          <div className="news-hint">
            Check back later for the latest updates
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="news-container">
      <div className="news-header">
        <h3>Latest News - {symbol}</h3>
        <div className="news-count">{news.length} articles</div>
      </div>
      
      <div className="news-list">
        {news.map((article, index) => (
          <div key={article.id || index} className="news-item-card">
            <div className="news-item-header">
              <div className="news-title">
                <a href={article.url} target="_blank" rel="noopener noreferrer">
                  {article.headline}
                </a>
              </div>
              <div className="news-meta">
                <span className="news-source">{article.source}</span>
                {article.datetime && (
                  <>
                    <span className="news-separator">•</span>
                    <span className="news-date">
                      {new Date(article.datetime).toLocaleDateString()}
                    </span>
                  </>
                )}
              </div>
            </div>
            
            {article.summary && (
              <div className="news-summary">
                {article.summary}
              </div>
            )}
            
            <div className="news-item-footer">
              <span className="news-symbol">{symbol}</span>
              <a 
                href={article.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="news-read-more"
              >
                Read more <i className="fas fa-external-link-alt"></i>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};