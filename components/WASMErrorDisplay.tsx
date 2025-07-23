import React from 'react';

interface WASMErrorProps {
  error: string;
  onDismiss: () => void;
}

export const WASMErrorDisplay: React.FC<WASMErrorProps> = ({ error, onDismiss }) => {
  const isWASMError = error.includes('wasm') || error.includes('WASM') || error.includes('Aborted');
  
  if (isWASMError) {
    return (
      <div className="wasm-error-container">
        <div className="wasm-error-header">
          <span className="error-icon">⚠️</span>
          <h3>WASM Loading Error</h3>
        </div>
        <div className="wasm-error-content">
          <p>The audio processing engine could not be initialized. This is usually due to:</p>
          <ul>
            <li>🔸 The WASM file is not accessible at <code>/dist/rnnoise.wasm</code></li>
            <li>🔸 CORS policy blocking the WASM file</li>
            <li>🔸 Incorrect MIME type configuration for .wasm files</li>
            <li>🔸 Browser doesn't support WebAssembly</li>
          </ul>
          <div className="wasm-error-solution">
            <h4>Solutions:</h4>
            <ol>
              <li>Ensure <code>public/dist/rnnoise.wasm</code> exists</li>
              <li>Configure your server to serve .wasm files with <code>application/wasm</code> MIME type</li>
              <li>If using a CDN, check CORS headers</li>
              <li>Try refreshing the page</li>
            </ol>
          </div>
          <details className="error-details">
            <summary>Technical Details</summary>
            <pre>{error}</pre>
          </details>
        </div>
        <button onClick={onDismiss} className="error-dismiss-btn">
          Try Again
        </button>
        <style jsx>{`
          .wasm-error-container {
            background: #2a1a1a;
            border: 2px solid #ff4444;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
            animation: slideIn 0.3s ease-out;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
          }
          
          .wasm-error-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 15px;
          }
          
          .error-icon {
            font-size: 24px;
          }
          
          .wasm-error-header h3 {
            margin: 0;
            color: #ff6666;
          }
          
          .wasm-error-content {
            color: #e0e0e0;
            line-height: 1.6;
          }
          
          .wasm-error-content ul {
            margin: 10px 0;
            padding-left: 20px;
          }
          
          .wasm-error-content li {
            margin: 5px 0;
          }
          
          .wasm-error-content code {
            background: #1a1a1a;
            padding: 2px 6px;
            border-radius: 4px;
            color: #66ff66;
            font-family: monospace;
          }
          
          .wasm-error-solution {
            background: #1a1a2e;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
          }
          
          .wasm-error-solution h4 {
            margin: 0 0 10px 0;
            color: #66ccff;
          }
          
          .wasm-error-solution ol {
            margin: 0;
            padding-left: 20px;
          }
          
          .error-details {
            margin-top: 15px;
            background: #1a1a1a;
            padding: 10px;
            border-radius: 6px;
          }
          
          .error-details summary {
            cursor: pointer;
            color: #888;
            user-select: none;
          }
          
          .error-details pre {
            margin: 10px 0 0 0;
            padding: 10px;
            background: #0a0a0a;
            border-radius: 4px;
            overflow-x: auto;
            font-size: 12px;
            color: #ff9999;
          }
          
          .error-dismiss-btn {
            background: #ff4444;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            margin-top: 15px;
            transition: background 0.2s;
          }
          
          .error-dismiss-btn:hover {
            background: #ff6666;
          }
          
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    );
  }
  
  // Default error display for non-WASM errors
  return (
    <div className="error-message shake">
      <span>⚠️ {error}</span>
      <button onClick={onDismiss} className="error-dismiss">✕</button>
    </div>
  );
};