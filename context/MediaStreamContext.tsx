import React, { createContext, useContext, useState, useCallback, useRef, PropsWithChildren } from 'react'

interface MediaStreamContextType {
  currentStream: MediaStream | null
  setStream: (stream: MediaStream | null) => void
  stopStream: () => void
}

const MediaStreamContext = createContext<MediaStreamContextType | undefined>(undefined)

export function MediaStreamProvider({ children }: PropsWithChildren) {
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null)
  const currentStreamRef = useRef<MediaStream | null>(null)

  const setStream = useCallback((stream: MediaStream | null) => {
    // Stop previous stream if exists
    if (currentStreamRef.current && currentStreamRef.current !== stream) {
      currentStreamRef.current.getTracks().forEach(track => track.stop())
    }
    currentStreamRef.current = stream
    setCurrentStream(stream)
  }, []) // Empty dependency array - no infinite loops!

  const stopStream = useCallback(() => {
    if (currentStreamRef.current) {
      currentStreamRef.current.getTracks().forEach(track => track.stop())
      currentStreamRef.current = null
      setCurrentStream(null)
    }
  }, []) // Empty dependency array - no infinite loops!

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      // Stop all tracks when the provider unmounts
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach(track => {
          track.stop()
        })
        currentStreamRef.current = null
      }
    }
  }, [])

  return (
    <MediaStreamContext.Provider value={{ currentStream, setStream, stopStream }}>
      {children}
    </MediaStreamContext.Provider>
  )
}

export function useMediaStream() {
  const context = useContext(MediaStreamContext)
  if (!context) {
    throw new Error('useMediaStream must be used within MediaStreamProvider')
  }
  return context
}