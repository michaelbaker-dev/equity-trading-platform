// Stock detail panel component - middle panel of the trading interface
// Shows detailed stock information, charts, and news

import React from 'react';
import { useSelectedSymbol } from '../../stores/stockStore';
import { useStockQuote, useCompanyProfile } from '../../hooks/useStockData';
import { useActiveTab, useUIStore } from '../../stores/uiStore';
import { StockNewsPanel } from './StockNewsPanel';
import { TradingViewChart } from '../charts/TradingViewChart';
import { AIPanel } from '../ai/AIPanel';

export const StockDetailPanel: React.FC = () => {
  const selectedSymbol = useSelectedSymbol();
  const { data: quote, isLoading: quoteLoading } = useStockQuote(selectedSymbol || 'MSFT');
  const { data: profile, isLoading: profileLoading } = useCompanyProfile(selectedSymbol || 'MSFT');
  const activeTab = useActiveTab();
  const { setActiveTab } = useUIStore();
  
  // Type the quote data properly
  const quoteData = quote as any;
  const isLoading = quoteLoading || profileLoading;

  const handleTabClick = (tab: string) => {
    setActiveTab(tab as any);
  };

  return (
    <div className="stock-detail-panel">
      <div className="stock-detail-header">
        <div className="back-button">
          <i className="fas fa-chevron-left"></i>
        </div>
        <div className="stock-search">
          <i className="fas fa-search"></i>
        </div>
        <div className="stock-favorite">
          <i className="fas fa-heart"></i>
        </div>
      </div>
      
      {/* Show compact header for non-chart tabs */}
      {activeTab !== 'chart' ? (
        <div className="stock-info-compact">
          <div className="stock-title-compact">
            <h2>{selectedSymbol || 'MSFT'}</h2>
            <div className="stock-price-compact">
              {isLoading ? 'Loading...' : (quoteData?.c?.toFixed(2) || '---')}
              <span className={`change-compact ${quoteData?.d >= 0 ? 'positive' : 'negative'}`}>
                {isLoading ? '' : (
                  quoteData?.d && quoteData?.dp ? 
                    `${quoteData.d >= 0 ? '+' : ''}${quoteData.d.toFixed(2)} (${quoteData.dp >= 0 ? '+' : ''}${quoteData.dp.toFixed(2)}%)` : 
                    ''
                )}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="stock-info-container">
          <div className="stock-title">
            <h2>{selectedSymbol || 'MSFT'}</h2>
            <h3>
              {isLoading ? 'Loading...' : (profile?.name || `${selectedSymbol} Corporation`)}
            </h3>
          </div>
          
          <div className="stock-subtitle">
            <span>
              Prev. Close {isLoading ? 'Loading...' : new Date().toLocaleDateString()} ET
            </span>
            <div className="stock-exchange-icons">
              <span className="exchange-icon">{profile?.exchange || 'US'}</span>
              <span className="exchange-icon">{profile?.currency || 'USD'}</span>
              <span className="exchange-icon">{profile?.country || 'US'}</span>
            </div>
          </div>
          
          <div className="stock-price-container">
            <div className="current-price">
              {isLoading ? 'Loading...' : (quoteData?.c?.toFixed(2) || '---')}
              {!isLoading && quoteData?.d && (
                <i className={`fas ${quoteData.d >= 0 ? 'fa-caret-up' : 'fa-caret-down'}`}></i>
              )}
            </div>
            <div className="price-change">
              <span className={`change-amount ${quoteData?.d >= 0 ? 'positive' : 'negative'}`}>
                {isLoading ? 'Loading...' : (
                  quoteData?.d ? `${quoteData.d >= 0 ? '+' : ''}${quoteData.d.toFixed(2)}` : '---'
                )}
              </span>
              <span className={`change-percent ${quoteData?.dp >= 0 ? 'positive' : 'negative'}`}>
                {isLoading ? 'Loading...' : (
                  quoteData?.dp ? `${quoteData.dp >= 0 ? '+' : ''}${quoteData.dp.toFixed(2)}%` : '---'
                )}
              </span>
            </div>
          </div>
          
          <div className="stock-details-grid">
            <div className="detail-row">
              <div className="detail-label">High</div>
              <div className="detail-value">
                {isLoading ? 'Loading...' : (quoteData?.h?.toFixed(2) || '---')}
              </div>
            </div>
            <div className="detail-row">
              <div className="detail-label">Low</div>
              <div className="detail-value">
                {isLoading ? 'Loading...' : (quoteData?.l?.toFixed(2) || '---')}
              </div>
            </div>
            <div className="detail-row">
              <div className="detail-label">Open</div>
              <div className="detail-value">
                {isLoading ? 'Loading...' : (quoteData?.o?.toFixed(2) || '---')}
              </div>
            </div>
            <div className="detail-row">
              <div className="detail-label">Prev Close</div>
              <div className="detail-value">
                {isLoading ? 'Loading...' : (quoteData?.pc?.toFixed(2) || '---')}
              </div>
            </div>
            <div className="detail-row">
              <div className="detail-label">Market Cap</div>
              <div className="detail-value">
                {isLoading ? 'Loading...' : (
                  profile?.marketCapitalization ? 
                    `${(profile.marketCapitalization / 1000).toFixed(1)}B` : '---'
                )}
              </div>
            </div>
            <div className="detail-row">
              <div className="detail-label">Industry</div>
              <div className="detail-value">
                {isLoading ? 'Loading...' : (profile?.finnhubIndustry || '---')}
              </div>
            </div>
          </div>
          
          {/* Company info section */}
          {profile && (
            <div className="company-info">
              <div className="company-detail">
                <div className="detail-label">Website</div>
                <div className="detail-value">
                  {profile.weburl ? (
                    <a href={profile.weburl} target="_blank" rel="noopener noreferrer">
                      {profile.weburl}
                    </a>
                  ) : '---'}
                </div>
              </div>
              <div className="company-detail">
                <div className="detail-label">IPO Date</div>
                <div className="detail-value">{profile.ipo || '---'}</div>
              </div>
              <div className="company-detail">
                <div className="detail-label">Outstanding Shares</div>
                <div className="detail-value">
                  {profile.shareOutstanding ? 
                    `${(profile.shareOutstanding / 1000000).toFixed(1)}M` : '---'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="chart-navigation">
        <div 
          className={`nav-item ${activeTab === 'chart' ? 'active' : ''}`}
          onClick={() => handleTabClick('chart')}
        >
          Chart
        </div>
        <div 
          className={`nav-item ${activeTab === 'options' ? 'active' : ''}`}
          onClick={() => handleTabClick('options')}
        >
          Options
        </div>
        <div 
          className={`nav-item ${activeTab === 'comments' ? 'active' : ''}`}
          onClick={() => handleTabClick('comments')}
        >
          Comments
        </div>
        <div 
          className={`nav-item ${activeTab === 'news' ? 'active' : ''}`}
          onClick={() => handleTabClick('news')}
        >
          News
        </div>
        <div
          className={`nav-item ${activeTab === 'company' ? 'active' : ''}`}
          onClick={() => handleTabClick('company')}
        >
          Company
        </div>
        <div
          className={`nav-item ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => handleTabClick('ai')}
        >
          AI
        </div>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'chart' && (
        <div className="stock-chart-container">
          <TradingViewChart 
            symbol={selectedSymbol || 'MSFT'} 
            theme="dark"
            height={400}
          />
        </div>
      )}

      {activeTab === 'news' && (
        <StockNewsPanel symbol={selectedSymbol || 'MSFT'} />
      )}

      {activeTab === 'options' && (
        <div className="tab-content-placeholder">
          <div className="placeholder-icon">📊</div>
          <div className="placeholder-title">Options Trading</div>
          <div className="placeholder-description">Options chain and trading functionality coming soon</div>
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="tab-content-placeholder">
          <div className="placeholder-icon">💬</div>
          <div className="placeholder-title">Comments & Analysis</div>
          <div className="placeholder-description">Community discussions and expert analysis coming soon</div>
        </div>
      )}

      {activeTab === 'company' && (
        <div className="tab-content-placeholder">
          <div className="placeholder-icon">🏢</div>
          <div className="placeholder-title">Company Details</div>
          <div className="placeholder-description">Detailed company information and financials coming soon</div>
        </div>
      )}

      {activeTab === 'ai' && (
        <AIPanel />
      )}

      <div className="chart-footer">
        <div className="chart-label">Dow</div>
        <div className="chart-value">34827.70</div>
        <div className="chart-change positive">+489.83</div>
        <div className="chart-percent positive">+1.43%</div>
      </div>
    </div>
  );
};