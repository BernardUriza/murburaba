import React from 'react';

export default function App() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0B0E',
      color: '#E4E5F1',
      padding: '2rem',
      fontFamily: 'system-ui'
    }}>
      <h1>🎵 Murmuraba Studio - Simple Test</h1>
      <div style={{
        background: 'rgba(82, 163, 47, 0.1)',
        border: '1px solid #52A32F',
        borderRadius: '8px',
        padding: '1rem',
        marginTop: '1rem'
      }}>
        <h2>✅ React is working!</h2>
        <p>Time: {new Date().toLocaleString()}</p>
        <p>If you can see this, the basic React setup is functioning correctly.</p>
      </div>
    </div>
  );
}