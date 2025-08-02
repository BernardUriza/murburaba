import React, { ReactNode, Suspense } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

interface AsyncBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  level?: 'page' | 'section' | 'component';
}

export const AsyncBoundary: React.FC<AsyncBoundaryProps> = ({
  children,
  fallback = <div className="loading-spinner">Loading...</div>,
  errorFallback,
  onError,
  resetKeys,
  level = 'component'
}) => {
  return (
    <ErrorBoundary
      fallback={errorFallback}
      onError={onError}
      resetKeys={resetKeys}
      level={level}
      resetOnPropsChange
    >
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};