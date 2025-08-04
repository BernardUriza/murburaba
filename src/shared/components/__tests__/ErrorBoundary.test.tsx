import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';
import React from 'react';

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// ThrowErrorInEffect component removed as it was unused

describe('ErrorBoundary', () => {
  const originalConsoleError = console.error;
  
  beforeEach(() => {
    // Suppress console.error for these tests
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders error UI when child throws error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Component Error')).toBeInTheDocument();
    expect(screen.getByText('This component failed to render properly.')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    expect(screen.queryByText('Component Error')).not.toBeInTheDocument();
  });

  it('shows different UI for different error levels', () => {
    // Page level
    const { rerender } = render(
      <ErrorBoundary level="page">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('⚠️ Oops! Something went wrong')).toBeInTheDocument();
    expect(screen.getByText("We're sorry, but something unexpected happened. Please try refreshing the page.")).toBeInTheDocument();
    expect(screen.getByText('Reload Page')).toBeInTheDocument();
    
    // Section level
    rerender(
      <ErrorBoundary level="section">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Section Error')).toBeInTheDocument();
    expect(screen.getByText('This section encountered an error and cannot be displayed.')).toBeInTheDocument();
  });

  it('shows error details when showDetails is true', () => {
    render(
      <ErrorBoundary showDetails={true}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Error Details (for developers)')).toBeInTheDocument();
    
    // Click to expand details
    const summary = screen.getByText('Error Details (for developers)');
    fireEvent.click(summary);
    
    expect(screen.getByText(/Error: Test error/)).toBeInTheDocument();
  });

  it('resets error boundary when Try Again is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Component Error')).toBeInTheDocument();
    
    // Update to not throw
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );
    
    // Click Try Again
    fireEvent.click(screen.getByText('Try Again'));
    
    expect(screen.getByText('No error')).toBeInTheDocument();
    expect(screen.queryByText('Component Error')).not.toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn();
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('resets when resetKeys change', () => {
    let resetKey = 'key1';
    
    const { rerender } = render(
      <ErrorBoundary resetKeys={[resetKey]}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Component Error')).toBeInTheDocument();
    
    // Change reset key
    resetKey = 'key2';
    rerender(
      <ErrorBoundary resetKeys={[resetKey]}>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('resets when props change and resetOnPropsChange is true', () => {
    const { rerender } = render(
      <ErrorBoundary resetOnPropsChange={true}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Component Error')).toBeInTheDocument();
    
    // Change children prop
    rerender(
      <ErrorBoundary resetOnPropsChange={true}>
        <div>New content</div>
      </ErrorBoundary>
    );
    
    expect(screen.getByText('New content')).toBeInTheDocument();
    expect(screen.queryByText('Component Error')).not.toBeInTheDocument();
  });

  it('shows multiple errors warning after 3 errors', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    // First error
    expect(screen.queryByText('Multiple errors detected. Please refresh the page.')).not.toBeInTheDocument();
    
    // Reset and trigger second error
    fireEvent.click(screen.getByText('Try Again'));
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    // Reset and trigger third error
    fireEvent.click(screen.getByText('Try Again'));
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    // Now should show multiple errors warning
    expect(screen.getByText('Multiple errors detected. Please refresh the page.')).toBeInTheDocument();
  });

  it('isolates errors when isolate is true (default)', () => {
    render(
      <div>
        <div>Before error boundary</div>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
        <div>After error boundary</div>
      </div>
    );
    
    expect(screen.getByText('Before error boundary')).toBeInTheDocument();
    expect(screen.getByText('Component Error')).toBeInTheDocument();
    expect(screen.getByText('After error boundary')).toBeInTheDocument();
  });

  it('does not render children when isolate is false and there is an error', () => {
    render(
      <ErrorBoundary isolate={false}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.queryByText('Component Error')).not.toBeInTheDocument();
    expect(screen.queryByText('No error')).not.toBeInTheDocument();
  });
});