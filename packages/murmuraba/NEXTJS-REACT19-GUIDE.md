# Guía de Integración: Murmuraba con Next.js 14+ y React 19

## Problema Resuelto

Murmuraba ahora es totalmente compatible con React 19 y Next.js 14+. El error `TypeError: Cannot read properties of undefined (reading 'ReactCurrentDispatcher')` ha sido resuelto.

## Cambios Implementados

1. **React como External**: React ya no se bundlea con Murmuraba, evitando conflictos de versiones
2. **Soporte Explícito para React 19**: PeerDependencies actualizadas para incluir React 19
3. **Configuración de Build Optimizada**: Rollup configurado para manejar React como dependencia externa

## Instalación

```bash
npm install murmuraba
# o
pnpm add murmuraba
# o
yarn add murmuraba
```

## Uso con Next.js 14+

### 1. Importación Dinámica (Recomendado para Client Components)

```typescript
'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Importación dinámica con SSR deshabilitado
const MurmubaraComponent = dynamic(
  () => import('murmuraba').then(mod => ({ default: mod.useMurmubaraEngine })),
  { ssr: false }
);

export default function AudioProcessor() {
  const [EngineHook, setEngineHook] = useState(null);

  useEffect(() => {
    // Cargar Murmuraba dinámicamente
    import('murmuraba').then(mod => {
      setEngineHook(() => mod.useMurmubaraEngine);
    });
  }, []);

  if (!EngineHook) return <div>Loading audio engine...</div>;

  return <AudioEngineComponent EngineHook={EngineHook} />;
}

function AudioEngineComponent({ EngineHook }) {
  const engine = EngineHook({
    autoInitialize: true,
    onInitError: (error) => console.error('Init error:', error)
  });

  // Tu lógica aquí
  return <div>Audio Engine Ready: {engine.isInitialized ? 'Yes' : 'No'}</div>;
}
```

### 2. Uso Directo en Client Components

```typescript
'use client';

import { useMurmubaraEngine } from 'murmuraba';

export default function AudioProcessor() {
  const {
    isInitialized,
    isLoading,
    error,
    initialize,
    processFile,
    startRecording,
    stopRecording,
    recordingState
  } = useMurmubaraEngine({
    autoInitialize: false
  });

  const handleFileUpload = async (file: File) => {
    if (!isInitialized) {
      await initialize();
    }
    
    const result = await processFile(file);
    console.log('Processing result:', result);
  };

  return (
    <div>
      {error && <div>Error: {error}</div>}
      {isLoading && <div>Loading...</div>}
      {/* Tu UI aquí */}
    </div>
  );
}
```

### 3. Inicialización Manual

```typescript
'use client';

import { initializeAudioEngine, processFile } from 'murmuraba';

export default function ManualAudioProcessor() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeAudioEngine({
          defaultChunkDuration: 10,
          enableAGC: true
        });
        setReady(true);
      } catch (error) {
        console.error('Failed to initialize:', error);
      }
    };

    init();
  }, []);

  // Tu lógica aquí
}
```

## Configuración de Next.js

No se requiere configuración especial en `next.config.js`. Murmuraba detecta automáticamente el entorno de Next.js.

## Notas Importantes

1. **Client Components Only**: Murmuraba requiere APIs del navegador (WebAudio, MediaDevices) por lo que debe usarse en Client Components (`'use client'`)

2. **Dynamic Import**: Para evitar problemas de hidratación, se recomienda usar importación dinámica con `ssr: false`

3. **React 19 Mode**: Si experimentas problemas, puedes activar el modo React 19 explícitamente:
   ```typescript
   const engine = useMurmubaraEngine({
     react19Mode: true
   });
   ```

## Troubleshooting

### Error: Window is not defined
- Asegúrate de usar `'use client'` directive
- Usa importación dinámica con `ssr: false`

### Error: ReactCurrentDispatcher
- Actualiza a la última versión de Murmuraba
- Verifica que no tengas múltiples versiones de React instaladas

## Ejemplo Completo

```typescript
'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const AudioEngine = dynamic(
  () => import('murmuraba').then(mod => mod.useMurmubaraEngine),
  { 
    ssr: false,
    loading: () => <p>Loading audio engine...</p>
  }
);

export default function AudioPage() {
  return (
    <div className="p-4">
      <h1>Audio Processor with Murmuraba</h1>
      <AudioProcessor />
    </div>
  );
}

function AudioProcessor() {
  const engine = AudioEngine({
    autoInitialize: true,
    defaultChunkDuration: 10,
    enableAGC: true,
    onInitError: (error) => {
      console.error('Failed to initialize audio engine:', error);
    }
  });

  const handleRecord = async () => {
    if (!engine.isInitialized) {
      await engine.initialize();
    }
    await engine.startRecording();
  };

  return (
    <div>
      <button onClick={handleRecord} disabled={!engine.isInitialized}>
        Start Recording
      </button>
      {engine.recordingState.isRecording && (
        <div>Recording: {engine.formatTime(engine.recordingState.recordingTime)}</div>
      )}
    </div>
  );
}
```

## Versiones Soportadas

- React: 16.8.0+, 17.x, 18.x, 19.x
- Next.js: 13.x, 14.x, 15.x
- Node.js: 14.0.0+

## Reportar Problemas

Si encuentras algún problema con React 19 o Next.js 14+, por favor abre un issue en:
https://github.com/BernardUriza/murmuraba/issues