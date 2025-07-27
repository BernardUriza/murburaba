const puppeteer = require('puppeteer');

async function testAudioDemo() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Capturar todos los logs de consola
    const logs = [];
    page.on('console', msg => {
      const text = msg.text();
      logs.push(`[${msg.type()}] ${text}`);
      console.log(`[Browser ${msg.type()}] ${text}`);
    });
    
    // Capturar errores
    page.on('pageerror', err => {
      console.error('[Browser Error]', err.toString());
    });
    
    console.log('🌐 Navegando a http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Verificar si necesitamos inicializar manualmente
    console.log('🔍 Verificando estado de inicialización...');
    const initButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.includes('Initialize Audio Engine')) ? true : false;
    });
    
    if (initButton) {
      console.log('🚀 Inicializando Audio Engine manualmente...');
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent.includes('Initialize Audio Engine'));
        if (btn) btn.click();
      });
      // Esperar a que se inicialice
      await new Promise(resolve => setTimeout(resolve, 8000));
    } else {
      // Esperar a que la app se inicialice
      console.log('⏳ Esperando inicialización del engine...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Buscar el botón de Audio Demo (emoji 🎵)
    console.log('🔍 Buscando botón de Audio Demo...');
    
    // Primero, veamos qué botones hay en la página
    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map(btn => ({
        text: btn.textContent,
        title: btn.title,
        className: btn.className
      }));
    });
    console.log('Botones encontrados:', buttons);
    
    // Buscar por el emoji 🎵
    const audioDemoButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('🎵'));
      return btn ? true : false;
    });
    
    if (!audioDemoButton) {
      throw new Error('No se encontró el botón de Audio Demo');
    }
    
    console.log('✅ Botón de Audio Demo encontrado');
    
    // Hacer clic en el botón
    console.log('🖱️ Haciendo clic en Audio Demo...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('🎵'));
      if (btn) btn.click();
    });
    
    // Esperar a que aparezca el panel
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verificar si hay procesamiento automático
    console.log('🔍 Verificando si hay procesamiento automático...');
    
    // Buscar logs de procesamiento
    const processingLogs = logs.filter(log => 
      log.includes('Processing WAV file') || 
      log.includes('[AudioDemo] Processing') ||
      log.includes('Processing file:')
    );
    
    if (processingLogs.length > 0) {
      console.error('❌ ERROR: Se detectó procesamiento automático!');
      console.error('Logs de procesamiento encontrados:');
      processingLogs.forEach(log => console.error('  - ' + log));
      throw new Error('El AudioDemo está procesando automáticamente');
    }
    
    console.log('✅ No se detectó procesamiento automático');
    
    // Buscar el botón "Process Demo"
    const processButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Process Demo')) ? true : false;
    });
    
    if (!processButton) {
      throw new Error('No se encontró el botón "Process Demo"');
    }
    
    console.log('✅ Botón "Process Demo" está presente y esperando acción del usuario');
    
    // Verificar que no hay errores de Redux
    const reduxErrors = logs.filter(log => log.includes('non-serializable'));
    if (reduxErrors.length > 0) {
      console.warn('⚠️ Advertencias de Redux sobre valores no serializables:');
      console.warn(`  Encontradas ${reduxErrors.length} advertencias`);
    }
    
    console.log('\n✅ TEST EXITOSO: AudioDemo no se ejecuta automáticamente');
    
  } catch (error) {
    console.error('\n❌ TEST FALLIDO:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

console.log('🧪 Iniciando test de AudioDemo...\n');
testAudioDemo();