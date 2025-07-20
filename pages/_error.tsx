import React from 'react'
import { NextPageContext } from 'next'

interface ErrorProps {
  statusCode?: number
}

function Error({ statusCode }: ErrorProps) {
  return (
    <div className="error-container">
      <div className="glass-card error-card">
        <h1 className="error-code">
          {statusCode || 'Error'}
        </h1>
        <p className="error-message-text">
          {statusCode
            ? `An error ${statusCode} occurred on server`
            : 'An error occurred on client'}
        </p>
        <a href="/" className="btn btn-primary">
          <span className="btn-icon">🏠</span>
          <span>Back to Home</span>
        </a>
      </div>
    </div>
  )
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error