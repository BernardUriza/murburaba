import React from 'react'

interface OverlayPanelProps {
  show: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function OverlayPanel({ show, onClose, title = "", children }: OverlayPanelProps) {
  return (
    <>
      <div className={`slide-panel-overlay ${show ? 'active' : ''}`} onClick={onClose} />
      <div className={`slide-panel audio-demo-panel ${show ? 'active' : ''}`}>
        <div className="panel-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="panel-content">{children}</div>
      </div>
    </>
  )
}