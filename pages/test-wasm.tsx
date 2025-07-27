import { useState } from 'react';

export default function TestWasm() {
  const [status, setStatus] = useState('Not started');
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  const testWasmDirectly = async () => {
    try {
      setStatus('Testing direct WASM load...');
      setError(null);
      setLogs([]);
      
      // Test 1: Check if WASM file is accessible
      addLog('Testing WASM file accessibility...');
      const response = await fetch('/rnnoise.wasm');
      addLog(`WASM fetch response: ${response.status} ${response.statusText}`);
      addLog(`Content-Type: ${response.headers.get('Content-Type')}`);
      addLog(`Content-Length: ${response.headers.get('Content-Length')}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch WASM: ${response.status}`);
      }
      
      // Test 2: Try to load the wasm-loader-simple module
      addLog('Loading wasm-loader-simple module...');
      const wasmLoader = await import('murmuraba/engines/wasm-loader-simple');
      addLog('wasm-loader-simple module loaded successfully');
      
      // Test 3: Try to initialize WASM
      addLog('Calling loadRNNoiseWASM()...');
      const module = await wasmLoader.loadRNNoiseWASM();
      addLog('WASM module loaded successfully!');
      addLog(`Module type: ${typeof module}`);
      addLog(`Has _malloc: ${typeof module._malloc === 'function'}`);
      addLog(`Has _rnnoise_create: ${typeof module._rnnoise_create === 'function'}`);
      
      setStatus('✅ WASM loaded successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog(`ERROR: ${errorMessage}`);
      setError(errorMessage);
      setStatus('❌ Failed to load WASM');
      console.error('Full error:', err);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>WASM Debug Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testWasmDirectly}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px'
          }}
        >
          Test WASM Loading
        </button>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <strong>Status:</strong> {status}
      </div>
      
      {error && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '10px', 
          backgroundColor: '#ffcccc',
          borderRadius: '5px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      <div>
        <strong>Logs:</strong>
        <div style={{ 
          backgroundColor: '#f0f0f0', 
          padding: '10px',
          borderRadius: '5px',
          maxHeight: '400px',
          overflow: 'auto'
        }}>
          {logs.length === 0 ? (
            <div>No logs yet...</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} style={{ marginBottom: '5px' }}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}