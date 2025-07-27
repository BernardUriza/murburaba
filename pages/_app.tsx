import type { AppProps } from 'next/app'
import { MurmurabaReduxProvider } from '../providers/MurmurabaReduxProvider'
import { MediaStreamProvider } from '../context/MediaStreamContext'
import { GlobalAudioMonitor } from '../components/GlobalAudioMonitor'
import { ServiceMonitor } from '../components/ServiceMonitor'
import '../styles/globals.css'
import '../styles/components.css'

export default function App({ Component, pageProps }: AppProps) {
  const isDev = process.env.NODE_ENV === 'development'
  
  return (
    <MurmurabaReduxProvider
      // MurmurabaSuite configuration
      logLevel={isDev ? 'debug' : 'warn'}
      algorithm="rnnoise"
      enableAGC={false}
      noiseReductionLevel="medium"
      allowDegraded={true}
      lazy={false} // Changed to false to ensure services are available
      showAudioMonitoring={isDev}
    >
      <MediaStreamProvider>
        {/* Global monitoring components */}
        {isDev && (
          <>
            <GlobalAudioMonitor />
            <ServiceMonitor />
          </>
        )}
        
        <Component {...pageProps} />
      </MediaStreamProvider>
    </MurmurabaReduxProvider>
  )
}