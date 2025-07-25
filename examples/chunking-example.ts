import { processFileWithMetrics } from '../packages/murmuraba/src/api/processFileWithMetrics';

// Ejemplo de uso de la nueva API con chunking

async function processAudioWithChunks(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  
  // Procesar con chunks de 8 segundos en formato WAV
  const result = await processFileWithMetrics(arrayBuffer, {
    enableVAD: true,
    chunkOptions: {
      chunkDuration: 8000, // 8 segundos
      outputFormat: 'wav' // devolver chunks como WAV blobs
    },
    onFrameProcessed: (metrics) => {
      // Callback opcional para métricas en tiempo real
      if (metrics.vad > 0.5) {
        console.log('Voice detected at frame', metrics.frame, 'VAD:', metrics.vad);
      }
    }
  });

  // Los chunks ya están listos para usar
  console.log(`Procesamiento completado: ${result.chunks.length} chunks generados`);
  console.log(`Duración total: ${result.totalDuration}ms`);
  console.log(`VAD promedio: ${result.averageVad}`);
  console.log(`Metadata:`, result.metadata);

  // Procesar cada chunk
  for (let i = 0; i < result.chunks.length; i++) {
    const chunk = result.chunks[i];
    
    console.log(`\nChunk ${i + 1}:`);
    console.log(`  - Blob WAV listo: ${chunk.blob.size} bytes`);
    console.log(`  - Tiempo: ${chunk.startTime}ms - ${chunk.endTime}ms`);
    console.log(`  - Duración: ${chunk.duration}ms`);
    console.log(`  - VAD Score: ${chunk.vadScore}`);
    console.log(`  - Métricas:`, chunk.metrics);
    
    // El blob ya está en formato WAV, listo para transcribir
    // await transcribeAudio(chunk.blob);
  }

  // También tienes acceso al audio completo procesado si lo necesitas
  const fullProcessedAudio = result.processedBuffer;
  console.log(`\nAudio completo procesado: ${fullProcessedAudio.byteLength} bytes`);
}

// Ejemplo con diferentes formatos de salida
async function processWithDifferentFormats(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  
  // Formato RAW (Float32Array)
  const rawResult = await processFileWithMetrics(arrayBuffer, {
    enableVAD: true,
    chunkOptions: {
      chunkDuration: 5000, // 5 segundos
      outputFormat: 'raw'
    }
  });
  
  console.log('RAW chunks:', rawResult.chunks.map(c => ({
    size: c.blob.size,
    type: c.blob.type
  })));
  
  // Formato WebM (actualmente devuelve WAV como fallback)
  const webmResult = await processFileWithMetrics(arrayBuffer, {
    enableVAD: true,
    chunkOptions: {
      chunkDuration: 10000, // 10 segundos
      outputFormat: 'webm'
    }
  });
  
  console.log('WebM chunks:', webmResult.chunks.map(c => ({
    size: c.blob.size,
    type: c.blob.type
  })));
}

// Beneficios de la nueva API:
// 1. No necesitas AudioContext ni conversiones manuales
// 2. Los chunks vienen con métricas VAD ya calculadas
// 3. Timestamps precisos para cada chunk
// 4. Blobs listos para usar en el formato especificado
// 5. Menos código del lado del cliente