/**
 * Murmuraba UI Components
 *
 * Component exports separated from core API
 */

// Audio Visualization
export { WaveformAnalyzer } from './WaveformAnalyzer';
export { SyncedWaveforms } from './SyncedWaveforms';

// Chunk Processing
export { ChunkProcessingResults } from './ChunkProcessingResults';
export { AudioPlayer } from './AudioPlayer';

// Metrics
export { AdvancedMetricsPanel } from './AdvancedMetricsPanel';

// Utilities
export { ErrorBoundary, withErrorBoundary } from './ErrorBoundary';
export {
  BuildInfo,
  BuildInfoBadge,
  BuildInfoBlock,
  BuildInfoInline,
  getPackageVersion,
  formatBuildDate,
} from './BuildInfo';

// Component types
export type { ChunkProcessingResultsProps } from './ChunkProcessingResults';
export type { AdvancedMetricsPanelProps } from './AdvancedMetricsPanel';
export type { AudioPlayerProps } from './AudioPlayer';
export type { BuildInfoProps } from './BuildInfo';

// Re-export React integration components
export * from '../react';
