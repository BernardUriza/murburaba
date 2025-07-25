# Murmuraba Chunking API

## Resumen de cambios

Se ha mejorado `processFileWithMetrics` para soportar procesamiento por chunks con conversión automática a diferentes formatos de audio.

## Nueva API

```typescript
interface ChunkOptions {
  chunkDuration: number; // Duración en milisegundos
  outputFormat: 'wav' | 'webm' | 'raw'; // Formato de salida
}

interface ProcessedChunk {
  blob: Blob; // Chunk en formato especificado, listo para usar
  startTime: number; // Tiempo de inicio en ms
  endTime: number; // Tiempo de fin en ms
  duration: number; // Duración en ms
  vadScore: number; // Puntuación VAD promedio del chunk
  metrics: {
    noiseRemoved: number; // Estimación de ruido eliminado
    averageLevel: number; // Nivel RMS promedio
    vad: number; // VAD promedio
  };
}

interface ProcessFileResult {
  chunks: ProcessedChunk[]; // Array de chunks procesados
  processedBuffer: ArrayBuffer; // Audio completo procesado
  averageVad: number; // VAD promedio de todo el audio
  totalDuration: number; // Duración total en ms
  metadata: {
    sampleRate: number; // Frecuencia de muestreo
    channels: number; // Número de canales
    originalDuration: number; // Duración original en ms
  };
}

interface ProcessFileOptions {
  enableVAD?: boolean;
  chunkOptions?: ChunkOptions;
  onFrameProcessed?: (metrics: ProcessingMetrics) => void;
}
```

## Ejemplo de uso

```typescript
import { processFileWithMetrics } from 'murmuraba';

// Procesar archivo con chunks de 8 segundos
const result = await processFileWithMetrics(arrayBuffer, {
  enableVAD: true,
  chunkOptions: {
    chunkDuration: 8000, // 8 segundos
    outputFormat: 'wav' // Chunks como WAV blobs
  },
  onFrameProcessed: (metrics) => {
    // Callback opcional para métricas en tiempo real
    console.log('Frame', metrics.frame, 'VAD:', metrics.vad);
  }
});

// Los chunks están listos para usar
result.chunks.forEach((chunk, index) => {
  console.log(`Chunk ${index + 1}:`);
  console.log(`  Blob WAV: ${chunk.blob.size} bytes`);
  console.log(`  Tiempo: ${chunk.startTime}ms - ${chunk.endTime}ms`);
  console.log(`  VAD Score: ${chunk.vadScore}`);
  
  // El blob ya está en formato WAV, listo para transcribir
  // await transcribeAudio(chunk.blob);
});
```

## Compatibilidad hacia atrás

La API antigua sigue funcionando:

```typescript
// Uso legacy
const result = await processFileWithMetrics(arrayBuffer, (metrics) => {
  console.log('Frame metrics:', metrics);
});

// result tendrá el formato ProcessFileWithMetricsResult antiguo
```

## Beneficios

1. **Sin conversiones manuales**: Los chunks vienen en el formato especificado
2. **Métricas integradas**: VAD y otras métricas calculadas por chunk
3. **Timestamps precisos**: Inicio y fin exactos de cada chunk
4. **Menos código cliente**: Todo el procesamiento pesado en Murmuraba
5. **Formato configurable**: WAV, WebM o raw según necesites

## Formatos soportados

- **WAV**: Formato universal, compatible con todos los servicios de transcripción
- **WebM**: Actualmente devuelve WAV (implementación futura)
- **raw**: Float32Array sin procesar para casos especiales

## Notas de implementación

- El chunking se realiza durante el procesamiento frame por frame
- Los chunks se crean de forma asíncrona para no bloquear el procesamiento
- La conversión a WAV usa la utilidad AudioConverter existente
- Los timestamps son precisos basados en el frame rate de RNNoise (48kHz)