'use client'

import React, { useState, useEffect } from 'react'
import { useMediaStream } from '../context/MediaStreamContext'
import AudioDemo from '../components/AudioDemo'
import { Settings } from '../components/Settings'
import { CopilotChat } from '../components/CopilotChat'
import { MurmurabaSuiteStatus } from '../components/MurmurabaSuiteStatus'
import { OverlayPanel } from '../components/ui/OverlayPanel'
import { StudioHeader } from '../components/ui/StudioHeader'
import { ProcessingBar } from '../components/ui/ProcessingBar'
import { ControlPanel } from '../components/ui/ControlPanel'
import { FabButtons } from '../components/ui/FabButtons'
import { useNotifications } from '../hooks/useNotifications'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { useAudioProcessor } from '../hooks/useAudioProcessor'
import {
  setChunkDuration,
  setEnableAGC,
  setCurrentStreamId
} from '../store/slices/audioSlice'
import {
  toggleAudioDemo,
  toggleAdvancedMetrics,
  toggleSettings,
  toggleCopilot
} from '../store/slices/uiSlice'
import {
  selectEngineStatus,
  selectAudioConfig,
  selectUIFlags,
  shallowEqual
} from '../store/selectors'

export default function App() {
  const [mounted, setMounted] = useState(false)
  const dispatch = useAppDispatch()
  const { notify } = useNotifications()
  
  // Redux selectors
  const engineStatus = useAppSelector(selectEngineStatus, shallowEqual)
  const audioConfig = useAppSelector(selectAudioConfig, shallowEqual)
  const uiFlags = useAppSelector(selectUIFlags, shallowEqual)
  
  // Media stream context
  const { setStream, stopStream } = useMediaStream()
  
  // Destructured state
  const { isInitialized, isProcessing, isRecording } = engineStatus
  const { chunkDuration, enableAGC } = audioConfig
  const { showAudioDemo, showAdvancedMetrics, showSettings, showCopilot } = uiFlags
  
  // Audio processor hook
  const { isReady, processRecording, cancelProcessing } = useAudioProcessor()

  useEffect(() => { setMounted(true) }, [])

  // Event handlers
  const handleInitializeEngine = async () => {
    if (isReady) return notify('info', 'Audio engine already initialized!')
    notify('info', 'Waiting for MurmurabaSuite...')
  }

  const handleStartRecording = async () => {
    if (!isReady) {
      return notify('warning', 'MurmurabaSuite Not Ready', 'Please wait for the audio engine to initialize')
    }
    
    try {
      notify('info', 'Starting microphone recording...')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: enableAGC }
      })
      setStream(stream)
      dispatch(setCurrentStreamId(stream.id))
      
      const result = await processRecording(chunkDuration * 1000, {})
      if (result) notify('success', 'Recording completed successfully!')
    } catch (error: any) {
      notify('error', 'Recording Failed', error?.message || 'Unknown error')
    } finally {
      stopStream()
    }
  }

  const handleStopRecording = () => {
    cancelProcessing()
    stopStream()
  }

  // Loading state
  if (!mounted) {
    return (
      <main className="main-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <span>Loading...</span>
        </div>
      </main>
    )
  }

  return (
    <>
      <main className="main-container">
        {/* Audio Demo Panel */}
        <OverlayPanel show={showAudioDemo} onClose={() => dispatch(toggleAudioDemo())}>
          <AudioDemo
            autoProcess
            onProcessComplete={() => notify('success', '¡Audio procesado exitosamente!')}
            onError={err => notify('error', 'Error al procesar audio', err.message)}
          />
        </OverlayPanel>

        {/* Studio Header */}
        <StudioHeader isProcessing={isProcessing} isInitialized={isInitialized} />

        {/* Processing Status Bar */}
        {isProcessing && <ProcessingBar isRecording={isRecording} />}

        {/* Control Panel */}
        <ControlPanel
          isReady={isReady}
          isProcessing={isProcessing}
          isRecording={isRecording}
          enableAGC={enableAGC}
          chunkDuration={chunkDuration}
          onInit={handleInitializeEngine}
          onRecord={handleStartRecording}
          onStop={handleStopRecording}
          onSetAGC={v => dispatch(setEnableAGC(v))}
          onSetDuration={d => dispatch(setChunkDuration(d))}
        />

        {/* Redux Demo */}
        <ReduxDemo />

        {/* Floating Action Buttons */}
        <FabButtons
          showAudioDemo={showAudioDemo}
          showAdvancedMetrics={showAdvancedMetrics}
          showSettings={showSettings}
          showCopilot={showCopilot}
          isEngineInitialized={isInitialized}
          onAudioDemo={() => dispatch(toggleAudioDemo())}
          onAdvancedMetrics={() => dispatch(toggleAdvancedMetrics())}
          onSettings={() => dispatch(toggleSettings())}
          onCopilot={() => dispatch(toggleCopilot())}
        />

        {/* Settings Modal */}
        <Settings
          isOpen={showSettings}
          onClose={() => dispatch(toggleSettings())}
          vadThresholds={{ silence: 0.3, voice: 0.5, clearVoice: 0.7 }}
          displaySettings={{ showVadValues: true, showVadTimeline: true }}
          onThresholdChange={t => console.log('Thresholds changed:', t)}
          onDisplayChange={s => console.log('Display settings changed:', s)}
        />

        {/* Copilot Chat Modal */}
        <CopilotChat
          isOpen={showCopilot}
          onClose={() => dispatch(toggleCopilot())}
          engineConfig={{}}
          setEngineConfig={() => {}}
          isRecording={isRecording}
          isInitialized={isInitialized}
          onApplyChanges={async () => console.log('Apply changes')}
        />
      </main>
      
      {/* Development Status */}
      <MurmurabaSuiteStatus />
    </>
  )
}