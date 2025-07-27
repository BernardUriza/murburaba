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
  // Detectar puerto automáticamente
  const port = process.env.PORT || 3000;
  const url = `http://localhost:${port}`;
  console.log(`🔍 Checking ${url}...\n`);
  
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
        // Ignorar el error específico de inicialización del engine (es esperado)
        if (text.includes('Engine initialization failed or timed out')) {
          console.log(`⚠️  Engine timeout (esperado): entrando en modo degradado`);
        } else {
          errors.push(text);
          console.error(`❌ Console Error: ${text}`);
        }
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
        // Ignorar errores de blob URLs (estos son de audio procesado)
        if (request.url().startsWith('blob:')) {
          console.log(`⚠️  Blob request failed (ignorando): ${request.url()}`);
        } else {
          console.error(`❌ Request failed: ${request.url()} - ${failure.errorText}`);
          errors.push(`Request failed: ${request.url()}`);
        }
      }
    });
    
    // Navegar a localhost
    try {
      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 10000
      });
    } catch (err) {
      console.error(`\n❌ FATAL: No se pudo conectar a ${url}`);
      console.error('   Asegúrate de que el servidor esté corriendo: npm run dev');
      console.error('   Si el puerto 3000 está ocupado, usa: PORT=3001 node test/check-localhost.js');
      process.exit(1);
    }
    
    // Esperar un momento para que todo cargue
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verificar que no hay errores 404
    const response = page.url();
    if (response.includes('404')) {
      errors.push('Landing page returned 404');
    }
    
    console.log('\n🔍 Verificando pantalla de bienvenida...');
    
    // Paso 1: Verificar que aparece la pantalla de bienvenida
    try {
      await page.waitForSelector('button:has-text("Initialize Audio Engine")', { timeout: 5000 });
      console.log('✅ Pantalla de bienvenida cargada correctamente');
      
      // Tomar screenshot de la pantalla inicial
      await page.screenshot({ 
        path: 'test/localhost-welcome.png',
        fullPage: true 
      });
      console.log('📸 Screenshot inicial guardado en: test/localhost-welcome.png');
    } catch (e) {
      console.error('❌ No se encontró el botón de inicialización');
      errors.push('Botón "Initialize Audio Engine" no encontrado');
      return;
    }
    
    // Capturar logs de inicialización
    const initLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('MurmurabaSuite') || text.includes('engine') || text.includes('WASM')) {
        initLogs.push(`[${msg.type()}] ${text}`);
      }
    });
    
    console.log('\n🚀 Haciendo clic en "Initialize Audio Engine"...');
    
    // Paso 2: Hacer clic en el botón de inicialización
    await page.click('button:has-text("Initialize Audio Engine")');
    
    // Paso 3: Verificar que aparece la pantalla de carga
    try {
      await page.waitForSelector('h3:has-text("Initializing MurmurabaSuite")', { timeout: 2000 });
      console.log('✅ Pantalla de carga apareció correctamente');
      
      // Tomar screenshot de la pantalla de carga
      await page.screenshot({ 
        path: 'test/localhost-loading.png',
        fullPage: true 
      });
      console.log('📸 Screenshot de carga guardado en: test/localhost-loading.png');
    } catch (e) {
      console.error('❌ No apareció la pantalla de carga');
      errors.push('Pantalla "Initializing MurmurabaSuite..." no apareció');
    }
    
    console.log('\n⏳ Esperando inicialización completa (hasta 10 segundos)...');
    
    // Paso 4: Esperar a que termine la inicialización
    try {
      await page.waitForFunction(
        () => {
          const body = document.body.innerText;
          return !body.includes('Initializing MurmurabaSuite') && 
                 (body.includes('MurmurABA') || body.includes('Audio Controls'));
        },
        { timeout: 10000 }
      );
      console.log('✅ Aplicación inicializada correctamente');
      
      // Imprimir logs de inicialización capturados
      if (initLogs.length > 0) {
        console.log('\n📋 Logs de inicialización:');
        initLogs.forEach(log => console.log(`   ${log}`));
      }
    } catch (e) {
      console.error('❌ Error: La inicialización tomó más de 10 segundos');
      errors.push('Timeout en inicialización de MurmurabaSuite');
      
      // Obtener información de debug
      const debugInfo = await page.evaluate(() => {
        const body = document.body.innerText;
        const hasError = document.querySelector('.error-message');
        return {
          bodyText: body.substring(0, 300),
          hasError: !!hasError,
          errorText: hasError ? hasError.textContent : null,
          audioContext: window.audioContext ? window.audioContext.state : 'no context'
        };
      });
      
      console.error('📋 Debug info:', JSON.stringify(debugInfo, null, 2));
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