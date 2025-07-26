import React, { createContext, useContext, useState, useCallback, PropsWithChildren } from 'react'

interface MediaStreamContextType {
  currentStream: MediaStream | null
  setStream: (stream: MediaStream | null) => void
  stopStream: () => void
}

const MediaStreamContext = createContext<MediaStreamContextType | undefined>(undefined)

export function MediaStreamProvider({ children }: PropsWithChildren) {
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null)

  const setStream = useCallback((stream: MediaStream | null) => {
    // Stop previous stream if exists
    if (currentStream && currentStream !== stream) {
      currentStream.getTracks().forEach(track => track.stop())
    }
    setCurrentStream(stream)
  }, [currentStream])

  const stopStream = useCallback(() => {
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop())
      setCurrentStream(null)
    }
  }, [currentStream])

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