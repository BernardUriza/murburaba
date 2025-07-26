import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    console.log('Opening page...');
    
    await page.goto('http://localhost:3002', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    });
    
    // Wait for app to load
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    // Check if Audio Demo is open
    const pageText = await page.evaluate(() => document.body.innerText);
    
    if (pageText.includes('🎧 Audio Demo')) {
      console.log('✓ Audio Demo is open');
      
      // Check for "No processed audio" error
      const hasError = pageText.includes('No processed audio') && 
                       pageText.includes('Error al procesar audio');
      
      if (hasError) {
        console.log('❌ "No processed audio" error is still showing');
      } else {
        console.log('✓ No error dialog showing');
      }
      
      // Check for placeholder text
      const hasPlaceholder = pageText.includes('Click "Process Demo" to generate audio');
      console.log(hasPlaceholder ? 
        '✓ Placeholder text is showing correctly' : 
        '❌ Placeholder text not found');
    } else {
      console.log('Audio Demo not open');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'audio-demo-check.png' });
    console.log('Screenshot saved: audio-demo-check.png');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();