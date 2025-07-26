import React, { useState } from 'react';
import { MurmurabaSuite, useAudioProcessing, useSuiteLogger } from '../MurmurabaSuite';
import { ProcessedChunk } from '../../types';

// Example 1: Simple file processor
function FileProcessor() {
  const { processFile, isProcessing, progress, error } = useAudioProcessing();
  const [results, setResults] = useState<ProcessedChunk[]>([]);
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const result = await processFile(file, {
      chunkDuration: 8000,
      outputFormat: 'webm',
      enableVAD: true
    });
    
    if (result) {
      setResults(result.chunks);
    }
  };
  
  return (
    <div>
      <h3>Audio File Processor</h3>
      <input type="file" accept="audio/*" onChange={handleFileSelect} disabled={isProcessing} />
      
      {isProcessing && (
        <div>
          <p>Processing... {Math.round(progress * 100)}%</p>
        </div>
      )}
      
      {error && (
        <div style={{ color: 'red' }}>
          Error: {error.message}
        </div>
      )}
      
      {results.length > 0 && (
        <div>
          <h4>Processed Chunks: {results.length}</h4>
          {results.map((chunk, i) => (
            <div key={chunk.id}>
              Chunk {i + 1}: {chunk.duration}ms, VAD: {chunk.averageVad.toFixed(2)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Example 2: Live recording processor
function LiveRecorder() {
  const { processRecording, isProcessing, cancel } = useAudioProcessing();
  const logger = useSuiteLogger();
  const [duration, setDuration] = useState(5000);
  
  const handleRecord = async () => {
    logger?.info('Starting recording', { duration });
    
    const result = await processRecording(duration, {
      chunkDuration: 2000,
      enableAGC: true
    });
    
    if (result) {
      logger?.info('Recording completed', { 
        chunks: result.chunks.length,
        avgVad: result.averageVad 
      });
    }
  };
  
  return (
    <div>
      <h3>Live Recorder</h3>
      <label>
        Duration (ms):
        <input 
          type="number" 
          value={duration} 
          onChange={(e) => setDuration(Number(e.target.value))}
          disabled={isProcessing}
        />
      </label>
      
      <button onClick={handleRecord} disabled={isProcessing}>
        {isProcessing ? 'Recording...' : 'Start Recording'}
      </button>
      
      {isProcessing && (
        <button onClick={cancel}>Cancel</button>
      )}
    </div>
  );
}

// Example 3: Custom service usage
function CustomServiceExample() {
  const suite = useMurmurabaSuite();
  const [serviceInfo, setServiceInfo] = useState<string[]>([]);
  
  const checkServices = async () => {
    // Load services on demand
    await suite.loadService('metricsManager');
    await suite.loadService('workerManager');
    
    // Get service info
    const info = [];
    if (suite.getService(TOKENS.MetricsManager)) {
      info.push('MetricsManager loaded');
    }
    if (suite.getService(TOKENS.WorkerManager)) {
      info.push('WorkerManager loaded');
    }
    
    setServiceInfo(info);
  };
  
  return (
    <div>
      <h3>Service Management</h3>
      <button onClick={checkServices}>Load Additional Services</button>
      <ul>
        {serviceInfo.map((info, i) => (
          <li key={i}>{info}</li>
        ))}
      </ul>
    </div>
  );
}

// Main app demonstrating MurmurabaSuite usage
export function MurmurabaSuiteDemo() {
  return (
    <MurmurabaSuite
      // Engine configuration
      logLevel="debug"
      algorithm="rnnoise"
      enableAGC={true}
      
      // Service configuration
      services={{
        audioProcessor: true,
        metricsManager: true,
        workerManager: false // Lazy load this one
      }}
      
      // Load services on demand
      lazy={true}
    >
      <div style={{ padding: '20px' }}>
        <h1>MurmurabaSuite Demo</h1>
        
        <FileProcessor />
        <hr />
        
        <LiveRecorder />
        <hr />
        
        <CustomServiceExample />
      </div>
    </MurmurabaSuite>
  );
}

// Example 4: Multiple suite instances
export function MultiSuiteExample() {
  return (
    <div>
      <MurmurabaSuite logLevel="error" algorithm="rnnoise">
        <div>
          <h2>Production Suite (RNNoise)</h2>
          <FileProcessor />
        </div>
      </MurmurabaSuite>
      
      <MurmurabaSuite logLevel="debug" algorithm="spectral" allowDegraded={true}>
        <div>
          <h2>Debug Suite (Spectral)</h2>
          <LiveRecorder />
        </div>
      </MurmurabaSuite>
    </div>
  );
}