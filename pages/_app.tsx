import type { AppProps } from 'next/app'
import { MurmurabaReduxProvider } from '../providers/MurmurabaReduxProvider'
import { MediaStreamProvider } from '../context/MediaStreamContext'
import '../styles/globals.css'
import '../styles/components.css'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <MurmurabaReduxProvider
      // MurmurabaSuite configuration
      logLevel={process.env.NODE_ENV === 'development' ? 'debug' : 'warn'}
      algorithm="rnnoise"
      enableAGC={false}
      noiseReductionLevel="medium"
      allowDegraded={true}
      lazy={true} // Important for Next.js - lazy load services to avoid SSR issues
    >
      <MediaStreamProvider>
        <Component {...pageProps} />
      </MediaStreamProvider>
    </MurmurabaReduxProvider>
  )
}