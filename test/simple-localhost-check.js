#!/usr/bin/env node

import puppeteer from 'puppeteer';

console.log('🚀 TEST SIMPLE DE LOCALHOST');

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Capturar errores y logs
    page.on('console', msg => console.log(`[${msg.type()}]: ${msg.text()}`));
    page.on('pageerror', err => console.error('PAGE ERROR:', err.toString()));
    
    console.log('Navegando a http://localhost:3000...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });
    
    console.log('✅ Página cargada');
    
    // Verificar título
    const title = await page.title();
    console.log('Título:', title);
    
    // Buscar botones
    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim());
    });
    console.log('Botones encontrados:', buttons);
    
    await browser.close();
    console.log('✅ Test completado');
    
  } catch (e) {
    console.error('❌ Error:', e.message);
    if (browser) await browser.close();
    process.exit(1);
  }
})();