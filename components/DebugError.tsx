import React from 'react';

export function DebugError({ error }: { error: any }) {
  // Safe error handling
  let errorMessage = 'Unknown error';
  
  if (error) {
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === 'object') {
      // Check if it's a React element
      if (error.$$typeof || error._owner || error.type) {
        errorMessage = 'React element passed as error';
        console.error('React element detected as error:', error);
      } else if (error.message) {
        errorMessage = String(error.message);
      } else {
        errorMessage = JSON.stringify(error);
      }
    }
  }
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: '1rem',
      color: '#ff4444'
    }}>
      <div style={{ fontSize: '2rem' }}>❌</div>
      <div>Failed to initialize MurmurabaSuite</div>
      <div style={{ fontSize: '0.875rem', color: '#666' }}>{errorMessage}</div>
    </div>
  );
}