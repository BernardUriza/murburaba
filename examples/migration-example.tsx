import React, { useState } from 'react';
import { useMurmubaraEngine } from '../hooks/useMurmubaraEngine';

/**
 * Ejemplo de migración de la API antigua a Murmuraba v2
 */

// ============================================
// ANTES (API antigua):
// ============================================
/*
import { useAudioEngine } from './audio/useAudioEngine';

function OldComponent() {
  const {
    isInitialized,
    isLoading,
    error,
    processStream,
    cleanup,
    initializeAudioEngine,
    getMetrics,
  } = useAudioEngine();
  
  // Problemas:
  // - No hay control sobre el stream (pause/resume)
  // - cleanup() no funciona correctamente
  // - Sin callbacks de métricas en tiempo real
  // - Sin manejo de chunks
  // - Logs no configurables
}
*/

// ============================================
// AHORA (Murmuraba v2):
// ============================================
export function ModernAudioComponent() {
  const [streamController, setStreamController] = useState<any>(null);
  const [chunkCount, setChunkCount] = useState(0);
  
  const {
    isInitialized,
    isLoading,
    error,
    engineState,
    metrics,
    diagnostics,
    initialize,
    destroy,
    processStream,
    processStreamChunked,
  } = useMurmubaraEngine({
    // Nueva configuración avanzada
    logLevel: 'info',
    noiseReductionLevel: 'high',
    bufferSize: 2048,
    autoCleanup: true,
    cleanupDelay: 30000,
    
    // Logger personalizado
    onLog: (level, message) => {
      console.log(`[Custom Logger] ${level}: ${message}`);
    },
  });
  
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Opción 1: Procesamiento simple con control total
      const controller = await processStream(stream);
      setStreamController(controller);
      
      // Ahora puedes:
      // controller.pause();
      // controller.resume();
      // controller.stop();
      
    } catch (err) {
      console.error('Error starting recording:', err);
    }
  };
  
  const handleStartChunkedRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Opción 2: Procesamiento por chunks con callbacks
      const controller = await processStreamChunked(stream, {
        chunkDuration: 4000, // 4 segundos
        onChunkProcessed: (chunk) => {
          console.log('Chunk procesado:', {
            duration: chunk.duration,
            noiseRemoved: chunk.noiseRemoved,
            metrics: chunk.metrics,
          });
          setChunkCount(prev => prev + 1);
        },
      });
      
      setStreamController(controller);
      
    } catch (err) {
      console.error('Error starting chunked recording:', err);
    }
  };
  
  const handlePause = () => {
    streamController?.pause();
  };
  
  const handleResume = () => {
    streamController?.resume();
  };
  
  const handleStop = () => {
    streamController?.stop();
    setStreamController(null);
  };
  
  const handleDestroy = async () => {
    // Destrucción completa y limpia
    await destroy(true); // force = true para forzar limpieza
  };
  
  return (
    <div>
      <h2>Murmuraba v2 - Ejemplo de Migración</h2>
      
      {/* Estado del motor */}
      <div>
        <p>Estado del motor: <strong>{engineState}</strong></p>
        <p>¿Inicializado?: {isInitialized ? 'Sí' : 'No'}</p>
        {isLoading && <p>Cargando...</p>}
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      </div>
      
      {/* Métricas en tiempo real */}
      {metrics && (
        <div>
          <h3>Métricas en Tiempo Real:</h3>
          <ul>
            <li>Reducción de ruido: {metrics.noiseReductionLevel.toFixed(1)}%</li>
            <li>Latencia: {metrics.processingLatency.toFixed(2)}ms</li>
            <li>Nivel de entrada: {(metrics.inputLevel * 100).toFixed(1)}%</li>
            <li>Nivel de salida: {(metrics.outputLevel * 100).toFixed(1)}%</li>
            <li>Frames procesados: {metrics.frameCount}</li>
          </ul>
        </div>
      )}
      
      {/* Diagnósticos */}
      {diagnostics && (
        <div>
          <h3>Diagnósticos:</h3>
          <ul>
            <li>Versión: {diagnostics.engineVersion}</li>
            <li>WASM cargado: {diagnostics.wasmLoaded ? 'Sí' : 'No'}</li>
            <li>Procesadores activos: {diagnostics.activeProcessors}</li>
            <li>Memoria usada: {(diagnostics.memoryUsage / 1024 / 1024).toFixed(2)} MB</li>
          </ul>
        </div>
      )}
      
      {/* Controles */}
      <div>
        <h3>Controles:</h3>
        
        {!isInitialized && (
          <button onClick={initialize}>Inicializar Motor</button>
        )}
        
        {isInitialized && !streamController && (
          <>
            <button onClick={handleStartRecording}>
              Iniciar Grabación Simple
            </button>
            <button onClick={handleStartChunkedRecording}>
              Iniciar Grabación por Chunks
            </button>
          </>
        )}
        
        {streamController && (
          <>
            <button onClick={handlePause}>Pausar</button>
            <button onClick={handleResume}>Reanudar</button>
            <button onClick={handleStop}>Detener</button>
          </>
        )}
        
        {isInitialized && (
          <button onClick={handleDestroy} style={{ marginLeft: '20px', color: 'red' }}>
            Destruir Motor (Limpieza Total)
          </button>
        )}
      </div>
      
      {chunkCount > 0 && (
        <p>Chunks procesados: {chunkCount}</p>
      )}
    </div>
  );
}

// ============================================
// RESUMEN DE MEJORAS:
// ============================================
/*
1. ✅ API de destrucción mejorada - destroy(force) limpia todo
2. ✅ Control granular de streams - pause(), resume(), stop()
3. ✅ Métricas en tiempo real - Se actualizan automáticamente
4. ✅ Procesamiento por chunks - Con callbacks detallados
5. ✅ Logging configurable - logLevel y onLog personalizable
6. ✅ Estados claros - engineState siempre actualizado
7. ✅ Eventos del ciclo de vida - Internamente manejados
8. ✅ Configuración avanzada - noiseReductionLevel, bufferSize, etc.
9. ✅ Mejor manejo de errores - Códigos específicos
10. ✅ Diagnósticos completos - getDiagnostics()
11. ✅ Auto-limpieza - autoCleanup después de inactividad
*/