import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import styles from './VadTimeline.module.css';

interface VadTimelineProps {
  vadData: Array<{ time: number; vad: number }>;
  chunkId: string;
}

export const VadTimeline = React.memo(function VadTimeline({ vadData, chunkId }: VadTimelineProps) {

  // Show loading state while data is being processed
  if (!vadData || vadData.length === 0) {
    return (
      <div className={styles.detailsSection}>
        <h4 className={styles.sectionTitle}>📈 Voice Activity Detection (VAD) Timeline</h4>
        <div className={styles.vadLoadingContainer}>
          <div className={styles.vadLoadingSpinner}>
            <div className={styles.spinnerDot}></div>
            <div className={styles.spinnerDot}></div>
            <div className={styles.spinnerDot}></div>
          </div>
          <p className={styles.vadLoadingText}>⚠️ No VAD data available for this chunk</p>
        </div>
      </div>
    );
  }

  const stats = useMemo(() => {
    const voiceDetectedPercentage = (vadData.filter(d => d.vad > 0.5).length / vadData.length) * 100;
    const peakVad = Math.max(...vadData.map(d => d.vad));
    const minVad = Math.min(...vadData.map(d => d.vad));
    return { voiceDetectedPercentage, peakVad, minVad };
  }, [vadData]);

  return (
    <div className={styles.detailsSection}>
      <h4 className={styles.sectionTitle}>📈 Voice Activity Detection (VAD) Timeline</h4>
      <div className={`${styles.vadChartContainer} ${styles.vadChartFadeIn}`}>
        {vadData && vadData.length > 0 ? (
          <div style={{ 
            height: '200px', 
            width: '100%',
            minHeight: '200px',
            minWidth: '300px',
            position: 'relative'
          }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={200}>
            <AreaChart data={vadData}>
              <defs>
                <linearGradient id={`vadGradient-${chunkId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7ED321" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#7ED321" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#3b3c5a" opacity={0.5} />
              <XAxis 
                dataKey="time" 
                stroke="#a0a0a0"
                tickFormatter={(value) => `${value.toFixed(1)}s`}
              />
              <YAxis 
                domain={[0, 1]} 
                stroke="#a0a0a0"
                ticks={[0, 0.25, 0.5, 0.75, 1]}
                tickFormatter={(value) => value.toFixed(2)}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(36, 37, 58, 0.95)', 
                  border: '1px solid #3b3c5a',
                  borderRadius: '8px',
                  color: '#e0e0e0'
                }}
                formatter={(value: number) => [`VAD: ${value.toFixed(3)}`, '']}
                labelFormatter={(label) => `Time: ${label}s`}
              />
              <Area 
                type="monotone" 
                dataKey="vad" 
                stroke="#7ED321" 
                fill={`url(#vadGradient-${chunkId})`}
                fillOpacity={1}
                strokeWidth={2}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        ) : (
          <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p>No VAD data available</p>
          </div>
        )}
        
        {/* Stats section */}
        {vadData && vadData.length > 0 && (
          <div className={styles.vadStats}>
          <span className={styles.vadStat}>
            <strong>Voice Detected:</strong> {stats.voiceDetectedPercentage.toFixed(1)}%
          </span>
          <span className={styles.vadStat}>
            <strong>Peak VAD:</strong> {stats.peakVad.toFixed(3)}
          </span>
          <span className={styles.vadStat}>
            <strong>Min VAD:</strong> {stats.minVad.toFixed(3)}
          </span>
        </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  if (prevProps.chunkId !== nextProps.chunkId) return false;
  if (!prevProps.vadData && !nextProps.vadData) return true;
  if (!prevProps.vadData || !nextProps.vadData) return false;
  if (prevProps.vadData.length !== nextProps.vadData.length) return false;
  
  // Deep comparison of first and last few data points
  const checkPoints = [0, 1, prevProps.vadData.length - 2, prevProps.vadData.length - 1];
  for (const i of checkPoints) {
    if (i >= 0 && i < prevProps.vadData.length) {
      if (prevProps.vadData[i]?.time !== nextProps.vadData[i]?.time ||
          prevProps.vadData[i]?.vad !== nextProps.vadData[i]?.vad) {
        return false;
      }
    }
  }
  return true;
});