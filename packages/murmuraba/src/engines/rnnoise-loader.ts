/**
 * Direct RNNoise WASM Loader - NO MORE BULLSHIT
 * WASM files MUST be in /public directory
 */

declare global {
  interface Window {
    createRNNWasmModule?: any;
  }
}

export async function loadEmbeddedRNNoise(): Promise<any> {
  console.log('[RNNoise Loader] Loading from /public directory...');
  
  // Direct load from public - no tricks, no CDN, no bullshit
  const script = document.createElement('script');
  script.src = '/rnnoise.js';
  
  await new Promise((resolve, reject) => {
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load /public/rnnoise.js - FILE MUST BE COPIED MANUALLY'));
    document.head.appendChild(script);
  });
  
  if (!window.createRNNWasmModule) {
    throw new Error('createRNNWasmModule not found after loading script');
  }
  
  // Initialize with local WASM path
  return window.createRNNWasmModule({
    locateFile: (filename: string) => {
      if (filename.endsWith('.wasm')) {
        return '/' + filename; // Will load from /public/rnnoise.wasm
      }
      return filename;
    }
  });
}