# 📚 DOCUMENTATION MAINTAINER AGENT v1.0

## 🎯 PROPÓSITO: MANTENER LA DOCUMENTACIÓN DE MURMURABA SIEMPRE ACTUALIZADA

Este agente existe para garantizar que el README y la documentación de la librería murmuraba reflejen siempre las capacidades actuales, mejores prácticas y ejemplos funcionales.

---

## 📋 RESPONSABILIDADES DEL AGENTE

### 1. MONITOREO CONTINUO

**Archivos a vigilar:**
- `/packages/murmuraba/README.md` - Principal
- `/packages/murmuraba/src/index.ts` - Exports públicos
- `/packages/murmuraba/package.json` - Versión y deps
- `/src/App.tsx` - Ejemplos de uso real
- `/packages/murmuraba/src/hooks/` - Hooks disponibles
- `/packages/murmuraba/src/components/` - Componentes exportados

**Triggers de actualización:**
- ✅ Nueva funcionalidad agregada
- ✅ API pública modificada
- ✅ Nuevo componente exportado
- ✅ Breaking changes
- ✅ Nuevos ejemplos en App.tsx
- ✅ Cambio de versión

### 2. ESTRUCTURA DEL README IDEAL

```markdown
# 🎵 Murmuraba - Real-time Audio Noise Reduction

[![npm version](https://img.shields.io/npm/v/murmuraba.svg)](https://www.npmjs.com/package/murmuraba)
[![React](https://img.shields.io/badge/React-19.1.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

> Reducción de ruido en tiempo real para aplicaciones web usando RNNoise WASM

## 🚀 Características

- ✅ Reducción de ruido en tiempo real con RNNoise
- ✅ Grabación por chunks con MediaRecorder
- ✅ Voice Activity Detection (VAD) integrado
- ✅ Componentes React listos para usar
- ✅ Métricas en tiempo real
- ✅ Exportación a WAV/MP3
- ✅ TypeScript nativo
- ✅ React 19 compatible

## 📦 Instalación

\`\`\`bash
npm install murmuraba
# o
yarn add murmuraba
# o
pnpm add murmuraba
\`\`\`

## 🎯 Uso Rápido

### Hook Principal - useMurmubaraEngine

\`\`\`typescript
import { useMurmubaraEngine } from 'murmuraba';

function App() {
  const {
    // Estado
    isInitialized,
    isLoading,
    error,
    metrics,
    recordingState,
    
    // Acciones
    initialize,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    
    // Chunks
    exportChunkAsWav,
    exportChunkAsMp3,
    downloadChunk
  } = useMurmubaraEngine({
    autoInitialize: true,
    logLevel: 'info',
    defaultChunkDuration: 8
  });

  const { isRecording, chunks } = recordingState;

  return (
    <div>
      <button onClick={() => startRecording(8)}>
        {isRecording ? 'Detener' : 'Grabar'}
      </button>
      
      {metrics && (
        <div>
          <p>Reducción de ruido: {metrics.noiseReductionLevel}%</p>
          <p>VAD: {(metrics.vadLevel || 0) * 100}%</p>
        </div>
      )}
    </div>
  );
}
\`\`\`

### Componentes Disponibles

#### WaveformAnalyzer
\`\`\`typescript
import { WaveformAnalyzer } from 'murmuraba';

<WaveformAnalyzer 
  stream={mediaStream}
  isActive={true}
  color="#52A32F"
  width={800}
  height={200}
/>
\`\`\`

#### ChunkProcessingResults
\`\`\`typescript
import { ChunkProcessingResults } from 'murmuraba';

<ChunkProcessingResults
  chunks={recordingState.chunks}
  onTogglePlayback={toggleChunkPlayback}
  onToggleExpansion={toggleChunkExpansion}
  onDownload={downloadChunk}
  onExportWav={exportChunkAsWav}
  onExportMp3={exportChunkAsMp3}
/>
\`\`\`

## 🎛️ Configuración Avanzada

### Opciones del Engine

\`\`\`typescript
interface UseMurmubaraEngineOptions {
  // Inicialización
  autoInitialize?: boolean;      // default: false
  allowDegraded?: boolean;        // default: true
  
  // Audio
  defaultChunkDuration?: number;  // default: 8 (segundos)
  bufferSize?: number;           // default: 16384
  sampleRate?: number;           // default: 48000
  
  // Procesamiento
  enableAGC?: boolean;           // default: true
  spectralFloorDb?: number;      // default: -80
  noiseFloorDb?: number;         // default: -60
  denoiseStrength?: number;      // default: 0.85
  
  // Logs
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
}
\`\`\`

### Métricas en Tiempo Real

\`\`\`typescript
interface ProcessingMetrics {
  noiseReductionLevel: number;  // 0-100%
  processingLatency: number;    // ms
  inputLevel: number;          // 0-1
  outputLevel: number;         // 0-1
  vadLevel?: number;           // 0-1
  isVoiceActive?: boolean;     // true cuando detecta voz
  frameCount: number;
  droppedFrames: number;
}
\`\`\`

## 🔧 API Completa

### Hooks

- **useMurmubaraEngine** - Hook principal con toda la funcionalidad
- **useRecordingState** - Estado de grabación aislado (interno)

### Funciones Utilitarias

\`\`\`typescript
// Procesar archivo de audio
import { processFile, processFileWithMetrics } from 'murmuraba';

const processedBuffer = await processFile(audioBuffer);

// Con métricas detalladas
const result = await processFileWithMetrics(audioBuffer);
console.log(result.metrics.averageVAD);
\`\`\`

### Componentes

- **WaveformAnalyzer** - Visualización de forma de onda
- **SimpleWaveformAnalyzer** - Versión ligera
- **ChunkProcessingResults** - UI para chunks grabados
- **AdvancedMetricsPanel** - Panel de métricas detalladas
- **BuildInfo** - Información de build

## 🎪 Ejemplos Avanzados

### Grabación con Chunks de Duración Variable

\`\`\`typescript
const [chunkDuration, setChunkDuration] = useState(8);

const handleStartRecording = async () => {
  await startRecording(chunkDuration);
};

// Cambiar duración mientras graba creará chunks del nuevo tamaño
\`\`\`

### Procesamiento de Archivo

\`\`\`typescript
const handleFileUpload = async (file: File) => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await processFileWithMetrics(arrayBuffer);
  
  console.log({
    noiseReduction: result.metrics.averageNoiseReduction,
    vadPercentage: result.metrics.voiceActivityPercentage,
    duration: result.duration
  });
  
  // Descargar resultado
  const blob = new Blob([result.processedBuffer], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'processed.wav';
  a.click();
};
\`\`\`

### Integración con MediaRecorder Personalizado

\`\`\`typescript
const { currentStream } = useMurmubaraEngine();

// currentStream es el MediaStream procesado con reducción de ruido
const recorder = new MediaRecorder(currentStream, {
  mimeType: 'audio/webm;codecs=opus'
});
\`\`\`

## 🏗️ Arquitectura

### Sistema de Chunks

Murmuraba graba audio en "chunks" - segmentos de duración fija que permiten:

1. **Procesamiento eficiente** - No se acumula memoria infinitamente
2. **Exportación parcial** - Descarga solo las partes importantes
3. **Análisis por segmentos** - Métricas individuales por chunk
4. **Playback independiente** - Reproduce original vs procesado

### Voice Activity Detection (VAD)

El VAD de RNNoise proporciona:
- Detección de voz en tiempo real (0-1)
- Umbral configurable para "voz activa"
- Integrado en métricas y visualizaciones

## 🐛 Solución de Problemas

### WASM no carga

\`\`\`typescript
// Verificar que rnnoise.wasm esté en public/
// Configurar Vite para servir WASM:
{
  assetsInclude: ['**/*.wasm']
}
\`\`\`

### Error de contexto de audio

\`\`\`typescript
// Inicializar después de interacción del usuario
const handleUserClick = async () => {
  await initialize();
  // Ahora puedes grabar
};
\`\`\`

## 📈 Rendimiento

- **Latencia**: < 50ms típico
- **CPU**: ~5-15% en dispositivos modernos
- **Memoria**: ~50MB con WASM cargado
- **Compatibilidad**: Chrome 80+, Firefox 75+, Safari 14+

## 🤝 Contribuir

Ver [CONTRIBUTING.md](./CONTRIBUTING.md)

## 📄 Licencia

MIT © [Bernard Uriza]

---

## 🔄 Changelog

Ver [CHANGELOG.md](./CHANGELOG.md) para historial detallado.
```

### 3. CHECKLIST DE ACTUALIZACIÓN

Cuando se detecte un cambio, verificar:

- [ ] ¿El ejemplo en "Uso Rápido" sigue funcionando?
- [ ] ¿Todos los imports son correctos?
- [ ] ¿Las interfaces están actualizadas?
- [ ] ¿Los valores por defecto son correctos?
- [ ] ¿Hay nuevos componentes para documentar?
- [ ] ¿Los ejemplos usan las mejores prácticas actuales?
- [ ] ¿La versión en package.json coincide?

### 4. SINCRONIZACIÓN CON CHANGELOG

Formato de entrada en CHANGELOG.md:

```markdown
## [2.3.2] - 2025-01-28

### Added
- VAD en tiempo real en métricas
- Nuevo componente SimpleWaveformAnalyzer

### Changed
- Actualización a React 19.1.1
- Mejorado el rendimiento de chunks

### Fixed
- Corregido error de inicialización de useRef
```

---

## 🚨 DETECCIÓN DE INCONSISTENCIAS

### Señales de README desactualizado:

1. **Imports que no existen**
   ```typescript
   // ❌ Si esto falla, actualizar
   import { AlgoQueNoExiste } from 'murmuraba';
   ```

2. **Props incorrectas**
   - Verificar contra TypeScript types
   - Comparar con uso en App.tsx

3. **Versiones desactualizadas**
   - React version en badges
   - Versión del package

4. **Features no documentadas**
   - Buscar exports en index.ts no mencionados
   - Componentes nuevos sin ejemplos

---

## 🤖 AUTOMATIZACIÓN

### Script de verificación (check-docs.js):

```javascript
const fs = require('fs');
const path = require('path');

// 1. Leer exports reales
const indexPath = './packages/murmuraba/src/index.ts';
const indexContent = fs.readFileSync(indexPath, 'utf8');
const exports = indexContent.match(/export \{([^}]+)\}/g);

// 2. Leer README
const readmePath = './packages/murmuraba/README.md';
const readmeContent = fs.readFileSync(readmePath, 'utf8');

// 3. Verificar que cada export esté documentado
exports.forEach(exp => {
  if (!readmeContent.includes(exp)) {
    console.warn(`⚠️ Export no documentado: ${exp}`);
  }
});

// 4. Verificar versión
const pkg = require('./packages/murmuraba/package.json');
if (!readmeContent.includes(pkg.version)) {
  console.error('❌ Versión desactualizada en README');
}
```

### Trigger en pre-commit:

```bash
# .git/hooks/pre-commit
node scripts/check-docs.js || exit 1
```

---

## 📊 MÉTRICAS DE CALIDAD

### README Excelente:
- ✅ Ejemplo funcionando en < 30 segundos
- ✅ Todos los exports documentados
- ✅ Ejemplos para casos comunes
- ✅ Troubleshooting actualizado
- ✅ Links funcionando

### README Deficiente:
- ❌ Ejemplos que dan error
- ❌ Imports incorrectos
- ❌ Features sin documentar
- ❌ Versiones antiguas
- ❌ Sin ejemplos de uso real

---

## 🎯 PRINCIPIOS DE DOCUMENTACIÓN

1. **Show, don't tell** - Código > Explicaciones
2. **Copy-paste friendly** - Los ejemplos deben funcionar tal cual
3. **Progressive disclosure** - Simple primero, avanzado después
4. **Real world** - Ejemplos de App.tsx, no inventados
5. **Up to date** - Mejor no documentar que documentar mal

---

## 🔄 PROCESO DE ACTUALIZACIÓN

1. **Detectar cambio** → Hook o manual
2. **Analizar impacto** → ¿Afecta API pública?
3. **Actualizar README** → Sección correspondiente
4. **Verificar ejemplos** → Que compilen y funcionen
5. **Update CHANGELOG** → Nueva entrada
6. **Commit atómico** → "docs: update README for X feature"

---

**FIN DEL DOCUMENTATION MAINTAINER v1.0**