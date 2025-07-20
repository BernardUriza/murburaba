import React from 'react'

export default function Error() {
  return (
    <div className="error-container">
      <div className="glass-card error-card">
        <h1 className="error-code">Error</h1>
        <p className="error-message-text">
          Something went wrong. Please try again.
        </p>
        <a href="/" className="btn btn-primary">
          <span className="btn-icon">🏠</span>
          <span>Back to Home</span>
        </a>
      </div>
    </div>
  )
}