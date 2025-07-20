import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
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
            <h1 className="error-code">Oops!</h1>
            <p className="error-message-text">
              Something went wrong. The application encountered an unexpected error.
            </p>
            <button 
              className="btn btn-primary"
              onClick={() => window.location.href = '/'}
            >
              <span className="btn-icon">🔄</span>
              <span>Reload Application</span>
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{ marginTop: 'var(--spacing-xl)', textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', color: 'var(--neutral-600)' }}>
                  Error details
                </summary>
                <pre style={{ 
                  marginTop: 'var(--spacing-md)',
                  padding: 'var(--spacing-md)',
                  background: 'var(--neutral-100)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-sm)',
                  overflow: 'auto'
                }}>
                  {this.state.error.toString()}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}