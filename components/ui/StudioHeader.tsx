import React from 'react'

interface StudioHeaderProps {
  isProcessing: boolean
  isInitialized: boolean
}

export function StudioHeader({ isProcessing, isInitialized }: StudioHeaderProps) {
  const getStatus = () => {
    if (isProcessing) return 'processing'
    if (isInitialized) return 'ready'
    return 'uninitialized'
  }

  const getStatusLabel = () => {
    if (isProcessing) return 'processing'
    if (isInitialized) return 'ready'
    return 'uninitialized'
  }

  return (
    <div className="studio-header">
      <div className="header-content">
        <div className="brand-modern">
          <h1 className="brand-name">
            <span className="brand-icon" style={{ animation: 'spin 2s linear infinite' }}>◐</span>
            murmuraba
          </h1>
          <div className="brand-meta">
            <span className="version">v2.0.0</span>
            <span className="separator">•</span>
            <span className="tagline">Neural Audio Engine</span>
          </div>
        </div>
        <div className="engine-status-modern">
          <div className={`status-indicator ${getStatus()}`}>
            <span className="status-pulse"></span>
            <span className="status-label">{getStatusLabel()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}