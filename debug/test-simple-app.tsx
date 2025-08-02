import React from 'react';
import ReactDOM from 'react-dom/client';

// Simple test component to verify React is working
function SimpleTestApp() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0B0E',
      color: '#E4E5F1',
      padding: '2rem',
      fontFamily: 'system-ui'
    }}>
      <h1>🎵 Simple Test App</h1>
      <p>✅ If you can see this, React is working correctly!</p>
      <div style={{
        padding: '1rem',
        background: 'rgba(82, 163, 47, 0.1)',
        border: '1px solid #52A32F',
        borderRadius: '8px',
        marginTop: '1rem'
      }}>
        <h2>Debug Information:</h2>
        <ul>
          <li>React version: {React.version}</li>
          <li>Current time: {new Date().toLocaleString()}</li>
          <li>Location: {window.location.href}</li>
        </ul>
      </div>
      
      <div style={{
        marginTop: '1rem',
        padding: '1rem',
        background: 'rgba(139, 31, 75, 0.1)',
        border: '1px solid #8B1F4B',
        borderRadius: '8px'
      }}>
        <h3>Next Steps:</h3>
        <p>If this loads successfully, the issue is with the main app logic, not React itself.</p>
      </div>
    </div>
  );
}

console.log('🚀 Loading Simple Test App...');

// Try to render the simple app
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<SimpleTestApp />);

console.log('✅ Simple Test App rendered successfully');