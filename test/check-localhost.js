/**
 * EL ÚNICO TEST QUE IMPORTA
 * 
 * Ejecutar: node test/check-localhost.js
 * NO uses npm test ni ninguna mierda de esas
 * 
 * USA: Puppeteer para browser real + happy-dom para testing rápido
 */

const puppeteer = require('puppeteer');
const { Window } = require('happy-dom');

async function checkLocalhost() {
  console.log('🔍 Checking http://localhost:3000...\n');
  
  // Primero: Test rápido con happy-dom
  console.log('1️⃣ Pre-check con happy-dom...');
  const window = new Window();
  const document = window.document;
  
  // Simular ambiente browser básico
  global.window = window;
  global.document = document;
  global.navigator = window.navigator;
  
  // Verificar que happy-dom funciona
  if (!window.fetch) {
    console.error('❌ happy-dom no está funcionando correctamente');
    process.exit(1);
  }
  
  console.log('✅ happy-dom OK\n');
  
  // Segundo: Test real con Puppeteer
  console.log('2️⃣ Test completo con Puppeteer...');
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Capturar TODOS los errores
    const errors = [];
    const warnings = [];
    
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error') {
        errors.push(text);
        console.error(`❌ Console Error: ${text}`);
      } else if (type === 'warning' && text.includes('React')) {
        warnings.push(text);
        console.warn(`⚠️  React Warning: ${text}`);
      }
    });
    
    page.on('pageerror', err => {
      errors.push(err.toString());
      console.error(`❌ Page Error: ${err}`);
    });
    
    page.on('error', err => {
      errors.push(err.toString());
      console.error(`❌ Error: ${err}`);
    });
    
    // Navegar a localhost
    try {
      await page.goto('http://localhost:3000', {
        waitUntil: 'networkidle0',
        timeout: 10000
      });
    } catch (err) {
      console.error('\n❌ FATAL: No se pudo conectar a localhost:3000');
      console.error('   Asegúrate de que el servidor esté corriendo: npm run dev');
      process.exit(1);
    }
    
    // Esperar un momento para que todo cargue
    await page.waitForTimeout(2000);
    
    // Verificar que no hay errores 404
    const response = page.url();
    if (response.includes('404')) {
      errors.push('Landing page returned 404');
    }
    
    await browser.close();
    
    // Reporte final
    console.log('\n' + '='.repeat(50));
    console.log('RESULTADO DEL TEST:');
    console.log('='.repeat(50));
    
    if (errors.length > 0) {
      console.error(`\n❌ FALLÓ - ${errors.length} errores encontrados`);
      console.error('\nDETALLE DE ERRORES:');
      errors.forEach((e, i) => {
        console.error(`${i + 1}. ${e}`);
      });
      process.exit(1);
    }
    
    if (warnings.length > 0) {
      console.warn(`\n⚠️  ${warnings.length} warnings de React`);
    }
    
    console.log('\n✅ Landing page OK - Sin errores');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error ejecutando test:', error);
    await browser.close();
    process.exit(1);
  }
}

// Ejecutar
checkLocalhost().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});