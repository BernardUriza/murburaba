import { SyncedWaveforms } from './SyncedWaveforms'

interface ProcessedChunk {
  id: string
  processedAudioUrl?: string
  originalAudioUrl?: string
  isPlaying: boolean
  isExpanded: boolean
  isValid?: boolean
  errorMessage?: string
  duration: number
  startTime: number
  endTime: number
  noiseRemoved: number
  metrics: {
    processingLatency: number
    frameCount: number
    inputLevel: number
    outputLevel: number
  }
}

interface ChunkProcessingResultsProps {
  chunks: ProcessedChunk[]
  averageNoiseReduction: number
  selectedChunk: string | null
  onTogglePlayback: (chunkId: string, type: 'original' | 'processed') => void
  onToggleExpansion: (chunkId: string) => void
  onClearAll: () => void
}

export function ChunkProcessingResults({
  chunks,
  averageNoiseReduction,
  selectedChunk,
  onTogglePlayback,
  onToggleExpansion,
  onClearAll
}: ChunkProcessingResultsProps) {
  if (chunks.length === 0) {
    return (
      <section className="chunks-section">
        <div className="glass-card text-center" style={{ padding: '4rem 2rem' }}>
          <div className="no-chunks">
            <div className="no-chunks-icon" style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.3 }}>🎵</div>
            <h3 className="no-chunks-text" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--neutral-700)' }}>No chunks processed yet</h3>
            <p className="no-chunks-sub" style={{ fontSize: '1rem', color: 'var(--neutral-500)' }}>Start recording to see processed audio chunks</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="chunks-section glass-panel">
      <div className="chunks-header">
        <h2 className="section-title">
          🎵 Processed Chunks ({chunks.length})
        </h2>
        <div className="chunks-stats">
          <span className="stat-badge">
            📉 Avg Reduction: {averageNoiseReduction.toFixed(1)}%
          </span>
          <button 
            className="control-btn secondary clear-btn"
            onClick={onClearAll}
          >
            <span>🧹 Clear All</span>
          </button>
        </div>
      </div>
      
      <div className="chunks-list">
        {chunks.map((chunk, index) => (
          <ChunkItem
            key={chunk.id}
            chunk={chunk}
            index={index}
            isSelected={selectedChunk === chunk.id}
            onTogglePlayback={onTogglePlayback}
            onToggleExpansion={onToggleExpansion}
          />
        ))}
      </div>
    </section>
  )
}

interface ChunkItemProps {
  chunk: ProcessedChunk
  index: number
  isSelected: boolean
  onTogglePlayback: (chunkId: string, type: 'original' | 'processed') => void
  onToggleExpansion: (chunkId: string) => void
}

function ChunkItem({ 
  chunk, 
  index, 
  isSelected, 
  onTogglePlayback, 
  onToggleExpansion 
}: ChunkItemProps) {
  const chunkClasses = [
    'chunk-item',
    chunk.isExpanded ? 'expanded' : '',
    chunk.isPlaying ? 'playing' : ''
  ].filter(Boolean).join(' ')

  return (
    <div className={chunkClasses}>
      <div className="chunk-main">
        {/* Chunk Info */}
        <div className="chunk-info">
          <span className="chunk-number">
            <span className="chunk-icon">🎼</span>
            #{index + 1}
          </span>
          <span className="chunk-duration">
            ⏱️ {(chunk.duration / 1000).toFixed(1)}s
          </span>
        </div>
        
        {/* Metrics */}
        <div className="chunk-stats">
          <div className="stat-item">
            <span className="stat-icon">🔇</span>
            <span className="stat-value">{chunk.noiseRemoved.toFixed(1)}%</span>
            <span className="stat-label">reduced</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">⚡</span>
            <span className="stat-value">{chunk.metrics.processingLatency.toFixed(0)}ms</span>
            <span className="stat-label">latency</span>
          </div>
        </div>
        
        {/* Noise Meter */}
        <div className="chunk-noise-meter">
          <div className="noise-bar">
            <div 
              className="noise-fill"
              style={{
                width: `${chunk.noiseRemoved}%`,
                background: `linear-gradient(90deg, 
                  hsl(${120 - chunk.noiseRemoved * 1.2}, 70%, 50%) 0%, 
                  hsl(${120 - chunk.noiseRemoved * 0.6}, 70%, 60%) 100%)`
              }}
            />
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="chunk-actions">
          {chunk.isValid === false ? (
            <div className="chunk-error" style={{ 
              color: 'var(--error-color, #ff4444)', 
              fontSize: '0.75rem',
              textAlign: 'center',
              padding: '0.5rem'
            }}>
              ⚠️ {chunk.errorMessage || 'Audio unavailable'}
            </div>
          ) : (
            <>
              <button 
                className={`action-btn play-original ${
                  chunk.isPlaying && isSelected ? 'active' : ''
                }`}
                onClick={() => onTogglePlayback(chunk.id, 'original')}
                disabled={!chunk.originalAudioUrl}
                title="Play Original"
              >
                <span className="btn-icon">🔊</span>
                <span className="btn-text">Original</span>
              </button>
              <button 
                className={`action-btn play-processed ${
                  chunk.isPlaying && isSelected ? 'active' : ''
                }`}
                onClick={() => onTogglePlayback(chunk.id, 'processed')}
                disabled={!chunk.processedAudioUrl}
                title="Play Enhanced"
              >
                <span className="btn-icon">🎵</span>
                <span className="btn-text">Enhanced</span>
              </button>
            </>
          )}
          <button 
            className="action-btn expand-btn"
            onClick={() => onToggleExpansion(chunk.id)}
            title={chunk.isExpanded ? 'Collapse' : 'Expand'}
          >
            <span className="btn-icon">{chunk.isExpanded ? '▲' : '▼'}</span>
          </button>
        </div>
      </div>
      
      {/* Expanded Details */}
      {chunk.isExpanded && (
        <div className="chunk-details">
          {/* Synced Waveforms */}
          <div className="waveforms-section">
            <SyncedWaveforms
              originalAudioUrl={chunk.originalAudioUrl}
              processedAudioUrl={chunk.processedAudioUrl}
              isPlaying={chunk.isPlaying}
              onPlayingChange={(playing) => {
                if (!playing && chunk.isPlaying) {
                  onTogglePlayback(chunk.id, 'processed')
                }
              }}
            />
          </div>
          
          {/* Technical Details */}
          <div className="technical-details">
            <h4 className="details-title">Technical Details</h4>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Start Time:</span>
                <span className="detail-value">
                  {new Date(chunk.startTime).toLocaleTimeString()}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">End Time:</span>
                <span className="detail-value">
                  {new Date(chunk.endTime).toLocaleTimeString()}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Processing Time:</span>
                <span className="detail-value">
                  {chunk.metrics.processingLatency.toFixed(2)}ms
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Frame Count:</span>
                <span className="detail-value">
                  {chunk.metrics.frameCount} frames
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Input Level:</span>
                <span className="detail-value">
                  {(chunk.metrics.inputLevel * 100).toFixed(1)}%
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Output Level:</span>
                <span className="detail-value">
                  {(chunk.metrics.outputLevel * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}