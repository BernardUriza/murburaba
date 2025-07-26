/**
 * 🎨 Murmuraba UI Components API
 * 
 * Separate export for UI components to keep API functions clean.
 * Import components from 'murmuraba/components' for better code organization.
 */

// Audio Visualization Components
export { SimpleWaveformAnalyzer } from './components/SimpleWaveformAnalyzer';
export { WaveformAnalyzer } from './components/WaveformAnalyzer';
export { SyncedWaveforms } from './components/SyncedWaveforms';

// Chunk Processing & Display
export { ChunkProcessingResults } from './components/ChunkProcessingResults';
export { AudioPlayer } from './components/AudioPlayer';

// Metrics & Monitoring
export { AdvancedMetricsPanel } from './components/AdvancedMetricsPanel';

// Utility Components
export { ErrorBoundary, withErrorBoundary } from './components/ErrorBoundary';
export { 
  BuildInfo, 
  BuildInfoBadge, 
  BuildInfoBlock, 
  BuildInfoInline,
  getPackageVersion,
  formatBuildDate 
} from './components/BuildInfo';

// Re-export component types
export type { SimpleWaveformAnalyzerProps } from './components/SimpleWaveformAnalyzer';
export type { ChunkProcessingResultsProps } from './components/ChunkProcessingResults';
export type { AdvancedMetricsPanelProps } from './components/AdvancedMetricsPanel';
export type { AudioPlayerProps } from './components/AudioPlayer';
export type { BuildInfoProps } from './components/BuildInfo';