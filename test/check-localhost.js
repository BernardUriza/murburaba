#!/usr/bin/env node

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// LOG BRUTAL Y TRAZABILIDAD EXTREMA
const timestamp = Date.now();
const logFile = path.join(__dirname, `brutal-test-${timestamp}.log`);

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}`;
  console.log(entry);
  fs.appendFileSync(logFile, entry + '\n');
}

// Busca, espera, y loguea cualquier selector con retry brutal
async function waitForSelectorBrutal(page, selector, timeout = 7000, poll = 250) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const exists = await page.evaluate(sel => !!document.querySelector(sel), selector);
    if (exists) return true;
    await new Promise(r => setTimeout(r, poll));
  }
  return false;
}

async function brutalTest() {
  log('🩸 TEST BRUTAL DE GRABACIÓN REAL (MODO ROBUSTO)');
  log(`Log file: ${logFile}`);

  // CHECK: Archivo de audio fake existe
  const fakeAudioPath = path.join(__dirname, '../public/jfk_speech.wav');
  if (!fs.existsSync(fakeAudioPath)) {
    log('💥 FALTA jfk_speech.wav en public. Copia el archivo antes de correr el test.');
    process.exit(2);
  }

  // Deep: Headless Chrome ultra-permisivo
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-audio-capture=${fakeAudioPath}`,
      '--allow-running-insecure-content',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--autoplay-policy=no-user-gesture-required',
      '--window-size=1400,900',
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  // LOG DE TODO
  const allLogs = [];
  let chunkCount = 0;

  page.on('console', msg => {
    const text = msg.text();
    const entry = { time: Date.now(), type: msg.type(), text };
    allLogs.push(entry);
    log(`[${msg.type().toUpperCase()}] ${text}`);
    if (/chunk/i.test(text)) {
      chunkCount++;
      log(`🔥 CHUNK #${chunkCount}: ${text}`);
      if (/8(?!000)/.test(text)) {
        log('🚨 POSIBLE BUG: Valor 8 detectado (¿8ms en vez de 8s?)');
      }
    }
    if (chunkCount > 0 && chunkCount % 50 === 0) {
      fs.writeFileSync(
        path.join(__dirname, `emergency-${timestamp}-${chunkCount}.json`),
        JSON.stringify({ chunkCount, allLogs: allLogs.slice(-100) }, null, 2)
      );
      log(`💾 EMERGENCY SAVE: ${chunkCount} chunks`);
    }
  });
  page.on('pageerror', err => log(`💀 PAGE ERROR: ${err}`));
  page.on('error', err => log(`💀 BROWSER ERROR: ${err}`));

  log('🎯 Navegando a localhost:3000...');
  await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.screenshot({ path: path.join(__dirname, `initial-${timestamp}.png`) });

  // Botón demo: ultra robusto
  log('🎵 Buscando botones demo...');
  const demoFound = await waitForSelectorBrutal(page, 'button,div[role="button"],[onclick]');
  if (!demoFound) {
    log('❌ No hay botones en la landing. UI rota.');
    await browser.close();
    process.exit(3);
  }

  // Buscar y clickear demo o initialize o start recording, el que aparezca
  const clickLabelVariants = [
    {label: /audio demo|🎵/i, screenshot: 'audio-demo'},
    {label: /initialize audio engine/i, screenshot: 'init-audio-engine'},
    {label: /start recording|🎙️/i, screenshot: 'start-recording'}
  ];
  let action = null;
  for (const variant of clickLabelVariants) {
    const clicked = await page.evaluate(labelRe => {
      const nodes = Array.from(document.querySelectorAll('button,div[role="button"],[onclick]'));
      const btn = nodes.find(b => labelRe.test(b.textContent));
      if (btn) { btn.click(); return true; }
      return false;
    }, variant.label);
    if (clicked) {
      log(`✅ Click en botón: ${variant.label}`);
      await page.screenshot({ path: path.join(__dirname, `${variant.screenshot}-${timestamp}.png`) });
      action = variant.screenshot;
      break;
    }
  }
  if (!action) {
    log('❌ No se pudo iniciar demo ni audio engine. Test abortado.');
    await browser.close();
    process.exit(4);
  }

  // Si fue demo, buscar process
  if (action === 'audio-demo') {
    const processBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => /process|procesar|start/i.test(b.textContent));
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (processBtn) {
      log('✅ Process demo iniciado');
      await page.screenshot({ path: path.join(__dirname, `processing-${timestamp}.png`) });
      await page.waitForTimeout(2000);
    } else {
      log('❌ No se encontró botón para procesar demo.');
    }
  }

  // Buscar y clickear start recording si no se hizo antes
  if (action !== 'start-recording') {
    const recordingFound = await waitForSelectorBrutal(page, 'button');
    const recordClicked = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button'))
        .find(b => /start recording|🎙️/i.test(b.textContent));
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (!recordClicked) {
      log('❌ No se encontró botón Start Recording.');
      const buttons = await page.evaluate(() =>
        Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim())
      );
      log(`Botones disponibles: ${JSON.stringify(buttons)}`);
      await browser.close();
      process.exit(5);
    }
    log('🔴 RECORDING STARTED');
  }

  // MONITOREO EXTREMO - 10 SEGUNDOS
  let seconds = 0;
  const monitor = setInterval(() => {
    seconds++;
    log(`⏱️  Segundo ${seconds} - Chunks: ${chunkCount}`);
    if (chunkCount > 100) {
      log('🚨 ALERTA: MÁS DE 100 CHUNKS EN POCOS SEGUNDOS');
      log('🚨 CONFIRMADO: BUG DE 8ms EN VEZ DE 8s');
      clearInterval(monitor);
    }
    if (seconds >= 10) {
      clearInterval(monitor);
    }
  }, 1000);
  await new Promise(r => setTimeout(r, 10000));
  clearInterval(monitor);

  // ESTADO FINAL
  const finalState = {
    timestamp,
    chunkCount,
    totalLogs: allLogs.length,
    lastLogs: allLogs.slice(-20),
    chunkLogs: allLogs.filter(l => /chunk/i.test(l.text))
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
