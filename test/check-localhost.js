#!/usr/bin/env node

import puppeteer from 'puppeteer';

console.log('🚀 TEST RÁPIDO - MÁXIMO 10 SEGUNDOS');

// KILL SWITCH - 10 segundos máximo
setTimeout(() => {
  console.error('\n⏰ TIMEOUT 10s - ABORTANDO TEST');
  process.exit(1);
}, 10000);

(async () => {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    console.log('1. Abriendo página...');
    const page = await browser.newPage();
    
    // Solo esperar DOM, no network
    await page.goto('http://localhost:3000', { 
      waitUntil: 'domcontentloaded',
      timeout: 3000 
    });
    console.log('✅ Página abierta');
    
    // Esperar 2s para React
    await new Promise(r => setTimeout(r, 2000));
    
    // Ver qué hay
    const info = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      return {
        buttonCount: buttons.length,
        firstButton: buttons[0]?.textContent || 'NO HAY BOTONES',
        hasStartRecording: !!document.querySelector('#start-recording')
      };
    });
    
    console.log('📋 Info rápida:');
    console.log(`   Botones: ${info.buttonCount}`);
    console.log(`   Primer botón: ${info.firstButton}`);
    console.log(`   Start Recording: ${info.hasStartRecording ? 'SÍ' : 'NO'}`);
    
    await browser.close();
    console.log('\n✅ FIN DEL TEST RÁPIDO');
    process.exit(0);
    
  } catch (e) {
    console.error('❌ Error:', e.message);
    await browser.close();
    process.exit(1);
  }
})();