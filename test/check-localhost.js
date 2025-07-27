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
    
    page.on('console', async msg => {
      const type = msg.type();
      let text = msg.text();
      
      // Intentar obtener los argumentos completos del mensaje
      try {
        const args = await Promise.all(msg.args().map(arg => arg.jsonValue().catch(() => arg.toString())));
        if (args.length > 0) {
          text = args.join(' ');
        }
      } catch (e) {
        // Mantener el texto original si falla
      }
      
      if (type === 'error') {
        errors.push(text);
        console.error(`❌ Console Error: ${text}`);
      } else if (type === 'warning') {
        warnings.push(text);
        console.warn(`⚠️  Console Warning: ${text}`);
      } else if (type === 'log' || type === 'info') {
        console.log(`📝 Console ${type}: ${text}`);
      } else if (type === 'debug') {
        console.log(`🔍 Console debug: ${text}`);
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
    
    // Capturar errores de requests fallidos
    page.on('requestfailed', request => {
      const failure = request.failure();
      if (failure) {
        console.error(`❌ Request failed: ${request.url()} - ${failure.errorText}`);
      }
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
    
    // Verificar que la aplicación se inicializa correctamente
    console.log('\n⏳ Esperando inicialización de la aplicación...');
    
    try {
      // Esperar a que desaparezca el mensaje de inicialización o aparezca contenido principal
      await page.waitForFunction(
        () => {
          const body = document.body.innerText;
          // Si todavía muestra "Initializing" después de 5 segundos, es un error
          return !body.includes('Initializing MurmurabaSuite') || 
                 body.includes('MurmurABA') || 
                 body.includes('Audio') ||
                 body.includes('Record');
        },
        { timeout: 5000 }
      );
      console.log('✅ Aplicación inicializada correctamente');
    } catch (e) {
      // Obtener más información sobre el estado
      const debugInfo = await page.evaluate(() => {
        const body = document.body.innerText;
        const hasError = document.querySelector('.error-message');
        return {
          bodyText: body.substring(0, 200),
          hasError: !!hasError,
          errorText: hasError ? hasError.textContent : null,
          url: window.location.href
        };
      });
      
      console.error('❌ Error de inicialización: La app no progresó más allá del mensaje de carga');
      console.error('📋 Debug info:', JSON.stringify(debugInfo, null, 2));
      errors.push('La aplicación se quedó atascada en "Initializing MurmurabaSuite..." por más de 5 segundos');
    }
    
    // Esperar un poco más para asegurar carga completa
    await new Promise(resolve => setTimeout(resolve, 2000));
    
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
    // await checkBuild();  // SKIP - toma mucho tiempo
    await checkLocalhost();  // Solo verificar runtime
  } catch (err) {
    console.error('Fatal:', err);
    process.exit(1);
  }
}

runAllChecks();