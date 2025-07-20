import { SyncedWaveforms } from './SyncedWaveforms'
import styles from './ChunkProcessingResults.module.css'

interface ProcessedChunk {
  id: string
  processedAudioUrl?: string
  originalAudioUrl?: string
  isPlaying: boolean
  isExpanded: boolean
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
      <section className={`${styles.chunksSection} ${styles.glassPanel}`}>
        <div className={styles.noChunks}>
          <div className={styles.noChunksIcon}>🎵</div>
          <div className={styles.noChunksText}>No chunks processed yet</div>
          <div className={styles.noChunksSub}>Start recording to see processed audio chunks</div>
        </div>
      </section>
    )
  }

  return (
    <section className={`${styles.chunksSection} ${styles.glassPanel}`}>
      <div className={styles.chunksHeader}>
        <h2 className={styles.sectionTitle}>
          🎵 Processed Chunks ({chunks.length})
        </h2>
        <div className={styles.chunksStats}>
          <span className={styles.statBadge}>
            📉 Avg Reduction: {averageNoiseReduction.toFixed(1)}%
          </span>
          <button 
            className={`${styles.controlBtn} ${styles.secondary} ${styles.clearBtn}`}
            onClick={onClearAll}
          >
            <span>🧹 Clear All</span>
          </button>
        </div>
      </div>
      
      <div className={styles.chunksList}>
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
    styles.chunkItem,
    chunk.isExpanded ? styles.expanded : '',
    chunk.isPlaying ? styles.playing : ''
  ].filter(Boolean).join(' ')

  return (
    <div className={chunkClasses}>
      <div className={styles.chunkMain}>
        {/* Chunk Info */}
        <div className={styles.chunkInfo}>
          <span className={styles.chunkNumber}>
            <span className={styles.chunkIcon}>🎼</span>
            #{index + 1}
          </span>
          <span className={styles.chunkDuration}>
            ⏱️ {(chunk.duration / 1000).toFixed(1)}s
          </span>
        </div>
        
        {/* Metrics */}
        <div className={styles.chunkStats}>
          <div className={styles.statItem}>
            <span className={styles.statIcon}>🔇</span>
            <span className={styles.statValue}>{chunk.noiseRemoved.toFixed(1)}%</span>
            <span className={styles.statLabel}>reduced</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statIcon}>⚡</span>
            <span className={styles.statValue}>{chunk.metrics.processingLatency.toFixed(0)}ms</span>
            <span className={styles.statLabel}>latency</span>
          </div>
        </div>
        
        {/* Noise Meter */}
        <div className={styles.chunkNoiseMeter}>
          <div className={styles.noiseBar}>
            <div 
              className={styles.noiseFill}
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
        <div className={styles.chunkActions}>
          <button 
            className={`${styles.actionBtn} ${styles.playOriginal} ${
              chunk.isPlaying && isSelected ? styles.active : ''
            }`}
            onClick={() => onTogglePlayback(chunk.id, 'original')}
            disabled={!chunk.originalAudioUrl}
            title="Play Original"
          >
            <span className={styles.btnIcon}>🔊</span>
            <span className={styles.btnText}>Original</span>
          </button>
          <button 
            className={`${styles.actionBtn} ${styles.playProcessed} ${
              chunk.isPlaying && isSelected ? styles.active : ''
            }`}
            onClick={() => onTogglePlayback(chunk.id, 'processed')}
            disabled={!chunk.processedAudioUrl}
            title="Play Enhanced"
          >
            <span className={styles.btnIcon}>🎵</span>
            <span className={styles.btnText}>Enhanced</span>
          </button>
          <button 
            className={`${styles.actionBtn} ${styles.expandBtn}`}
            onClick={() => onToggleExpansion(chunk.id)}
            title={chunk.isExpanded ? 'Collapse' : 'Expand'}
          >
            <span className={styles.btnIcon}>{chunk.isExpanded ? '▲' : '▼'}</span>
          </button>
        </div>
      </div>
      
      {/* Expanded Details */}
      {chunk.isExpanded && (
        <div className={styles.chunkDetails}>
          {/* Synced Waveforms */}
          <div className={styles.waveformsSection}>
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
          <div className={styles.technicalDetails}>
            <h4 className={styles.detailsTitle}>Technical Details</h4>
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Start Time:</span>
                <span className={styles.detailValue}>
                  {new Date(chunk.startTime).toLocaleTimeString()}
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>End Time:</span>
                <span className={styles.detailValue}>
                  {new Date(chunk.endTime).toLocaleTimeString()}
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Processing Time:</span>
                <span className={styles.detailValue}>
                  {chunk.metrics.processingLatency.toFixed(2)}ms
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Frame Count:</span>
                <span className={styles.detailValue}>
                  {chunk.metrics.frameCount} frames
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Input Level:</span>
                <span className={styles.detailValue}>
                  {(chunk.metrics.inputLevel * 100).toFixed(1)}%
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Output Level:</span>
                <span className={styles.detailValue}>
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