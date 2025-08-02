import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import './styles/floating-panels.css'
import './styles/settings.css'
import { preloader } from '../packages/murmuraba/src/utils/resource-preloader'

// Start preloading critical resources immediately
preloader.preloadCriticalResources()

// Preload WASM module before app starts
import('../packages/murmuraba/src/utils/rnnoise-loader').then(({ preloadRNNoiseWASM }) => {
  preloadRNNoiseWASM().catch(err => {
    console.warn('[Main] WASM preload failed:', err);
  });
});

// Render app immediately (preloading happens in parallel)
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)