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
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verificar que no hay errores 404
    const response = page.url();
    if (response.includes('404')) {
      errors.push('Landing page returned 404');
    }
    
    // Esperar 10 segundos y tomar screenshot
    console.log('\n⏳ Esperando 10 segundos para screenshot final...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Tomar screenshot
    const screenshotPath = 'test/localhost-final.png';
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    console.log(`📸 Screenshot guardado en: ${screenshotPath}`);
    
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

// Función adicional: Verificar que el build funciona
async function checkBuild() {
  console.log('\n3️⃣ Verificando que el proyecto compila...');
  
  const { execSync } = require('child_process');
  
  try {
    // Intentar build de TypeScript
    execSync('cd packages/murmuraba && npx tsc --noEmit', { 
      stdio: 'pipe',
      encoding: 'utf-8' 
    });
    console.log('✅ TypeScript del paquete OK');
    
    // Intentar build de Next.js (solo type-check)
    execSync('npx next build --no-lint', { 
      stdio: 'pipe',
      encoding: 'utf-8',
      env: { ...process.env, SKIP_BUILD: 'true' }
    });
    console.log('✅ Next.js types OK');
    
  } catch (error) {
    console.error('\n❌ ERROR DE COMPILACIÓN:');
    console.error(error.stdout || error.stderr || error.message);
    console.error('\n🔧 Arregla los errores de TypeScript/build antes de continuar');
    process.exit(1);
  }
}

// Ejecutar TODO
async function runAllChecks() {
  try {
    await checkBuild();  // Primero verificar que compila
    await checkLocalhost();  // Luego verificar runtime
  } catch (err) {
    console.error('Fatal:', err);
    process.exit(1);
  }
}

runAllChecks();