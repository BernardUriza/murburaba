import { lazy, useEffect } from 'react';
import { 
  useMurmubaraEngine,
  BuildInfo,
  getEngineStatus
} from 'murmuraba';
import Swal from 'sweetalert2';
import { WASMErrorDisplay } from './components/wasm-error-display/wasm-error-display';
import { CopilotChat } from './components/copilot-chat/copilot-chat';
import { Settings } from './components/settings/settings';
import { AudioRecorder } from './features/audio-recording';
import { FileManager } from './features/file-management';
import { AudioProcessor } from './features/audio-processing';
import { UIControls } from './features/ui-controls';
import { useAppStore } from './core/store/useAppStore';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import { AsyncBoundary } from './shared/components/AsyncBoundary';
import { Logger } from './core/services/Logger';

// Lazy load heavy components for code splitting
const AudioDemo = lazy(() => import('./components/audio-demo/audio-demo'));
const SimpleWaveformAnalyzer = lazy(() => import('murmuraba').then(m => ({ default: m.SimpleWaveformAnalyzer })));
const AdvancedMetricsPanel = lazy(() => import('murmuraba').then(m => ({ default: m.AdvancedMetricsPanel })));
const ChunkProcessingResults = lazy(() => import('murmuraba').then(m => ({ default: m.ChunkProcessingResults })));

export default function App() {
  const {
    // App State from Zustand
    engineConfig,
    updateEngineConfig,
    displaySettings,
    updateDisplaySettings,
    vadThresholds,
    updateVadThresholds,
    isDarkMode,
    isChatOpen,
    toggleChat,
    isSettingsOpen,
    toggleSettings,
    selectedTab,
    processedFileResult,
    setProcessedFileResult
  } = useAppStore();

  const {
    // Engine State
    isInitialized,
    isLoading,
    error,
    metrics,
    diagnostics,
    
    // Recording State
    recordingState,
    
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
  } = useMurmubaraEngine(engineConfig);

  // Initialize engine on mount
  useEffect(() => {
    if (!isInitialized && !isLoading && !error) {
      initialize();
    }
  }, [isInitialized, isLoading, error, initialize]);

  // Apply dark mode
  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode);
  }, [isDarkMode]);

  // Save engine config to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('murmuraba-config', JSON.stringify(engineConfig));
  }, [engineConfig]);

  // Show initialization error if any
  useEffect(() => {
    if (error && error.includes('WASM')) {
      Swal.fire({
        icon: 'error',
        title: 'Initialization Error',
        text: error,
        footer: 'Please refresh the page and try again'
      });
    }
  }, [error]);


  const handleExportChunk = async (chunkId: string, format: 'wav' | 'mp3', audioType: 'processed' | 'original' = 'processed') => {
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
      console.error('Export error:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Export Failed',
        text: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  return (
    <ErrorBoundary level="page" onError={(error, errorInfo) => {
      Logger.fatal('App crashed', { error: error.message, errorInfo });
    }}>
      <div className={`app ${isDarkMode ? 'dark' : ''}`}>
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section">
            <h1 className="app-title">
              <span className="logo-icon">🎵</span>
              Murmuraba Studio
            </h1>
            <BuildInfo format="badge" size="small" />
          </div>
          
          <UIControls className="header-controls" />
        </div>
      </header>

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
            <div className="tab-content">
              {selectedTab === 'record' && (
                <ErrorBoundary level="section" resetKeys={[recordingState.chunks.length]}>
                  <div className="record-tab">
                  <AudioRecorder
                    recordingState={recordingState}
                    isInitialized={isInitialized}
                    isLoading={isLoading}
                    onStartRecording={startRecording}
                    onStopRecording={async () => stopRecording()}
                    onPauseRecording={pauseRecording}
                    onResumeRecording={resumeRecording}
                    onClearRecordings={clearRecordings}
                  />

                  {recordingState.chunks.length > 0 && (
                    <AsyncBoundary level="component" fallback={<div>Loading audio processor...</div>}>
                      <AudioProcessor
                        chunks={recordingState.chunks}
                        isPlaying={recordingState.playingChunks}
                        expandedChunk={recordingState.expandedChunk}
                        onTogglePlayback={(chunkId: string, audioType: 'processed' | 'original' = 'processed') => 
                          toggleChunkPlayback(chunkId, audioType)
                        }
                        onToggleExpansion={toggleChunkExpansion}
                        onExportWav={(id) => handleExportChunk(id, 'wav')}
                        onExportMp3={(id) => handleExportChunk(id, 'mp3')}
                        onDownloadAll={() => downloadAllChunksAsZip('both')}
                        ChunkProcessingResults={ChunkProcessingResults}
                      />
                    </AsyncBoundary>
                  )}
                  </div>
                </ErrorBoundary>
              )}

              {selectedTab === 'file' && (
                <ErrorBoundary level="section" resetKeys={[processedFileResult]}>
                  <div className="file-tab">
                  <FileManager
                    isInitialized={isInitialized}
                    isLoading={isLoading}
                    engineConfig={engineConfig}
                    onFileProcessed={setProcessedFileResult}
                  />

                  {processedFileResult && (
                    <AsyncBoundary level="component" fallback={<div>Loading results...</div>}>
                      <div className="file-results">
                        <SimpleWaveformAnalyzer
                          isActive={true}
                          width={800}
                          height={200}
                        />
                      </div>
                    </AsyncBoundary>
                  )}
                  </div>
                </ErrorBoundary>
              )}

              {selectedTab === 'demo' && (
                <AsyncBoundary level="section" fallback={<div>Loading demo...</div>}>
                  <AudioDemo 
                    getEngineStatus={getEngineStatus}
                    processFile={async (buffer: ArrayBuffer) => {
                      // Process file using the engine
                      return await processFile(buffer);
                    }}
                  />
                </AsyncBoundary>
              )}
            </div>

            {/* Metrics Panel */}
            {engineConfig.enableMetrics && metrics && (
              <AsyncBoundary level="component" fallback={<div>Loading metrics...</div>}>
                <AdvancedMetricsPanel
                  isVisible={true}
                  diagnostics={diagnostics}
                  onClose={() => {
                    // Handle close if needed
                  }}
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
        onApplyChanges={async () => {
          // Apply any pending configuration changes
          await initialize();
        }}
      />
      </div>
    </ErrorBoundary>
  );
}