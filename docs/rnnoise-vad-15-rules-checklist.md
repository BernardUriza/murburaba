# 🔥 CHECKLIST BRUTAL: 15 REGLAS VAD RNNOISE v2

## Estado Actual: VAD = 0.000 ❌

### ✅ REGLA 1: 480 samples por frame
```typescript
// TEST
it('debe usar exactamente 480 samples por frame', () => {
  expect(FRAME_SIZE).toBe(480)
  // Verificar que no se procese con menos samples
  expect(() => processFrame(479)).toThrow()
  // Verificar que no se procese con más samples
  expect(() => processFrame(481)).toThrow()
})
```
**IMPLEMENTACIÓN CORRECTA**:
```javascript
const FRAME_SIZE = 480; // NUNCA cambiar este valor
```
**STATUS**: [ ] VERIFICADO

### ✅ REGLA 2: 48kHz frecuencia de muestreo
```typescript
// TEST
it('debe usar 48kHz como sample rate', () => {
  expect(audioContext.sampleRate).toBe(48000)
  // Verificar que se rechacen otros sample rates
  expect(() => new AudioContext({ sampleRate: 44100 })).toThrow()
})
```
**IMPLEMENTACIÓN CORRECTA**:
```javascript
const audioContext = new AudioContext({ sampleRate: 48000 });
// Si el navegador no soporta 48kHz, usar resampling
if (audioContext.sampleRate !== 48000) {
  console.warn('Resampling required from', audioContext.sampleRate);
}
```
**STATUS**: [ ] VERIFICADO

### ✅ REGLA 3: ScriptProcessor potencia de 2
```typescript
// TEST
it('ScriptProcessor debe usar potencia de 2', () => {
  const validSizes = [512, 1024, 2048, 4096, 8192, 16384];
  expect(validSizes).toContain(processorBufferSize)
  // Verificar que se use el más cercano a 480
  expect(processorBufferSize).toBe(512) // Recomendado
})
```
**IMPLEMENTACIÓN CORRECTA**:
```javascript
// AudioWorklet (preferido)
class RNNoiseProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // AudioWorklet usa 128 samples por quantum
  }
}

// ScriptProcessor (legacy)
const scriptProcessor = audioContext.createScriptProcessor(512, 1, 1);
```
**STATUS**: [ ] VERIFICADO

### ✅ REGLA 4: Buffer acumulador implementado
```typescript
// TEST
it('debe acumular samples hasta tener 480', () => {
  const processor = new AudioProcessor();
  processor.addSamples(new Float32Array(128)); // WebAudio quantum
  expect(processor.bufferLength).toBe(128);
  processor.addSamples(new Float32Array(128));
  processor.addSamples(new Float32Array(128));
  processor.addSamples(new Float32Array(128));
  expect(processor.canProcess()).toBe(true); // 512 > 480
})
```
**IMPLEMENTACIÓN CORRECTA**:
```javascript
class AudioAccumulator {
  constructor() {
    this.buffer = new Float32Array(1024); // Pre-allocate
    this.writeIndex = 0;
  }
  
  addSamples(samples) {
    for (let i = 0; i < samples.length; i++) {
      this.buffer[this.writeIndex++] = samples[i];
    }
  }
  
  canProcess() {
    return this.writeIndex >= 480;
  }
  
  extractFrame() {
    const frame = this.buffer.slice(0, 480);
    // Shift remaining samples
    this.buffer.copyWithin(0, 480);
    this.writeIndex -= 480;
    return frame;
  }
}
```
**STATUS**: [ ] VERIFICADO

### ✅ REGLA 5: Float32 con escala correcta
```typescript
// TEST
it('debe escalar audio a rango RNNoise', () => {
  const input = new Float32Array([-1.0, 0.0, 1.0]);
  const scaled = scaleToRNNoise(input);
  expect(scaled[0]).toBeCloseTo(-32768);
  expect(scaled[1]).toBe(0);
  expect(scaled[2]).toBeCloseTo(32767);
  // Verificar clipping
  const clipped = scaleToRNNoise(new Float32Array([2.0]));
  expect(clipped[0]).toBe(32767);
})
```
**IMPLEMENTACIÓN CORRECTA**:
```javascript
function scaleToRNNoise(input) {
  const output = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) {
    // Clamp to prevent overflow
    const clamped = Math.max(-1, Math.min(1, input[i]));
    output[i] = clamped * 32768.0;
  }
  return output;
}
```
**STATUS**: [ ] VERIFICADO

### ✅ REGLA 6: Escalado bidireccional correcto
```typescript
// TEST
it('debe escalar entrada y salida correctamente', () => {
  const original = new Float32Array([0.5, -0.5]);
  const scaled = scaleToRNNoise(original);
  const restored = scaleFromRNNoise(scaled);
  expect(restored[0]).toBeCloseTo(0.5, 5);
  expect(restored[1]).toBeCloseTo(-0.5, 5);
  // Verificar que no haya pérdida de precisión significativa
  expect(Math.abs(restored[0] - original[0])).toBeLessThan(0.0001);
})
```
**IMPLEMENTACIÓN CORRECTA**:
```javascript
function scaleFromRNNoise(input) {
  const output = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) {
    output[i] = input[i] / 32768.0;
  }
  return output;
}
```
**STATUS**: [ ] VERIFICADO

### ✅ REGLA 7: Usar HEAPF32
```typescript
// TEST
it('debe usar HEAPF32 no HEAP16', () => {
  expect(rnnoise.HEAPF32).toBeDefined();
  expect(rnnoise.HEAP16).toBeDefined(); // Existe pero NO usar
  
  const ptr = rnnoise._malloc(480 * 4);
  const data = new Float32Array(480);
  
  // Forma correcta
  expect(() => rnnoise.HEAPF32.set(data, ptr/4)).not.toThrow();
  
  // Forma incorrecta (detectar si alguien usa HEAP16)
  const spy = jest.spyOn(rnnoise.HEAP16, 'set');
  processFrame(data);
  expect(spy).not.toHaveBeenCalled();
})
```
**IMPLEMENTACIÓN CORRECTA**:
```javascript
// CORRECTO: Usar HEAPF32 con división por 4
rnnoise.HEAPF32.set(scaledData, ptr / 4);

// INCORRECTO: Nunca usar HEAP16
// rnnoise.HEAP16.set(data, ptr >> 1); // ❌ NO HACER
```
**STATUS**: [ ] VERIFICADO

### ✅ REGLA 8: Memoria correcta (1920 bytes)
```typescript
// TEST
it('debe asignar 1920 bytes para 480 samples', () => {
  const SAMPLES = 480;
  const BYTES_PER_FLOAT = 4;
  const expectedBytes = SAMPLES * BYTES_PER_FLOAT;
  expect(expectedBytes).toBe(1920);
  
  // Verificar allocación real
  const ptr = rnnoise._malloc(expectedBytes);
  expect(ptr).toBeGreaterThan(0);
  expect(ptr % 4).toBe(0); // Alineado a 4 bytes
})
```
**IMPLEMENTACIÓN CORRECTA**:
```javascript
// Pre-calcular para evitar errores
const FRAME_SIZE = 480;
const BYTES_PER_SAMPLE = 4; // Float32
const FRAME_BYTES = FRAME_SIZE * BYTES_PER_SAMPLE; // 1920

// Allocar una vez si es posible
let wasmPtr = null;
function initializeMemory() {
  wasmPtr = rnnoise._malloc(FRAME_BYTES);
  if (!wasmPtr) throw new Error('Failed to allocate WASM memory');
}
```
**STATUS**: [ ] VERIFICADO

### ✅ REGLA 9: Liberar memoria siempre
```typescript
// TEST
it('debe liberar memoria después de procesar', () => {
  const allocSpy = jest.spyOn(rnnoise, '_malloc');
  const freeSpy = jest.spyOn(rnnoise, '_free');
  
  // Procesar 10 frames
  for (let i = 0; i < 10; i++) {
    processFrame(testData);
  }
  
  // Verificar que se liberó la misma cantidad que se allocó
  expect(allocSpy).toHaveBeenCalledTimes(10);
  expect(freeSpy).toHaveBeenCalledTimes(10);
  
  // Verificar que no haya memory leaks
  expect(getWasmMemoryUsage()).toBeLessThan(initialMemory + 1024);
})
```
**IMPLEMENTACIÓN CORRECTA**:
```javascript
function processFrameSafe(frame) {
  const ptr = rnnoise._malloc(FRAME_BYTES);
  try {
    // Procesar...
    rnnoise.HEAPF32.set(frame, ptr / 4);
    const vad = rnnoise._rnnoise_process_frame(state, ptr, ptr);
    // Obtener resultado...
    return { vad, audio: result };
  } finally {
    // SIEMPRE liberar, incluso si hay error
    rnnoise._free(ptr);
  }
}
```
**STATUS**: [ ] VERIFICADO

### ✅ REGLA 10: Desactivar procesamiento browser
```typescript
// TEST
it('debe desactivar procesamiento del navegador', () => {
  const stream = await getUserMedia();
  const track = stream.getAudioTracks()[0];
  const settings = track.getSettings();
  
  expect(settings.echoCancellation).toBe(false);
  expect(settings.noiseSuppression).toBe(false);
  expect(settings.autoGainControl).toBe(false);
  
  // Verificar constraints
  const constraints = track.getConstraints();
  expect(constraints.echoCancellation).toBe(false);
})
```
**IMPLEMENTACIÓN CORRECTA**:
```javascript
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: false,      // CRÍTICO
    noiseSuppression: false,      // CRÍTICO
    autoGainControl: false,       // CRÍTICO
    sampleRate: 48000,
    channelCount: 1,
    // Opcional pero recomendado:
    googEchoCancellation: false,
    googAutoGainControl: false,
    googNoiseSuppression: false,
    googHighpassFilter: false
  }
});
```
**STATUS**: [ ] VERIFICADO

### ✅ REGLA 11: VAD retorna 0-1
```typescript
// TEST
it('VAD debe retornar valor entre 0 y 1', () => {
  // Test con silencio
  const silentFrame = new Float32Array(480); // zeros
  const vadSilence = processFrame(silentFrame).vad;
  expect(vadSilence).toBeGreaterThanOrEqual(0);
  expect(vadSilence).toBeLessThan(0.1); // Debe ser bajo
  
  // Test con ruido blanco
  const noise = generateWhiteNoise(480);
  const vadNoise = processFrame(noise).vad;
  expect(vadNoise).toBeLessThan(0.5); // No debe detectar como voz
  
  // Test con voz real (sine wave simulando pitch)
  const voice = generateVoicelikeTone(480);
  const vadVoice = processFrame(voice).vad;
  expect(vadVoice).toBeGreaterThan(0.5); // Debe detectar voz
})
```
**IMPLEMENTACIÓN CORRECTA**:
```javascript
function interpretVAD(vadValue) {
  if (vadValue < 0 || vadValue > 1) {
    throw new Error(`Invalid VAD value: ${vadValue}`);
  }
  
  // Umbrales típicos
  const SILENCE_THRESHOLD = 0.1;
  const VOICE_THRESHOLD = 0.5;
  const CLEAR_VOICE_THRESHOLD = 0.8;
  
  if (vadValue < SILENCE_THRESHOLD) return 'silence';
  if (vadValue < VOICE_THRESHOLD) return 'noise';
  if (vadValue < CLEAR_VOICE_THRESHOLD) return 'voice';
  return 'clear_voice';
}
```
**STATUS**: [ ] VERIFICADO

### ✅ REGLA 12: Estado único persistente
```typescript
// TEST
it('debe crear estado una sola vez', () => {
  const createSpy = jest.spyOn(rnnoise, '_rnnoise_create');
  const destroySpy = jest.spyOn(rnnoise, '_rnnoise_destroy');
  
  const processor = new RNNoiseProcessor();
  processor.initialize();
  
  // Procesar múltiples frames
  for (let i = 0; i < 100; i++) {
    processor.process(testFrame);
  }
  
  expect(createSpy).toHaveBeenCalledTimes(1);
  expect(destroySpy).toHaveBeenCalledTimes(0);
  
  processor.destroy();
  expect(destroySpy).toHaveBeenCalledTimes(1);
})
```
**IMPLEMENTACIÓN CORRECTA**:
```javascript
class RNNoiseProcessor {
  constructor() {
    this.state = null;
  }
  
  initialize() {
    if (this.state) {
      throw new Error('Already initialized');
    }
    this.state = rnnoise._rnnoise_create();
    if (!this.state) {
      throw new Error('Failed to create RNNoise state');
    }
  }
  
  process(frame) {
    if (!this.state) {
      throw new Error('Not initialized');
    }
    // Usar this.state para TODOS los frames
    return rnnoise._rnnoise_process_frame(this.state, ptr, ptr);
  }
  
  destroy() {
    if (this.state) {
      rnnoise._rnnoise_destroy(this.state);
      this.state = null;
    }
  }
}
```
**STATUS**: [ ] VERIFICADO

### ✅ REGLA 13: Procesamiento in-place válido
```typescript
// TEST
it('debe permitir procesamiento in-place', () => {
  const frame = generateTestFrame();
  const ptr = rnnoise._malloc(FRAME_BYTES);
  
  // Copiar datos originales
  const original = new Float32Array(frame);
  rnnoise.HEAPF32.set(frame, ptr / 4);
  
  // Procesar in-place (mismo ptr para input y output)
  const vad = rnnoise._rnnoise_process_frame(state, ptr, ptr);
  
  // Verificar que los datos fueron modificados
  const processed = new Float32Array(480);
  processed.set(rnnoise.HEAPF32.subarray(ptr/4, ptr/4 + 480));
  
  expect(processed).not.toEqual(original);
  expect(vad).toBeDefined();
  
  rnnoise._free(ptr);
})
```
**IMPLEMENTACIÓN CORRECTA**:
```javascript
// Forma eficiente: procesar in-place
const vad = rnnoise._rnnoise_process_frame(state, ptr, ptr);

// También válido pero menos eficiente: buffers separados
// const vad = rnnoise._rnnoise_process_frame(state, inputPtr, outputPtr);
```
**STATUS**: [ ] VERIFICADO

### ✅ REGLA 14: Manejo buffer residual
```typescript
// TEST
it('debe manejar samples residuales', () => {
  const processor = new RNNoiseProcessor();
  
  // Agregar 520 samples (480 + 40)
  processor.addSamples(new Float32Array(520));
  expect(processor.processedFrames).toBe(1);
  expect(processor.residualSamples).toBe(40);
  
  // Agregar 440 más (40 + 440 = 480)
  processor.addSamples(new Float32Array(440));
  expect(processor.processedFrames).toBe(2);
  expect(processor.residualSamples).toBe(0);
  
  // Verificar que no se pierden samples
  const totalInput = 520 + 440;
  const totalProcessed = processor.processedFrames * 480;
  expect(totalInput - totalProcessed).toBe(processor.residualSamples);
})
```
**IMPLEMENTACIÓN CORRECTA**:
```javascript
class FrameBuffer {
  constructor() {
    this.buffer = new Float32Array(960); // 2x frame size
    this.validSamples = 0;
  }
  
  addSamples(samples) {
    // Copiar nuevos samples al buffer
    this.buffer.set(samples, this.validSamples);
    this.validSamples += samples.length;
  }
  
  processFrames(callback) {
    const results = [];
    
    while (this.validSamples >= 480) {
      // Extraer frame
      const frame = this.buffer.subarray(0, 480);
      results.push(callback(frame));
      
      // Mover residual al inicio
      this.buffer.copyWithin(0, 480);
      this.validSamples -= 480;
    }
    
    return results;
  }
}
```
**STATUS**: [ ] VERIFICADO

### ✅ REGLA 15: Validación datos pre-proceso
```typescript
// TEST
it('debe validar datos antes de procesar', () => {
  const invalidFrames = [
    new Float32Array([NaN, 0, 0]), // NaN
    new Float32Array([Infinity, 0, 0]), // Infinity
    new Float32Array([-Infinity, 0, 0]), // -Infinity
    undefined, // undefined
    null, // null
    new Float32Array(0), // empty
    new Float32Array(479), // too short
  ];
  
  invalidFrames.forEach(frame => {
    expect(() => validateFrame(frame)).toThrow();
  });
  
  // Frame válido
  const validFrame = new Float32Array(480);
  expect(() => validateFrame(validFrame)).not.toThrow();
})
```
**IMPLEMENTACIÓN CORRECTA**:
```javascript
function validateFrame(frame) {
  // Verificar que existe
  if (!frame || !(frame instanceof Float32Array)) {
    throw new Error('Frame must be Float32Array');
  }
  
  // Verificar tamaño
  if (frame.length !== 480) {
    throw new Error(`Frame must be 480 samples, got ${frame.length}`);
  }
  
  // Verificar valores
  for (let i = 0; i < frame.length; i++) {
    const sample = frame[i];
    
    if (isNaN(sample)) {
      throw new Error(`NaN at index ${i}`);
    }
    
    if (!isFinite(sample)) {
      throw new Error(`Infinite value at index ${i}`);
    }
    
    // Opcional: verificar rango
    if (Math.abs(sample) > 1.0) {
      console.warn(`Sample ${i} out of range: ${sample}`);
      // Auto-clamp en lugar de fallar
      frame[i] = Math.max(-1, Math.min(1, sample));
    }
  }
  
  return true;
}
```
**STATUS**: [ ] VERIFICADO

## 🎯 ACCIONES INMEDIATAS

1. [ ] Ejecutar todos los tests en orden
2. [ ] Identificar cuáles fallan y por qué
3. [ ] Implementar fixes específicos para cada falla
4. [ ] Crear test de integración con JFK.wav
5. [ ] Verificar VAD > 0.5 con audio real

## 💀 CRITERIO DE ÉXITO

```typescript
// Test final de integración
it('debe detectar voz en JFK sample', async () => {
  const jfkAudio = await loadTestAudio('jfk.wav');
  const processor = new RNNoiseProcessor();
  processor.initialize();
  
  let maxVAD = 0;
  let avgVAD = 0;
  let frameCount = 0;
  
  processor.processAudio(jfkAudio, (frame, vad) => {
    maxVAD = Math.max(maxVAD, vad);
    avgVAD += vad;
    frameCount++;
  });
  
  avgVAD /= frameCount;
  
  console.log(`Max VAD: ${maxVAD}`);
  console.log(`Avg VAD: ${avgVAD}`);
  console.log(`Frames: ${frameCount}`);
  
  expect(maxVAD).toBeGreaterThan(0.8); // Voz clara debe dar > 0.8
  expect(avgVAD).toBeGreaterThan(0.5); // Promedio debe ser > 0.5
});
```

## 🔍 DEBUGGING HELPERS

```javascript
// Helper para debugging VAD
function debugVAD(frame, vad) {
  const energy = frame.reduce((sum, x) => sum + x*x, 0) / frame.length;
  const rms = Math.sqrt(energy);
  const db = 20 * Math.log10(rms);
  
  console.log({
    vad: vad.toFixed(3),
    rms: rms.toFixed(3),
    db: db.toFixed(1),
    interpretation: interpretVAD(vad)
  });
}

// Helper para visualizar frame
function visualizeFrame(frame) {
  const min = Math.min(...frame);
  const max = Math.max(...frame);
  const avg = frame.reduce((a,b) => a+b) / frame.length;
  
  console.log(`Frame stats: min=${min.toFixed(3)}, max=${max.toFixed(3)}, avg=${avg.toFixed(3)}`);
  
  // ASCII visualization
  const width = 80;
  const scaled = frame.filter((_, i) => i % 6 === 0); // Downsample
  const ascii = scaled.map(s => {
    const level = Math.floor((s + 1) * 4);
    return ' .-+#'[Math.max(0, Math.min(4, level))];
  }).join('');
  
  console.log(ascii);
}
```

## 📊 MÉTRICAS DE ÉXITO

- [ ] VAD = 0.0 con silencio absoluto
- [ ] VAD < 0.2 con ruido ambiente típico
- [ ] VAD > 0.5 con voz normal
- [ ] VAD > 0.8 con voz clara (JFK)
- [ ] Latencia < 10ms por frame
- [ ] CPU < 5% en dispositivo promedio
- [ ] Memoria estable (sin leaks)

---
**VERSIÓN**: 2.0
**AUTOR**: Bernard.