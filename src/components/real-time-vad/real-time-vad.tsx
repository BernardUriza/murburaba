import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ProcessingMetrics } from 'murmuraba';

interface IRealTimeVadProps {
  metrics?: ProcessingMetrics | null;
  isActive?: boolean;
  className?: string;
}

interface VadMetrics {
  currentVad: number;
  averageVad: number;
  peakVad: number;
  voiceDetectedPercentage: number;
  sampleCount: number;
}

export function RealTimeVad({ 
  metrics, 
  isActive = true, 
  className = '' 
}: IRealTimeVadProps) {
  const [vadMetrics, setVadMetrics] = useState<VadMetrics>({
    currentVad: 0,
    averageVad: 0,
    peakVad: 0,
    voiceDetectedPercentage: 0,
    sampleCount: 0
  });
  
  const vadHistoryRef = useRef<number[]>([]);
  const animationRef = useRef<number>(0);
  const lastUpdateTimeRef = useRef<number>(0);

  // Update VAD metrics from engine metrics
  const updateVadMetrics = useCallback(() => {
    if (!metrics || !isActive) return;

    const now = Date.now();
    
    // Adaptive throttling: faster updates during voice activity
    const currentVad = metrics.vadLevel || metrics.averageVad || 0;
    const throttleMs = currentVad > 0.1 ? 16 : 33; // 60 FPS during voice, 30 FPS otherwise
    
    if (now - lastUpdateTimeRef.current < throttleMs) return;
    lastUpdateTimeRef.current = now;

    // Extract VAD data from engine metrics - prefer real-time vadLevel
    // Debug: Log when metrics are received with significant activity
    if (currentVad > 0.01) {
      console.log(`🎯 RealTimeVad: vadLevel=${metrics.vadLevel?.toFixed(3)}, averageVad=${metrics.averageVad?.toFixed(3)}, using=${currentVad.toFixed(3)}`);
    }
    
    // Add to history (keep last 100 samples for rolling average)
    vadHistoryRef.current.push(currentVad);
    if (vadHistoryRef.current.length > 100) {
      vadHistoryRef.current.shift();
    }

    const history = vadHistoryRef.current;
    const averageVad = history.length > 0 
      ? history.reduce((sum, val) => sum + val, 0) / history.length 
      : 0;
    
    const peakVad = history.length > 0 ? Math.max(...history) : 0;
    const voiceDetectedPercentage = history.length > 0
      ? (history.filter(val => val > 0.5).length / history.length) * 100
      : 0;

    setVadMetrics({
      currentVad,
      averageVad,
      peakVad,
      voiceDetectedPercentage,
      sampleCount: history.length
    });
  }, [metrics, isActive]);

  // Animation loop for smooth updates
  useEffect(() => {
    if (!isActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = 0;
      }
      return;
    }

    const animate = () => {
      updateVadMetrics();
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = 0;
      }
    };
  }, [isActive, updateVadMetrics]);

  // Reset metrics when not active
  useEffect(() => {
    if (!isActive) {
      vadHistoryRef.current = [];
      setVadMetrics({
        currentVad: 0,
        averageVad: 0,
        peakVad: 0,
        voiceDetectedPercentage: 0,
        sampleCount: 0
      });
    }
  }, [isActive]);

  if (!isActive) return null;

  const { currentVad, averageVad, peakVad, voiceDetectedPercentage } = vadMetrics;
  const vadPercentage = currentVad * 100;
  const vadLevel = vadPercentage > 70 ? 'high' : vadPercentage > 30 ? 'medium' : 'low';

  return (
    <div className={`real-time-vad ${className}`} data-vad-level={vadLevel}>
      <div className="real-time-vad__header">
        <span className="real-time-vad__icon" aria-hidden="true">📊</span>
        <h4 className="real-time-vad__title">Live Voice Activity Detection</h4>
        <div className={`real-time-vad__status real-time-vad__status--${vadLevel}`}>
          {vadLevel === 'high' ? '🟢 High' : 
           vadLevel === 'medium' ? '🟡 Medium' : 
           '🔴 Low'}
        </div>
      </div>
      
      <div className="real-time-vad__primary">
        <div className="real-time-vad__metric real-time-vad__metric--featured">
          <span className="vad-metric__label">Current VAD</span>
          <span className="vad-metric__value vad-metric__value--large">
            {currentVad.toFixed(3)}
          </span>
          <div className="vad-metric__bar">
            <div 
              className={`vad-metric__fill vad-metric__fill--${vadLevel}`}
              style={{ 
                width: `${vadPercentage}%`,
                transition: 'width 0.1s ease-out'
              }}
              role="progressbar"
              aria-valuenow={vadPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Current voice activity ${vadPercentage.toFixed(1)}%`}
            />
          </div>
        </div>
      </div>

      <div className="real-time-vad__secondary">
        <div className="real-time-vad__metric">
          <span className="vad-metric__label">Avg VAD</span>
          <span className="vad-metric__value">{averageVad.toFixed(3)}</span>
          <div className="vad-metric__bar vad-metric__bar--small">
            <div 
              className="vad-metric__fill vad-metric__fill--secondary"
              style={{ width: `${averageVad * 100}%` }}
            />
          </div>
        </div>
        
        <div className="real-time-vad__metric">
          <span className="vad-metric__label">Peak VAD</span>
          <span className="vad-metric__value">{peakVad.toFixed(3)}</span>
          <div className="vad-metric__bar vad-metric__bar--small">
            <div 
              className="vad-metric__fill vad-metric__fill--peak"
              style={{ width: `${peakVad * 100}%` }}
            />
          </div>
        </div>
        
        <div className="real-time-vad__metric">
          <span className="vad-metric__label">Voice Detected</span>
          <span className="vad-metric__value">{voiceDetectedPercentage.toFixed(1)}%</span>
        </div>
      </div>

      <style jsx>{`
        .real-time-vad {
          background: var(--card-bg, #1a1b23);
          border: 1px solid var(--border-color, #2a2d3a);
          border-radius: 12px;
          padding: 1rem;
          margin: 1rem 0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .real-time-vad__header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .real-time-vad__icon {
          font-size: 1.2rem;
        }

        .real-time-vad__title {
          color: var(--text-primary, #ffffff);
          font-size: 1rem;
          font-weight: 600;
          margin: 0;
          flex: 1;
        }

        .real-time-vad__status {
          font-size: 0.875rem;
          font-weight: 500;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }

        .real-time-vad__status--high {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        .real-time-vad__status--medium {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }

        .real-time-vad__status--low {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .real-time-vad__primary {
          margin-bottom: 1rem;
        }

        .real-time-vad__metric--featured {
          text-align: center;
        }

        .real-time-vad__secondary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 1rem;
        }

        .real-time-vad__metric {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .vad-metric__label {
          color: var(--text-secondary, #9ca3af);
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .vad-metric__value {
          color: var(--text-primary, #ffffff);
          font-size: 0.875rem;
          font-weight: 600;
          font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
        }

        .vad-metric__value--large {
          font-size: 1.5rem;
          margin: 0.5rem 0;
        }

        .vad-metric__bar {
          height: 20px;
          background: var(--bg-secondary, #2a2d3a);
          border-radius: 10px;
          overflow: hidden;
          position: relative;
        }

        .vad-metric__bar--small {
          height: 8px;
        }

        .vad-metric__fill {
          height: 100%;
          border-radius: inherit;
          transition: width 0.2s ease-out;
        }

        .vad-metric__fill--high {
          background: linear-gradient(90deg, #22c55e, #16a34a);
          box-shadow: 0 0 10px rgba(34, 197, 94, 0.3);
        }

        .vad-metric__fill--medium {
          background: linear-gradient(90deg, #f59e0b, #d97706);
          box-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
        }

        .vad-metric__fill--low {
          background: linear-gradient(90deg, #ef4444, #dc2626);
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
        }

        .vad-metric__fill--secondary {
          background: linear-gradient(90deg, #6366f1, #4f46e5);
        }

        .vad-metric__fill--peak {
          background: linear-gradient(90deg, #ec4899, #db2777);
        }
      `}</style>
    </div>
  );
}