/**
 * TEST CON TIMEOUT Y SCREENSHOTS
 */

import puppeteer from 'puppeteer';

async function checkLocalhost() {
  console.log('🚀 TEST INICIADO');
  const startTime = Date.now();
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Timer para screenshot si se cuelga
    const timeoutTimer = setTimeout(async () => {
      console.log('\n⏰ TIMEOUT! Tomando screenshot...');
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const screenshotPath = `test/results/timeout-${timestamp}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 Screenshot: ${screenshotPath}`);
      
      // Info de la página
      const pageInfo = await page.evaluate(() => ({
        title: document.title,
        url: window.location.href,
        bodyText: document.body.innerText.substring(0, 500),
        buttons: Array.from(document.querySelectorAll('button')).map(b => ({
          text: b.textContent.trim(),
          id: b.id,
          disabled: b.disabled
        }))
      }));
      console.log('\n📋 Info de página:', JSON.stringify(pageInfo, null, 2));
      
      console.error('\n❌ TEST ABORTADO POR TIMEOUT');
      await browser.close();
      process.exit(1);
    }, 30000); // 30 segundos máximo
    
    // 1. NAVEGAR
    console.log('1️⃣ Navegando...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    console.log('   ✅ Página cargada');
    
    // 2. ESPERAR QUE REACT CARGUE
    console.log('2️⃣ Esperando React...');
    await new Promise(r => setTimeout(r, 3000));
    
    // 3. BUSCAR BOTÓN
    console.log('3️⃣ Buscando botón Initialize...');
    const buttonInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.map(b => ({
        text: b.textContent.trim(),
        id: b.id,
        visible: b.offsetParent !== null
      }));
    });
    console.log('   Botones encontrados:', buttonInfo);
    
    // Si encontramos el botón Initialize
    const hasInitButton = buttonInfo.some(b => b.text.includes('Initialize'));
    if (hasInitButton) {
      console.log('   ✅ Botón Initialize encontrado');
      
      // Click en Initialize
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button'))
          .find(b => b.textContent.includes('Initialize'));
        if (btn) btn.click();
      });
      console.log('   ✅ Click en Initialize');
      
      // Esperar que aparezca el mensaje de carga
      await page.waitForFunction(() => 
        document.body.innerText.includes('Initializing MurmurabaSuite'),
        { timeout: 5000 }
      );
      console.log('   ✅ Pantalla de carga apareció');
    } else {
      console.log('   ⚠️  No hay botón Initialize, el engine ya debe estar inicializado');
    }
    
    // 4. ESPERAR START RECORDING
    console.log('4️⃣ Esperando Start Recording...');
    await page.waitForSelector('#start-recording', { visible: true, timeout: 20000 });
    console.log('   ✅ Start Recording visible');
    
    // 5. ESPERAR QUE SE HABILITE
    console.log('5️⃣ Esperando habilitación...');
    await page.waitForFunction(() => {
      const btn = document.querySelector('#start-recording');
      return btn && !btn.disabled;
    }, { timeout: 10000 });
    console.log('   ✅ Start Recording habilitado');
    
    // 6. MOCK AUDIO
    console.log('6️⃣ Mock audio...');
    await page.evaluate(() => {
      window.navigator.mediaDevices.getUserMedia = async () => {
        console.log('🎤 Mock getUserMedia');
        return new MediaStream();
      };
    });
    
    // 7. CLICK START
    console.log('7️⃣ Click Start Recording...');
    await page.click('#start-recording');
    
    // 8. VERIFICAR STOP
    console.log('8️⃣ Verificando Stop...');
    await page.waitForFunction(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(b => b.textContent.includes('Stop'));
    }, { timeout: 5000 });
    console.log('   ✅ Stop Recording apareció');
    
    // Limpiar timeout
    clearTimeout(timeoutTimer);
    
    console.log('\n✅ TEST PASÓ');
    await browser.close();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    // Screenshot de error
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    await page.screenshot({ path: `test/results/error-${timestamp}.png` });
    
    await browser.close();
    process.exit(1);
  }
}

checkLocalhost();