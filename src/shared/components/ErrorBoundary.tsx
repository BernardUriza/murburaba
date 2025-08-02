import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Logger } from '../../core/services/Logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  isolate?: boolean;
  level?: 'page' | 'section' | 'component';
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: NodeJS.Timeout | null = null;
  private previousResetKeys: Array<string | number> = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = 'component' } = this.props;
    
    // Log error to logging service
    Logger.error('ErrorBoundary caught error', {
      level,
      error: error.toString(),
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name,
      props: this.props
    });

    // Call custom error handler if provided
    onError?.(error, errorInfo);

    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Auto-reset after 5 seconds for component-level errors
    if (level === 'component' && this.state.errorCount < 3) {
      this.resetTimeoutId = setTimeout(() => {
        this.resetErrorBoundary();
      }, 5000);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;
    
    // Reset when resetKeys change
    if (
      hasError &&
      prevProps.resetKeys !== resetKeys &&
      resetKeys?.some((key, index) => key !== this.previousResetKeys[index])
    ) {
      this.resetErrorBoundary();
    }
    
    // Reset when props change (if enabled)
    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }
    
    this.previousResetKeys = resetKeys || [];
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    const { hasError, error, errorInfo, errorCount } = this.state;
    const { children, fallback, level = 'component', showDetails = false, isolate = true } = this.props;

    if (hasError && error) {
      // Custom fallback
      if (fallback) {
        return <>{fallback}</>;
      }

      // Default error UI based on level
      const errorStyles = {
        page: {
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center' as const
        },
        section: {
          padding: '2rem',
          margin: '1rem 0',
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          backgroundColor: '#fef2f2'
        },
        component: {
          padding: '1rem',
          border: '1px dashed #ef4444',
          borderRadius: '0.25rem',
          backgroundColor: '#fee2e2'
        }
      };

      return (
        <div 
          style={errorStyles[level]} 
          className={`error-boundary error-boundary--${level}`}
          role="alert"
          aria-live="assertive"
        >
          <div className="error-content">
            {level === 'page' && <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️ Oops! Something went wrong</h1>}
            {level === 'section' && <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Section Error</h2>}
            {level === 'component' && <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Component Error</h3>}
            
            <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
              {level === 'page' 
                ? "We're sorry, but something unexpected happened. Please try refreshing the page."
                : level === 'section'
                ? "This section encountered an error and cannot be displayed."
                : "This component failed to render properly."}
            </p>

            {showDetails && (
              <details style={{ marginTop: '1rem', textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>
                  Error Details (for developers)
                </summary>
                <pre style={{ 
                  padding: '1rem', 
                  backgroundColor: '#f3f4f6', 
                  borderRadius: '0.25rem',
                  overflow: 'auto',
                  fontSize: '0.875rem'
                }}>
                  {error.toString()}
                  {errorInfo && errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div style={{ marginTop: '1rem' }}>
              <button
                onClick={this.resetErrorBoundary}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                {level === 'page' ? 'Reload Page' : 'Try Again'}
              </button>
              
              {errorCount > 2 && (
                <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#ef4444' }}>
                  Multiple errors detected. Please refresh the page.
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    // If isolate is false and there's an error, don't render children
    if (!isolate && hasError) {
      return null;
    }

    return children;
  }
}