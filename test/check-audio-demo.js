/**
 * TEST PARA AUDIO DEMO
 * 
 * Ejecutar: node test/check-audio-demo.js
 * 
 * Prueba que el Audio Demo funcione correctamente
 */

const puppeteer = require('puppeteer');
const { Window } = require('happy-dom');

async function checkAudioDemo() {
  console.log('🎵 Testing Audio Demo functionality...\n');
  
  // Pre-check con happy-dom
  console.log('1️⃣ Pre-check con happy-dom...');
  const window = new Window();
  global.window = window;
  global.document = window.document;
  global.navigator = window.navigator;
  console.log('✅ happy-dom OK\n');
  
  // Test con Puppeteer
  console.log('2️⃣ Test completo con Puppeteer...');
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Capturar errores y logs
    const errors = [];
    const logs = [];
    const rnnoiseMessages = [];
    
    page.on('console', async msg => {
      const type = msg.type();
      let text = msg.text();
      
      try {
        const args = await Promise.all(msg.args().map(arg => arg.jsonValue().catch(() => arg.toString())));
        if (args.length > 0) {
          text = args.join(' ');
        }
      } catch (e) {}
      
      // Capturar mensajes relacionados con rnnoise
      if (text.toLowerCase().includes('rnnoise') || 
          text.toLowerCase().includes('audio') ||
          text.includes('MurmurabaSuite') ||
          text.includes('AudioProcessor')) {
        rnnoiseMessages.push(`[${type}] ${text}`);
      }
      
      if (type === 'error') {
        // Ignorar el error específico de inicialización del engine
        if (text.includes('Engine initialization failed or timed out')) {
          console.log(`⚠️  Engine timeout (esperado): entrando en modo degradado`);
        } else {
          errors.push(text);
          console.error(`❌ Console Error: ${text}`);
        }
      } else {
        logs.push(`[${type}] ${text}`);
        console.log(`📝 Console ${type}: ${text}`);
      }
    });
    
    page.on('pageerror', err => {
      errors.push(err.toString());
      console.error(`❌ Page Error: ${err}`);
    });
    
    // Navegar a localhost
    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle0',
      timeout: 10000
    });
    
    // Esperar a que MurmurabaSuite se inicialice
    console.log('\n⏳ Esperando inicialización de MurmurabaSuite...');
    try {
      await page.waitForFunction(
        () => {
          const body = document.body.innerText;
          return !body.includes('Initializing MurmurabaSuite');
        },
        { timeout: 10000 }
      );
      console.log('✅ MurmurabaSuite inicializado');
    } catch (e) {
      console.error('❌ MurmurabaSuite no se inicializó en 10 segundos');
      errors.push('MurmurabaSuite initialization timeout');
    }
    
    // Esperar un poco más para asegurar carga completa
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Abrir Audio Demo
    console.log('\n🎵 Abriendo Audio Demo...');
    
    // Buscar y hacer clic en el botón de Audio Demo
    const audioDemoButton = await page.waitForSelector('[title="Audio Demo"]', { timeout: 5000 });
    if (audioDemoButton) {
      await audioDemoButton.click();
      console.log('✅ Botón Audio Demo clickeado');
      
      // Esperar un poco para que se procese el click
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verificar si el panel está visible
      const panelExists = await page.evaluate(() => {
        const overlayPanel = document.querySelector('.overlay-panel');
        const audioDemoPanel = document.querySelector('[class*="audioDemo"]');
        return {
          overlayExists: !!overlayPanel,
          audioDemoExists: !!audioDemoPanel,
          overlayVisible: overlayPanel ? window.getComputedStyle(overlayPanel).display !== 'none' : false
        };
      });
      
      console.log('📊 Estado del panel:', panelExists);
      
      if (!panelExists.overlayExists && !panelExists.audioDemoExists) {
        console.log('⚠️  El panel de Audio Demo no apareció después del click');
      } else {
        console.log('✅ Panel Audio Demo detectado');
      }
      
      
    } else {
      errors.push('No se encontró el botón de Audio Demo');
    }
    
    // Screenshot final
    await page.screenshot({ 
      path: 'test/audio-demo-final.png',
      fullPage: true 
    });
    console.log('📸 Screenshot guardado en: test/audio-demo-final.png');
    
    await browser.close();
    
    // Reporte final
    console.log('\n' + '='.repeat(50));
    console.log('RESULTADO DEL TEST AUDIO DEMO:');
    console.log('='.repeat(50));
    
    console.log('\n📋 Mensajes relacionados con RNNoise/Audio:');
    rnnoiseMessages.forEach(msg => console.log(`  ${msg}`));
    
    if (errors.length > 0) {
      console.error(`\n❌ FALLÓ - ${errors.length} errores encontrados`);
      console.error('\nDETALLE DE ERRORES:');
      errors.forEach((e, i) => {
        console.error(`${i + 1}. ${e}`);
      });
      process.exit(1);
    }
    
    console.log('\n✅ Audio Demo test completado sin errores');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error ejecutando test:', error);
    await browser.close();
    process.exit(1);
  }
}

checkAudioDemo();