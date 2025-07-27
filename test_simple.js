const puppeteer = require('puppeteer');

async function test() {
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    console.log('Navegando a http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    console.log('Página cargada exitosamente');
    
    // Capturar errores de consola
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Esperar un momento para capturar errores
    await page.waitForTimeout(2000);
    
    if (errors.length > 0) {
      console.log('❌ ERRORES EN CONSOLA:', errors);
    } else {
      console.log('✅ No hay errores en consola');
    }
    
    await browser.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

test();
