import type { AppProps } from 'next/app'
import '../src/styles/globals.css'
import '../src/styles/settings.css'
import '../src/styles/settings-modern.css'
import '../src/styles/settings-chat.css'
import '../src/styles/floating-panels.css'

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}