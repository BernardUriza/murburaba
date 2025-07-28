#!/usr/bin/env node

import puppeteer from 'puppeteer';

console.log('🚀 TEST DE FLUJO DE GRABACIÓN COMPLETO');

// Timeout general de 20 segundos
setTimeout(() => {
  console.error('\n⏰ TIMEOUT 20s - TEST FINALIZADO');
  process.exit(1);
}, 20000);

(async () => {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--use-file-for-fake-audio-capture=/workspaces/murburaba/public/jfk_speech.wav'
    ]
  });
  
  try {
    console.log('\n1️⃣ Abriendo página...');
    const page = await browser.newPage();
    
    // Capturar todos los logs
    const logs = [];
    page.on('console', msg => {
      const text = msg.text();
      logs.push(text);
      
      // Mostrar logs importantes
      if (text.includes('[MurmubaraEngine]') || 
          text.includes('[ChunkProcessor]') ||
          text.includes('[RNNoiseProcessor]') ||
          text.includes('AudioProcessorService') ||
          text.includes('useAudioProcessor')) {
        console.log(`  📝 ${text}`);
      }
    });
    
    // Capturar errores
    page.on('pageerror', err => {
      console.error('  ❌ ERROR:', err.toString());
    });
    
    await page.goto('http://localhost:3000', { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });
    console.log('✅ Página cargada');
    
    // Esperar a que React se inicialice
    await new Promise(r => setTimeout(r, 3000));
    
    // Verificar estado inicial
    console.log('\n2️⃣ Verificando estado inicial...');
    const initialState = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return {
        buttonCount: buttons.length,
        buttons: buttons.map(b => b.textContent?.trim()),
        hasRecordingControls: !!document.querySelector('.recording-controls'),
        hasWaveformSection: !!document.querySelector('.live-waveform-section')
      };
    });
    console.log('  Botones encontrados:', initialState.buttons);
    console.log('  Controles de grabación:', initialState.hasRecordingControls ? '✅' : '❌');
    
    // Inicializar el audio engine
    console.log('\n3️⃣ Inicializando Audio Engine...');
    const initResult = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const initBtn = buttons.find(b => 
        b.textContent?.includes('Initialize Audio Engine')
      );
      if (initBtn) {
        initBtn.click();
        return true;
      }
      return false;
    });
    
    if (!initResult) {
      console.log('⚠️  No se encontró botón Initialize, tal vez ya está inicializado');
    } else {
      console.log('✅ Click en Initialize Audio Engine');
      // Esperar a que se inicialice
      await new Promise(r => setTimeout(r, 3000));
    }
    
    // Buscar y hacer click en Start Recording
    console.log('\n4️⃣ Buscando botón Start Recording...');
    const recordingStarted = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const startBtn = buttons.find(b => 
        b.textContent?.includes('Start Recording') || 
        b.textContent?.includes('🎙️Start Recording')
      );
      if (startBtn) {
        console.log('Clicking Start Recording button:', startBtn.textContent);
        startBtn.click();
        return true;
      }
      return false;
    });
    
    if (!recordingStarted) {
      console.error('❌ No se encontró el botón Start Recording');
      console.log('  Botones disponibles:', await page.evaluate(() => 
        Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim())
      ));
      process.exit(1);
    }
    
    console.log('✅ Grabación iniciada');
    
    // Esperar 3 segundos de grabación
    console.log('\n5️⃣ Grabando por 3 segundos...');
    await new Promise(r => setTimeout(r, 3000));
    
    // Verificar estado durante la grabación
    const recordingState = await page.evaluate(() => {
      const waveformVisible = document.querySelector('.live-waveform-section')?.style.display !== 'none';
      const waveformAnalyzer = document.querySelector('canvas[id^="waveform-"]');
      return {
        waveformVisible,
        hasWaveformCanvas: !!waveformAnalyzer,
        isLiveIndicatorVisible: !!document.querySelector('.live-indicator')
      };
    });
    
    console.log('\n📊 Estado durante grabación:');
    console.log(`  Waveform visible: ${recordingState.waveformVisible ? '✅' : '❌'}`);
    console.log(`  Canvas de waveform: ${recordingState.hasWaveformCanvas ? '✅' : '❌'}`);
    console.log(`  Indicador LIVE: ${recordingState.isLiveIndicatorVisible ? '✅' : '❌'}`);
    
    // Analizar logs capturados
    console.log('\n6️⃣ ANÁLISIS DE LOGS:');
    
    const engineInitialized = logs.some(log => 
      log.includes('Murmuraba engine initialized') || 
      log.includes('AudioWorklet processor registered')
    );
    console.log(`  Engine inicializado: ${engineInitialized ? '✅' : '❌'}`);
    
    const chunkProcessorCreated = logs.some(log => 
      log.includes('Creating ChunkProcessor with config')
    );
    console.log(`  ChunkProcessor creado: ${chunkProcessorCreated ? '✅' : '❌'}`);
    
    const samplesAdded = logs.filter(log => 
      log.includes('addSamples called with')
    );
    console.log(`  Llamadas a addSamples: ${samplesAdded.length}`);
    
    const chunksReady = logs.filter(log => 
      log.includes('Chunk ready!')
    );
    console.log(`  Chunks procesados: ${chunksReady.length}`);
    
    const inputLevels = logs.filter(log => 
      log.includes('[RNNoiseProcessor] Input level:')
    );
    console.log(`  Niveles de entrada detectados: ${inputLevels.length}`);
    
    if (inputLevels.length > 0) {
      console.log(`  Primer nivel: ${inputLevels[0]}`);
      console.log(`  Último nivel: ${inputLevels[inputLevels.length - 1]}`);
      
      // Extraer valores numéricos para verificar variación
      const levelValues = inputLevels.map(log => {
        const match = log.match(/Input level: ([\d.]+)/);
        return match ? parseFloat(match[1]) : 0;
      });
      
      const avgLevel = levelValues.reduce((a, b) => a + b, 0) / levelValues.length;
      const maxLevel = Math.max(...levelValues);
      const minLevel = Math.min(...levelValues);
      
      console.log(`  Nivel promedio: ${avgLevel.toFixed(6)}`);
      console.log(`  Rango: ${minLevel.toFixed(6)} - ${maxLevel.toFixed(6)}`);
      
      // Verificar si hay variación real (no solo ruido blanco)
      const hasRealAudio = maxLevel > 0.001 && (maxLevel - minLevel) > 0.0001;
      console.log(`  Audio real detectado: ${hasRealAudio ? '✅' : '❌'}`);
    }
    
    await browser.close();
    
    // Evaluación final
    console.log('\n7️⃣ RESULTADO FINAL:');
    
    if (engineInitialized && chunkProcessorCreated && samplesAdded.length > 0) {
      console.log('✅ GRABACIÓN FUNCIONANDO CORRECTAMENTE');
      console.log(`   - ${samplesAdded.length} muestras procesadas`);
      console.log(`   - ${chunksReady.length} chunks completados`);
      process.exit(0);
    } else if (engineInitialized && chunkProcessorCreated && samplesAdded.length === 0) {
      console.log('⚠️  PROBLEMA: ChunkProcessor creado pero no recibe audio');
      console.log('   Posible problema con la comunicación worklet->main thread');
      process.exit(1);
    } else if (engineInitialized && !chunkProcessorCreated) {
      console.log('⚠️  PROBLEMA: Engine inicializado pero no se crea ChunkProcessor');
      console.log('   Verificar que chunkDuration se esté pasando correctamente');
      process.exit(1);
    } else {
      console.log('❌ GRABACIÓN NO FUNCIONA');
      console.log('   El engine no se inicializó correctamente');
      process.exit(1);
    }
    
  } catch (e) {
    console.error('❌ Error en el test:', e.message);
    await browser.close();
    process.exit(1);
  }
})();