const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Quick Recording Test');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream'
    ]
  });
  
  const page = await browser.newPage();
  
  // Capturar todos los logs
  page.on('console', msg => {
    console.log('LOG:', msg.text());
  });
  
  await page.goto('http://localhost:3000');
  console.log('✅ Page loaded');
  
  // Wait for app to load
  await new Promise(r => setTimeout(r, 3000));
  
  // Initialize audio engine
  const initResult = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const initBtn = buttons.find(b => b.textContent?.includes('Initialize'));
    if (initBtn) {
      initBtn.click();
      return 'Clicked Initialize';
    }
    return 'No init button found';
  });
  console.log('Init:', initResult);
  
  await new Promise(r => setTimeout(r, 2000));
  
  // Start recording
  const recordResult = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const recordBtn = buttons.find(b => b.textContent?.includes('Start Recording'));
    if (recordBtn) {
      recordBtn.click();
      return 'Clicked Start Recording';
    }
    return 'No record button found';
  });
  console.log('Record:', recordResult);
  
  // Wait to see logs
  await new Promise(r => setTimeout(r, 5000));
  
  await browser.close();
  console.log('✅ Test complete');
})().catch(console.error);