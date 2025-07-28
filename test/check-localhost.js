#!/usr/bin/env node

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// LOG BRUTAL - TODO SE GUARDA
const timestamp = Date.now();
const logFile = path.join(__dirname, `brutal-test-${timestamp}.log`);

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}`;
  console.log(entry);
  fs.appendFileSync(logFile, entry + '\n');
}

async function brutalTest() {
  log('🩸 TEST BRUTAL DE GRABACIÓN REAL');
  log(`Log file: ${logFile}`);
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--allow-running-insecure-content',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  });
  
  const page = await browser.newPage();
  
  // CAPTURA TODO - SIN FILTROS
  const allLogs = [];
  let chunkCount = 0;
  
  page.on('console', msg => {
    const text = msg.text();
    const entry = { time: Date.now(), type: msg.type(), text };
    allLogs.push(entry);
    
    log(`[${msg.type().toUpperCase()}] ${text}`);
    
    // DETECTAR CHUNKS
    if (text.includes('Chunk') || text.includes('chunk')) {
      chunkCount++;
      log(`🔥 CHUNK #${chunkCount}: ${text}`);
      
      // DETECTAR EL BUG
      if (text.includes('8') && !text.includes('8000')) {
        log('🚨 POSIBLE BUG: Valor 8 detectado (¿8ms en vez de 8s?)');
      }
    }
    
    // SALVAVIDAS: Si muchos chunks, guardar estado
    if (chunkCount > 0 && chunkCount % 50 === 0) {
      fs.writeFileSync(
        path.join(__dirname, `emergency-${timestamp}-${chunkCount}.json`),
        JSON.stringify({ chunkCount, allLogs: allLogs.slice(-100) }, null, 2)
      );
      log(`💾 EMERGENCY SAVE: ${chunkCount} chunks`);
    }
  });
  
  page.on('pageerror', err => {
    log(`💀 PAGE ERROR: ${err}`);
  });
  
  // NAVEGAR
  log('🎯 Navegando a localhost:3000...');
  await page.goto('http://localhost:3000');
  await new Promise(r => setTimeout(r, 3000));
  
  // PROBAR AUDIO DEMO PRIMERO
  log('🎵 Buscando Floating Action Buttons...');
  await page.screenshot({ path: path.join(__dirname, `initial-${timestamp}.png`) });
  
  const fabButtons = await page.evaluate(() => {
    // Buscar botones flotantes o elementos que contengan Audio Demo
    const allButtons = Array.from(document.querySelectorAll('button, div[role="button"], [onclick]'));
    return allButtons.map(btn => ({
      text: btn.textContent?.trim() || '',
      className: btn.className || '',
      id: btn.id || ''
    }));
  });
  
  log(`Botones encontrados: ${JSON.stringify(fabButtons)}`);
  
  // Buscar Audio Demo
  const audioDemoClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, div[role="button"], [onclick]'));
    const audioBtn = buttons.find(b => 
      b.textContent?.includes('Audio Demo') || 
      b.textContent?.includes('🎵') ||
      b.className?.includes('demo') ||
      b.title?.includes('demo')
    );
    if (audioBtn) {
      audioBtn.click();
      return true;
    }
    return false;
  });
  
  if (audioDemoClicked) {
    log('✅ Audio Demo clicked');
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: path.join(__dirname, `audio-demo-${timestamp}.png`) });
    
    // Buscar botón de procesar
    const processClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const processBtn = buttons.find(b => 
        b.textContent?.includes('Process') || 
        b.textContent?.includes('Procesar') ||
        b.textContent?.includes('Start')
      );
      if (processBtn) {
        processBtn.click();
        return true;
      }
      return false;
    });
    
    if (processClicked) {
      log('✅ Process button clicked');
      await new Promise(r => setTimeout(r, 5000));
      await page.screenshot({ path: path.join(__dirname, `processing-${timestamp}.png`) });
    } else {
      log('❌ No se encontró botón de proceso');
    }
  } else {
    log('❌ NO SE ENCONTRÓ AUDIO DEMO');
    log('🔧 Fallback: Intentando Initialize Audio Engine...');
    
    const initClicked = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button'))
        .find(b => b.textContent?.includes('Initialize Audio Engine'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    
    if (initClicked) {
      log('✅ Initialize clicked como fallback');
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  
  // INTENTAR START RECORDING COMO ÚLTIMO RECURSO
  log('🎙️ Buscando Start Recording...');
  const recordClicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button'))
      .find(b => b.textContent?.includes('Start Recording') || b.textContent?.includes('🎙️'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  
  if (!recordClicked) {
    log('❌ NO SE ENCONTRÓ START RECORDING BUTTON');
    const buttons = await page.evaluate(() => 
      Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim())
    );
    log(`Botones disponibles: ${JSON.stringify(buttons)}`);
    await browser.close();
    process.exit(1);
  }
  
  log('🔴 RECORDING STARTED');
  
  // MONITOREO BRUTAL - 10 SEGUNDOS
  let seconds = 0;
  const monitor = setInterval(() => {
    seconds++;
    log(`⏱️  Segundo ${seconds} - Chunks: ${chunkCount}`);
    
    // DETECTAR PROBLEMA
    if (chunkCount > 100) {
      log('🚨 ALERTA: MÁS DE 100 CHUNKS EN POCOS SEGUNDOS');
      log('🚨 CONFIRMADO: BUG DE 8ms EN VEZ DE 8s');
      clearInterval(monitor);
    }
    
    if (seconds >= 10) {
      clearInterval(monitor);
    }
  }, 1000);
  
  // ESPERAR 10 SEGUNDOS O HASTA DETECTAR PROBLEMA
  await new Promise(r => setTimeout(r, 10000));
  clearInterval(monitor);
  
  // GUARDAR ESTADO FINAL
  const finalState = {
    timestamp,
    chunkCount,
    totalLogs: allLogs.length,
    lastLogs: allLogs.slice(-20),
    chunkLogs: allLogs.filter(l => l.text.includes('chunk') || l.text.includes('Chunk'))
  };
  
  fs.writeFileSync(
    path.join(__dirname, `final-state-${timestamp}.json`),
    JSON.stringify(finalState, null, 2)
  );
  
  await browser.close();
  
  // VEREDICTO FINAL
  log('\n🩸 VEREDICTO FINAL:');
  log(`Total chunks procesados: ${chunkCount}`);
  log(`Total logs capturados: ${allLogs.length}`);
  
  if (chunkCount > 100) {
    log('💀 BUG CONFIRMADO: Chunks de 8ms en vez de 8s');
    log('💀 El sistema genera miles de chunks microscópicos');
    process.exit(1);
  } else if (chunkCount > 0 && chunkCount < 10) {
    log('✅ CHUNKS NORMALES: Probablemente chunks de 8s');
  } else {
    log('⚠️  RESULTADO INCIERTO');
  }
  
  process.exit(0);
}

brutalTest().catch(err => {
  console.error('💀 CRASH:', err);
  process.exit(1);
});