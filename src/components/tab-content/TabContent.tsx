import { memo, lazy } from 'react';
import { WaveformAnalyzer } from 'murmuraba';
import { ErrorBoundary } from '../../shared/components/ErrorBoundary';
import { AsyncBoundary } from '../../shared/components/AsyncBoundary';
import { AudioRecorder } from '../../features/audio-recording';
import { FileManager } from '../../features/file-management';
import { AudioProcessor } from '../../features/audio-processing';
import { RealTimeVad } from '../real-time-vad/real-time-vad';

// Lazy load heavy components
const AudioDemo = lazy(() => import('../audio-demo/audio-demo'));
const SimpleWaveformAnalyzer = lazy(() => import('murmuraba').then(m => ({ default: m.SimpleWaveformAnalyzer })));
const ChunkProcessingResults = lazy(() => import('murmuraba').then(m => ({ default: m.ChunkProcessingResults })));

interface TabContentProps {
  selectedTab: 'record' | 'file' | 'demo';
  recordingState: any;
  currentStream: any;
  shouldShowWaveform: boolean;
  metrics: any;
  isInitialized: boolean;
  isLoading: boolean;
  engineConfig: any;
  processedFileResult: any;
  onStartRecording: () => void;
  onStopRecording: () => Promise<void>;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onClearRecordings: () => void;
  onTogglePlayback: (chunkId: string, audioType?: 'processed' | 'original') => void;
  onToggleExpansion: (chunkId: string) => void;
  onExportChunk: (chunkId: string, format: 'wav' | 'mp3') => Promise<void>;
  onDownloadAll: () => void;
  onFileProcessed: (result: any) => void;
  onProcessFile: (buffer: ArrayBuffer) => Promise<any>;
  getEngineStatus: () => any;
}

export const TabContent = memo(function TabContent({
  selectedTab,
  recordingState,
  currentStream,
  shouldShowWaveform,
  metrics,
  isInitialized,
  isLoading,
  engineConfig,
  processedFileResult,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  onClearRecordings,
  onTogglePlayback,
  onToggleExpansion,
  onExportChunk,
  onDownloadAll,
  onFileProcessed,
  onProcessFile,
  getEngineStatus
}: TabContentProps) {
  return (
    <div className="tab-content">
      {selectedTab === 'record' && (
        <ErrorBoundary level="section" resetKeys={[recordingState.chunks.length]}>
          <div className="record-tab">
            <AudioRecorder
              recordingState={recordingState}
              isInitialized={isInitialized}
              isLoading={isLoading}
              onStartRecording={onStartRecording}
              onStopRecording={onStopRecording}
              onPauseRecording={onPauseRecording}
              onResumeRecording={onResumeRecording}
              onClearRecordings={onClearRecordings}
            />

            {/* Real-time waveform visualization during recording */}
            {shouldShowWaveform && (
              <div className="recording-visualization">
                <h3 className="visualization-title">
                  🎤 Live Recording Visualization
                </h3>
                <WaveformAnalyzer
                  stream={currentStream}
                  isActive={true}
                  isPaused={recordingState.isPaused}
                  label="Live Recording"
                  color="var(--accent-color, #52A32F)"
                  height={150}
                  className="live-waveform"
                  aria-label="Real-time audio waveform during recording"
                />
                
                {/* Real-time VAD visualization */}
                <RealTimeVad
                  metrics={metrics}
                  isActive={recordingState.isRecording}
                  className="live-vad"
                />
              </div>
            )}

            {recordingState.chunks.length > 0 && (
              <AsyncBoundary level="component" fallback={<div>Loading audio processor...</div>}>
                <AudioProcessor
                  chunks={recordingState.chunks}
                  isPlaying={recordingState.playingChunks}
                  expandedChunk={recordingState.expandedChunk}
                  onTogglePlayback={onTogglePlayback}
                  onToggleExpansion={onToggleExpansion}
                  onExportWav={(id) => onExportChunk(id, 'wav')}
                  onExportMp3={(id) => onExportChunk(id, 'mp3')}
                  onDownloadAll={onDownloadAll}
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
              onFileProcessed={onFileProcessed}
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
            processFile={onProcessFile}
          />
        </AsyncBoundary>
      )}
    </div>
  );
});