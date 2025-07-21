import React from 'react'
import Link from 'next/link'

export default function Custom404() {
  return (
    <div className="error-container">
      <div className="glass-card error-card">
        <div className="logo-icon" style={{ 
          margin: '0 auto var(--spacing-xl)', 
          fontSize: '3rem',
          width: '80px',
          height: '80px' 
        }}>
          🌾
        </div>
        <h1 className="error-code">404</h1>
        <p className="error-message-text">
          Page not found. The prairie winds have blown this page away.
        </p>
        <Link href="/" className="btn btn-primary">
          <span className="btn-icon">🏠</span>
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  )
}