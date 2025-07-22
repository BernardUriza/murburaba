import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'

interface AudioPlayerProps {
  src?: string
  onPlayStateChange?: (isPlaying: boolean) => void
  className?: string
  label: string
  forceStop?: boolean
}

export default function AudioPlayer({ src, onPlayStateChange, className = '', label, forceStop = false }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // Format time with validation
  const formatTime = useCallback((t: number) => {
    if (!isFinite(t)) return '0:00'
    return `${Math.floor(t / 60)}:${(Math.floor(t % 60)).toString().padStart(2, '0')}`
  }, [])
  const progress = useMemo(() => duration > 0 && isFinite(duration) ? (currentTime / duration) * 100 : 0, [currentTime, duration])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !src) return

    // Limpieza: agrupa eventos, menos duplicación, menos leak.
    const handlers = {
      loadstart: () => setIsLoading(true),
      loadedmetadata: () => { 
        const dur = audio.duration
        setDuration(isFinite(dur) ? dur : 0)
        setIsLoading(false) 
      },
      timeupdate: () => setCurrentTime(audio.currentTime),
      ended: () => { setIsPlaying(false); setCurrentTime(0); onPlayStateChange?.(false) },
      error: () => { setIsLoading(false); setIsPlaying(false); console.error('Audio playback error') }
    }
    Object.entries(handlers).forEach(([evt, fn]) => audio.addEventListener(evt, fn as any))
    return () => Object.entries(handlers).forEach(([evt, fn]) => audio.removeEventListener(evt, fn as any))
  }, [src, onPlayStateChange])

  // Detener cuando forceStop cambia a true
  useEffect(() => {
    if (forceStop && isPlaying && audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
      onPlayStateChange?.(false)
    }
  }, [forceStop, isPlaying, onPlayStateChange])

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current || !src) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
      onPlayStateChange?.(false)
    } else {
      audioRef.current.play().catch(err => { console.error('Playback failed:', err); setIsPlaying(false) })
      setIsPlaying(true)
      onPlayStateChange?.(true)
    }
  }, [isPlaying, onPlayStateChange, src])

  // Minimalismo afilado, sin perder UX
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return
    const { left, width } = e.currentTarget.getBoundingClientRect()
    const newTime = ((e.clientX - left) / width) * duration
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }, [duration])

  if (!src) return (
    <div className={`audio-player disabled ${className}`}>
      <button className="play-button" disabled><span className="play-icon">▶️</span></button>
      <span className="player-label">{label} - No audio</span>
    </div>
  )

  return (
    <div className={`audio-player ${className} ${isPlaying ? 'playing' : ''}`}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button className="play-button" onClick={togglePlayPause} disabled={isLoading}>
        {isLoading ? <span className="loading-icon">⏳</span> : isPlaying ? <span className="pause-icon">⏸️</span> : <span className="play-icon">▶️</span>}
      </button>
      <div className="player-info">
        <span className="player-label">{label}</span>
        <div className="progress-container" onClick={handleSeek}>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
          <span className="time-display">{formatTime(currentTime)}</span>
        </div>
      </div>
    </div>
  )
}
