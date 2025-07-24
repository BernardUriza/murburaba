import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Line } from 'recharts';

interface VadTimelineProps {
  vadData: Array<{ time: number; vad: number }>;
  chunkId: string;
}

export function VadTimeline({ vadData, chunkId }: VadTimelineProps) {
  console.log(`🔍 VadTimeline render: chunkId=${chunkId}, vadData length=${vadData?.length || 0}`);
  
  // Show loading state while data is being processed
  if (!vadData || vadData.length === 0) {
    return (
      <div className="details__section">
        <h4 className="section__title">📈 Voice Activity Detection (VAD) Timeline</h4>
        <div className="vad-loading-container">
          <div className="vad-loading-spinner">
            <div className="spinner-dot"></div>
            <div className="spinner-dot"></div>
            <div className="spinner-dot"></div>
          </div>
          <p className="vad-loading-text">Analizando actividad de voz, por favor espera...</p>
        </div>
      </div>
    );
  }

  const voiceDetectedPercentage = (vadData.filter(d => d.vad > 0.5).length / vadData.length) * 100;
  const peakVad = Math.max(...vadData.map(d => d.vad));
  const minVad = Math.min(...vadData.map(d => d.vad));

  return (
    <div className="details__section">
      <h4 className="section__title">📈 Voice Activity Detection (VAD) Timeline</h4>
      <div className="vad-chart-container">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart
            data={vadData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={`vadGradient-${chunkId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7ED321" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#7ED321" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis 
              dataKey="time" 
              tickFormatter={(value) => `${value.toFixed(1)}s`}
              stroke="#666"
            />
            <YAxis 
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tickFormatter={(value) => value.toFixed(2)}
              stroke="#666"
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                border: '1px solid #ddd',
                borderRadius: '8px'
              }}
              formatter={(value: number) => [`VAD: ${value.toFixed(3)}`, '']}
              labelFormatter={(label) => `Time: ${label}s`}
            />
            <Area 
              type="monotone" 
              dataKey="vad" 
              stroke="#7ED321" 
              strokeWidth={2}
              fill={`url(#vadGradient-${chunkId})`}
            />
            <Line 
              type="monotone" 
              dataKey="vad" 
              stroke="#5FB829" 
              strokeWidth={0}
              dot={{ fill: '#7ED321', r: 0 }}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="vad-stats">
          <span className="vad-stat">
            <strong>Voice Detected:</strong> {voiceDetectedPercentage.toFixed(1)}%
          </span>
          <span className="vad-stat">
            <strong>Peak VAD:</strong> {peakVad.toFixed(3)}
          </span>
          <span className="vad-stat">
            <strong>Min VAD:</strong> {minVad.toFixed(3)}
          </span>
        </div>
      </div>
    </div>
  );
}