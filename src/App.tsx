import { lazy, memo, useCallback, useMemo } from 'react';
import Swal from 'sweetalert2';
import { 
  useMurmubaraEngine,
  getEngineStatus
} from 'murmuraba';
import { WASMErrorDisplay } from './components/wasm-error-display/wasm-error-display';
import { CopilotChat } from './components/copilot-chat/copilot-chat';
import { Settings } from './components/settings/settings';
import { AppHeader } from './components/app-header';
import { TabContent } from './components/tab-content';
import { 
  useUIState,
  useEngineConfig, 
  useDisplaySettings, 
  useVadThresholds, 
  useFileState 
} from './core/store/useAppStore';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import { AsyncBoundary } from './shared/components/AsyncBoundary';
import { Logger } from './core/services/Logger';
import { useEngineEffects } from './hooks';

// Lazy load heavy components for code splitting
const AdvancedMetricsPanel = lazy(() => import('murmuraba').then(m => ({ default: m.AdvancedMetricsPanel })));


const App = memo(function App() {
  // CRITICAL FIX: Use cached utility hooks to prevent getSnapshot infinite loops
  const uiState = useUIState();
  const { engineConfig, updateEngineConfig } = useEngineConfig();
  const { displaySettings, updateDisplaySettings } = useDisplaySettings();
  const { vadThresholds, updateVadThresholds } = useVadThresholds();
  const { processedFileResult, setProcessedFileResult } = useFileState();
  
  // Destructure UI state
  const { isDarkMode, isChatOpen, toggleChat, isSettingsOpen, toggleSettings, isMetricsPanelOpen, toggleMetricsPanel, selectedTab } = uiState;

  // CRITICAL FIX: Deep comparison for engine config to prevent unnecessary recreations
  const memoizedEngineConfig = useMemo(() => {
    // Create a new object only if the actual values have changed
    return { ...engineConfig };
  }, [
    engineConfig.bufferSize,
    engineConfig.denoiseStrength,
    engineConfig.enableMetrics,
    engineConfig.enableDebugLogs,
    engineConfig.spectralFloorDb,
    engineConfig.noiseFloorDb
    // Add other critical config properties that actually affect engine behavior
  ]);

  const {
    // Engine State
    isInitialized,
    isLoading,
    error,
    metrics,
    diagnostics,
    
    // Recording State
    recordingState,
    currentStream,
    
    // Actions
    initialize,
    processFile,
    
    // Recording Actions
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecordings,
    
    // Audio Playback Actions
    toggleChunkPlayback,
    toggleChunkExpansion,
    
    // Export Actions
    exportChunkAsWav,
    exportChunkAsMp3,
    downloadAllChunksAsZip
  } = useMurmubaraEngine(memoizedEngineConfig);

  // CRITICAL FIX: Stable config object to prevent dependency loops
  // CRITICAL FIX: Use individual props instead of memoized object to prevent dependency loops
  // This prevents the entire config object from being recreated when any single prop changes
  useEngineEffects({
    isInitialized,
    isLoading,
    error,
    isDarkMode,
    engineConfig: memoizedEngineConfig,
    initialize // Pass function directly without extra memoization
  });


  // Memoized callback to prevent unnecessary re-renders of child components
  const handleExportChunk = useCallback(async (chunkId: string, format: 'wav' | 'mp3', audioType: 'processed' | 'original' = 'processed') => {
    try {
      if (format === 'wav') {
        await exportChunkAsWav(chunkId, audioType);
      } else {
        await exportChunkAsMp3(chunkId, audioType);
      }
      
      await Swal.fire({
        icon: 'success',
        title: 'Export Successful',
        text: `Chunk exported as ${format.toUpperCase()} (${audioType})`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Logger.error('Export chunk failed', { chunkId, format, audioType, error: errorMessage });
      
      await Swal.fire({
        icon: 'error',
        title: 'Export Failed',
        text: errorMessage
      }).catch((swalError) => {
        Logger.error('Failed to show export error dialog', { swalError });
      });
    }
  }, [exportChunkAsWav, exportChunkAsMp3]);

  // Memoized handlers to prevent unnecessary re-renders
  const handleStopRecording = useCallback(async () => stopRecording(), [stopRecording]);
  
  const handleProcessFile = useCallback(async (buffer: ArrayBuffer) => {
    return await processFile(buffer);
  }, [processFile]);

  const handleApplyConfigChanges = useCallback(async () => {
    await initialize();
  }, [initialize]);

  const handleTogglePlayback = useCallback((chunkId: string, audioType: 'processed' | 'original' = 'processed') => 
    toggleChunkPlayback(chunkId, audioType), [toggleChunkPlayback]);

  const handleDownloadAll = useCallback(() => downloadAllChunksAsZip('both'), [downloadAllChunksAsZip]);

  // Memoized computed values
  const appClassName = useMemo(() => `app ${isDarkMode ? 'dark' : ''}`, [isDarkMode]);
  
  const shouldShowWaveform = useMemo(() => 
    recordingState.isRecording && !!currentStream, [recordingState.isRecording, currentStream]);
  
  const shouldShowMetrics = useMemo(() => 
    engineConfig.enableMetrics && metrics, [engineConfig.enableMetrics, metrics]);

  return (
    <ErrorBoundary level="page" onError={(error, errorInfo) => {
      Logger.fatal('App crashed', { error: error.message, errorInfo });
    }}>
      <div className={appClassName}>
      <AppHeader />

      <main className="app-main">
        {error ? (
          <WASMErrorDisplay error={error} onRetry={initialize} />
        ) : !isInitialized ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Initializing audio engine...</p>
          </div>
        ) : (
          <>
            <TabContent
              selectedTab={selectedTab}
              recordingState={recordingState}
              currentStream={currentStream}
              shouldShowWaveform={shouldShowWaveform}
              metrics={metrics}
              isInitialized={isInitialized}
              isLoading={isLoading}
              engineConfig={engineConfig}
              processedFileResult={processedFileResult}
              onStartRecording={startRecording}
              onStopRecording={handleStopRecording}
              onPauseRecording={pauseRecording}
              onResumeRecording={resumeRecording}
              onClearRecordings={clearRecordings}
              onTogglePlayback={handleTogglePlayback}
              onToggleExpansion={toggleChunkExpansion}
              onExportChunk={handleExportChunk}
              onDownloadAll={handleDownloadAll}
              onFileProcessed={setProcessedFileResult}
              onProcessFile={handleProcessFile}
              getEngineStatus={getEngineStatus}
            />

            {/* Metrics Panel */}
            {shouldShowMetrics && (
              <AsyncBoundary level="component" fallback={<div>Loading metrics...</div>}>
                <AdvancedMetricsPanel
                  isVisible={isMetricsPanelOpen}
                  diagnostics={diagnostics}
                  onClose={toggleMetricsPanel}
                />
              </AsyncBoundary>
            )}
          </>
        )}
      </main>

      {/* Floating Panels */}
      <Settings
        isOpen={isSettingsOpen}
        onClose={toggleSettings}
        vadThresholds={vadThresholds}
        displaySettings={displaySettings}
        onThresholdChange={updateVadThresholds}
        onDisplayChange={updateDisplaySettings}
      />

      <CopilotChat
        isOpen={isChatOpen}
        onClose={toggleChat}
        engineConfig={engineConfig}
        setEngineConfig={updateEngineConfig}
        isRecording={recordingState.isRecording}
        isInitialized={isInitialized}
        onApplyChanges={handleApplyConfigChanges}
      />
      </div>
    </ErrorBoundary>
  );
});

export default App;