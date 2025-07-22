import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React, { ErrorInfo } from 'react';
import { ErrorBoundary, withErrorBoundary } from '../ErrorBoundary';

// Mock component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean; message?: string }> = ({ 
  shouldThrow = false, 
  message = 'Test error' 
}) => {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div>No error</div>;
};

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;

describe('ErrorBoundary TDD Tests', () => {
  let mockOnError: ReturnType<typeof vi.fn>;
  let mockReload: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnError = vi.fn();
    mockReload = vi.fn();
    
    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    });

    // Suppress console.error in tests
    console.error = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    console.error = originalConsoleError;
  });

  describe('Normal Rendering', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Child component</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Child component')).toBeInTheDocument();
    });

    it('should apply custom className to container', () => {
      const { container } = render(
        <ErrorBoundary className="custom-error-boundary">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const errorContainer = container.querySelector('.murmuraba-error-boundary');
      expect(errorContainer).toHaveClass('custom-error-boundary');
    });

    it('should set proper aria-label for accessibility', () => {
      render(
        <ErrorBoundary aria-label="Custom error boundary">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-label', 'Custom error boundary');
    });

    it('should use default aria-label when not provided', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-label', 'Application error occurred');
    });
  });

  describe('Error Handling', () => {
    it('should catch and display error when child throws', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} message="Component failed" />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/audio processing application encountered/)).toBeInTheDocument();
    });

    it('should call onError callback when error occurs', () => {
      render(
        <ErrorBoundary onError={mockOnError}>
          <ThrowError shouldThrow={true} message="Test callback error" />
        </ErrorBoundary>
      );

      expect(mockOnError).toHaveBeenCalledTimes(1);
      const [error, errorInfo] = mockOnError.mock.calls[0];
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test callback error');
      expect(errorInfo).toBeDefined();
    });

    it('should log error to console', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} message="Console log test" />
        </ErrorBoundary>
      );

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('🚨 Murmuraba ErrorBoundary caught an error:'),
        expect.any(Error),
        expect.any(Object)
      );
    });
  });

  describe('Custom Fallback', () => {
    it('should render custom fallback when provided', () => {
      const customFallback = (error: Error, errorInfo: ErrorInfo) => (
        <div data-testid="custom-fallback">
          Custom error: {error.message}
        </div>
      );

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} message="Custom fallback test" />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom error: Custom fallback test')).toBeInTheDocument();
      expect(screen.queryByText('Oops! Something went wrong')).not.toBeInTheDocument();
    });

    it('should pass error and errorInfo to custom fallback', () => {
      let receivedError: Error | null = null;
      let receivedErrorInfo: ErrorInfo | null = null;

      const customFallback = (error: Error, errorInfo: ErrorInfo) => {
        receivedError = error;
        receivedErrorInfo = errorInfo;
        return <div>Custom fallback rendered</div>;
      };

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} message="Fallback data test" />
        </ErrorBoundary>
      );

      expect(receivedError).toBeInstanceOf(Error);
      expect(receivedError?.message).toBe('Fallback data test');
      expect(receivedErrorInfo).toBeDefined();
    });
  });

  describe('Reload Functionality', () => {
    it('should render reload button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByRole('button');
      expect(reloadButton).toBeInTheDocument();
      expect(reloadButton).toHaveTextContent('Reload Application');
      expect(reloadButton).toHaveAttribute('aria-label', 'Reload application to recover from error');
    });

    it('should reset error state when reload button is clicked', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();

      const reloadButton = screen.getByRole('button');
      fireEvent.click(reloadButton);

      // Rerender with no error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should handle keyboard navigation on reload button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByRole('button');
      
      // Test Enter key
      fireEvent.keyDown(reloadButton, { key: 'Enter' });
      expect(mockReload).toHaveBeenCalledTimes(1);

      // Test Space key
      fireEvent.keyDown(reloadButton, { key: ' ' });
      expect(mockReload).toHaveBeenCalledTimes(2);
    });

    it('should not reload on other keys', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByRole('button');
      fireEvent.keyDown(reloadButton, { key: 'Escape' });

      expect(mockReload).not.toHaveBeenCalled();
    });
  });

  describe('Props Change Reset', () => {
    it('should reset error when resetOnPropsChange is true and children change', () => {
      const { rerender } = render(
        <ErrorBoundary resetOnPropsChange={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Change children
      rerender(
        <ErrorBoundary resetOnPropsChange={true}>
          <div>New child</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('New child')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should not reset error when resetOnPropsChange is false', () => {
      const { rerender } = render(
        <ErrorBoundary resetOnPropsChange={false}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Change children
      rerender(
        <ErrorBoundary resetOnPropsChange={false}>
          <div>New child</div>
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.queryByText('New child')).not.toBeInTheDocument();
    });

    it('should not reset when children are the same', () => {
      const { rerender } = render(
        <ErrorBoundary resetOnPropsChange={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Keep same children
      rerender(
        <ErrorBoundary resetOnPropsChange={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Development Mode Error Details', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should show error details in development mode', () => {
      process.env.NODE_ENV = 'development';

      const testError = new Error('Development error test');
      testError.stack = 'Error: Development error test\n    at test line 1';

      // Use a component that throws the specific error
      const ThrowSpecificError = () => {
        throw testError;
      };

      render(
        <ErrorBoundary>
          <ThrowSpecificError />
        </ErrorBoundary>
      );

      expect(screen.getByText('🔍 Error Details (Development)')).toBeInTheDocument();
      expect(screen.getByText('Error: Development error test')).toBeInTheDocument();
    });

    it('should not show error details in production mode', () => {
      process.env.NODE_ENV = 'production';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.queryByText('🔍 Error Details (Development)')).not.toBeInTheDocument();
    });

    it('should display stack trace when available', () => {
      process.env.NODE_ENV = 'development';

      const testError = new Error('Stack trace test');
      testError.stack = 'Error: Stack trace test\n    at Component\n    at ErrorBoundary';

      const ThrowWithStack = () => {
        throw testError;
      };

      render(
        <ErrorBoundary>
          <ThrowWithStack />
        </ErrorBoundary>
      );

      expect(screen.getByText('Stack Trace:')).toBeInTheDocument();
      expect(screen.getByText(/at Component/)).toBeInTheDocument();
    });
  });

  describe('withErrorBoundary HOC', () => {
    it('should wrap component with ErrorBoundary', () => {
      const TestComponent = () => <div>HOC Test Component</div>;
      const WrappedComponent = withErrorBoundary(TestComponent);

      render(<WrappedComponent />);

      expect(screen.getByText('HOC Test Component')).toBeInTheDocument();
    });

    it('should pass through error boundary props', () => {
      const TestComponent = () => <ThrowError shouldThrow={true} />;
      const WrappedComponent = withErrorBoundary(TestComponent, {
        onError: mockOnError,
        'aria-label': 'HOC Error Boundary'
      });

      render(<WrappedComponent />);

      expect(screen.getByRole('alert')).toHaveAttribute('aria-label', 'HOC Error Boundary');
      expect(mockOnError).toHaveBeenCalled();
    });

    it('should set correct displayName', () => {
      const TestComponent = () => <div>Test</div>;
      TestComponent.displayName = 'CustomTestComponent';
      
      const WrappedComponent = withErrorBoundary(TestComponent);

      expect(WrappedComponent.displayName).toBe('withErrorBoundary(CustomTestComponent)');
    });

    it('should fallback to component name if displayName not set', () => {
      const TestComponent = () => <div>Test</div>;
      const WrappedComponent = withErrorBoundary(TestComponent);

      expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)');
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('should clear timeout on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');

      const { unmount } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Trigger reload to start timeout
      const reloadButton = screen.getByRole('button');
      fireEvent.click(reloadButton);

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should handle multiple rapid reloads gracefully', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByRole('button');
      
      // Click multiple times rapidly
      fireEvent.click(reloadButton);
      fireEvent.click(reloadButton);
      fireEvent.click(reloadButton);

      // Should not cause any errors
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle error with no message', () => {
      const ThrowEmptyError = () => {
        throw new Error();
      };

      expect(() => {
        render(
          <ErrorBoundary>
            <ThrowEmptyError />
          </ErrorBoundary>
        );
      }).not.toThrow();

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should handle non-Error objects being thrown', () => {
      const ThrowString = () => {
        throw 'String error';
      };

      expect(() => {
        render(
          <ErrorBoundary>
            <ThrowString />
          </ErrorBoundary>
        );
      }).not.toThrow();
    });

    it('should handle null children', () => {
      expect(() => {
        render(
          <ErrorBoundary>
            {null}
          </ErrorBoundary>
        );
      }).not.toThrow();
    });

    it('should handle undefined children', () => {
      expect(() => {
        render(
          <ErrorBoundary>
            {undefined}
          </ErrorBoundary>
        );
      }).not.toThrow();
    });
  });

  describe('Component Lifecycle', () => {
    it('should unmount cleanly without errors', () => {
      const { unmount } = render(
        <ErrorBoundary>
          <div>Test</div>
        </ErrorBoundary>
      );

      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should handle error after unmount gracefully', () => {
      const { unmount } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });
});