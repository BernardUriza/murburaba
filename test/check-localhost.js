#!/usr/bin/env node

import puppeteer from 'puppeteer';

console.log('🚀 TEST DE GRABACIÓN - MÁXIMO 15 SEGUNDOS');

// KILL SWITCH - 15 segundos máximo
setTimeout(() => {
  console.error('\n⏰ TIMEOUT 15s - ABORTANDO TEST');
  process.exit(1);
}, 15000);

(async () => {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--use-fake-ui-for-media-stream',  // Auto-permitir micrófono
      '--use-fake-device-for-media-stream' // Usar micrófono fake
    ]
  });
  
  try {
    console.log('1. Abriendo página...');
    const page = await browser.newPage();
    
    // Capturar logs de consola
    const logs = [];
    page.on('console', msg => {
      const text = msg.text();
      logs.push(text);
      
      // Mostrar logs importantes
      if (text.includes('[MurmubaraEngine]') || 
          text.includes('[ChunkProcessor]') ||
          text.includes('AudioProcessorService') ||
          text.includes('VAD:')) {
        console.log(`  📝 LOG: ${text}`);
      }
    });
    
    // Capturar errores
    page.on('pageerror', err => {
      console.error('  ❌ ERROR:', err.toString());
    });
    
    // Solo esperar DOM, no network
    const port = process.env.PORT || 3000;
    await page.goto(`http://localhost:${port}`, { 
      waitUntil: 'domcontentloaded',
      timeout: 5000 
    });
    console.log('✅ Página abierta');
    
    // Esperar 2s para React
    await new Promise(r => setTimeout(r, 2000));
    
    // Primero inicializar el audio engine
    console.log('2. Inicializando Audio Engine...');
    const initButton = await page.evaluate(() => {
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
    
    if (!initButton) {
      console.log('⚠️  No se encontró botón Initialize, tal vez ya está inicializado');
    } else {
      console.log('✅ Audio Engine inicializado');
      // Esperar a que se inicialice
      await new Promise(r => setTimeout(r, 2000));
    }
    
    // Buscar botón de grabación
    console.log('3. Buscando botón Start Recording...');
    
    // Esperar a que aparezca el botón
    let startButton = { found: false };
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!startButton.found && attempts < maxAttempts) {
      attempts++;
      console.log(`  Intento ${attempts}/${maxAttempts}...`);
      
      startButton = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const recordButton = buttons.find(b => 
          b.textContent?.includes('Start Recording') || 
          b.textContent?.includes('Start')
        );
        if (recordButton) {
          return {
            found: true,
            text: recordButton.textContent,
            id: recordButton.id
          };
        }
        
        // Debug: mostrar todos los botones encontrados
        return { 
          found: false,
          availableButtons: buttons.map(b => b.textContent?.trim()).filter(Boolean)
        };
      });
      
      if (!startButton.found) {
        console.log('  Botones disponibles:', startButton.availableButtons);
        await new Promise(r => setTimeout(r, 1000)); // Esperar 1 segundo
      }
    }
    
    if (!startButton.found) {
      console.error('❌ No se encontró botón Start Recording');
      console.log('  Botones encontrados:', await page.evaluate(() => 
        Array.from(document.querySelectorAll('button')).map(b => b.textContent)
      ));
      process.exit(1);
    }
    
    console.log(`✅ Botón encontrado: "${startButton.text}"`);
    
    // Click en Start Recording
    console.log('4. Iniciando grabación...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const recordButton = buttons.find(b => 
        b.textContent?.includes('Start Recording') || 
        b.textContent?.includes('Start')
      );
      recordButton?.click();
    });
    
    // Esperar 3 segundos de grabación
    console.log('5. Grabando por 3 segundos...');
    await new Promise(r => setTimeout(r, 3000));
    
    // Analizar logs capturados
    console.log('\n📊 ANÁLISIS DE LOGS:');
    
    const chunkProcessorCreated = logs.some(log => 
      log.includes('Creating ChunkProcessor with config')
    );
    console.log(`  ChunkProcessor creado: ${chunkProcessorCreated ? '✅ SÍ' : '❌ NO'}`);
    
    const samplesAdded = logs.filter(log => 
      log.includes('addSamples called with')
    );
    console.log(`  Llamadas a addSamples: ${samplesAdded.length}`);
    
    const chunkReady = logs.some(log => 
      log.includes('Chunk ready!')
    );
    console.log(`  Chunks procesados: ${chunkReady ? '✅ SÍ' : '❌ NO'}`);
    
    const vadDetected = logs.filter(log => 
      log.includes('VAD:')
    );
    console.log(`  Detecciones VAD: ${vadDetected.length}`);
    
    // Verificar si realmente está grabando
    const isRecording = samplesAdded.length > 0 || vadDetected.length > 0;
    
    await browser.close();
    
    console.log('\n📈 RESULTADO:');
    if (isRecording && chunkProcessorCreated) {
      console.log('✅ GRABACIÓN FUNCIONANDO CORRECTAMENTE');
      process.exit(0);
    } else if (isRecording && !chunkProcessorCreated) {
      console.log('⚠️  GRABACIÓN DETECTADA PERO SIN CHUNKS');
      console.log('   El micrófono funciona pero no se crean chunks');
      process.exit(1);
    } else {
      console.log('❌ GRABACIÓN NO FUNCIONA');
      console.log('   No se detectó actividad del micrófono');
      process.exit(1);
    }
    
  } catch (e) {
    console.error('❌ Error:', e.message);
    await browser.close();
    process.exit(1);
  }
})();