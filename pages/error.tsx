import React from 'react'
import Link from 'next/link'

export default function Error() {
  return (
    <div className="error-container">
      <div className="glass-card error-card">
        <h1 className="error-code">Error</h1>
        <p className="error-message-text">
          Something went wrong. Please try again.
        </p>
        <Link href="/" className="btn btn-primary">
          <span className="btn-icon">🏠</span>
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  )
}