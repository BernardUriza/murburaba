import React, { memo, useCallback, useMemo } from 'react'
import type { AudioDemoProps } from './AudioDemo'

// Optimized AudioDemo with React.memo and memoized callbacks
const AudioDemoOptimized = memo<AudioDemoProps>(({
  getEngineStatus,
  processFile,
  processFileWithMetrics,
  autoProcess = false,
  onProcessComplete,
  onError
}) => {
  // Memoize expensive computations
  const engineStatus = useMemo(() => getEngineStatus(), [getEngineStatus]);
  
  // Memoize callbacks to prevent unnecessary re-renders
  const handleProcessFile = useCallback(async (file: File) => {
    try {
      const result = await processFile(file);
      onProcessComplete?.(result);
    } catch (error) {
      onError?.(error as Error);
    }
  }, [processFile, onProcessComplete, onError]);
  
  const handleProcessWithMetrics = useCallback(async (file: File) => {
    try {
      const result = await processFileWithMetrics(file);
      onProcessComplete?.(result.processedBuffer);
    } catch (error) {
      onError?.(error as Error);
    }
  }, [processFileWithMetrics, onProcessComplete, onError]);
  
  // Component implementation
  return (
    <div className="audio-demo-optimized">
      <h3>Audio Processing Demo</h3>
      <div className="engine-status">
        Status: {engineStatus}
      </div>
      {/* Rest of the component */}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.autoProcess === nextProps.autoProcess &&
    prevProps.getEngineStatus === nextProps.getEngineStatus &&
    prevProps.processFile === nextProps.processFile &&
    prevProps.processFileWithMetrics === nextProps.processFileWithMetrics
  );
});

AudioDemoOptimized.displayName = 'AudioDemoOptimized';

export default AudioDemoOptimized;