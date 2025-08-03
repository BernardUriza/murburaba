import React, { memo } from 'react';
import { useUIState } from '../../core/store/useAppStore';

interface UIControlsProps {
  className?: string;
}

export const UIControls: React.FC<UIControlsProps> = memo(({ className = '' }) => {
  const {
    selectedTab,
    setSelectedTab,
    isDarkMode,
    toggleDarkMode,
    toggleChat,
    toggleSettings,
    toggleMetricsPanel
  } = useUIState();

  return (
    <div className={`ui-controls ${className}`}>
      <div className="tab-navigation">
        <button
          className={`tab-button ${selectedTab === 'record' ? 'active' : ''}`}
          onClick={() => setSelectedTab('record')}
        >
          <span className="tab-icon">🎙️</span>
          <span className="tab-label">Record</span>
        </button>
        
        <button
          className={`tab-button ${selectedTab === 'file' ? 'active' : ''}`}
          onClick={() => setSelectedTab('file')}
        >
          <span className="tab-icon">📁</span>
          <span className="tab-label">Process File</span>
        </button>
        
        <button
          className={`tab-button ${selectedTab === 'demo' ? 'active' : ''}`}
          onClick={() => setSelectedTab('demo')}
        >
          <span className="tab-icon">🎵</span>
          <span className="tab-label">Demo</span>
        </button>
      </div>

      <div className="utility-controls">
        <button
          className="utility-button"
          onClick={toggleDarkMode}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
        
        <button
          className="utility-button"
          onClick={toggleChat}
          title="Open AI Assistant"
        >
          💬
        </button>
        
        <button
          className="utility-button"
          onClick={toggleSettings}
          title="Settings"
        >
          ⚙️
        </button>
        
        <button
          className="utility-button"
          onClick={toggleMetricsPanel}
          title="Engine Diagnostics"
        >
          📊
        </button>
      </div>
    </div>
  );
});