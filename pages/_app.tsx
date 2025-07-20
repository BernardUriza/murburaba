import '../styles/globals.css'
import 'sweetalert2/dist/sweetalert2.min.css'
import type { AppProps } from 'next/app'
import { ErrorBoundary } from '../components/ErrorBoundary'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <Component {...pageProps} />
    </ErrorBoundary>
  )
}