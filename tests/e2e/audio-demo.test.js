const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

describe('Audio Demo E2E Test', () => {
  let browser;
  let page;
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
  
  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: process.env.HEADLESS !== 'false',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream'
      ]
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      console.log(`[Browser ${msg.type()}]:`, msg.text());
    });
    
    // Enable error logging
    page.on('pageerror', error => {
      console.error('[Browser Error]:', error.message);
    });
    
    await page.goto(BASE_URL);
  });

  afterEach(async () => {
    await page.close();
  });

  test('Audio Demo should load and process jfk_speech.wav automatically', async () => {
    // Wait for the Audio Demo section to appear
    await page.waitForSelector('.audio-demo-section', { timeout: 10000 });
    
    // Check that the "Probar Audio Demo" button is visible
    const demoButton = await page.$('button:has-text("Probar Audio Demo")');
    expect(demoButton).toBeTruthy();
    
    // Wait for automatic processing to start
    await page.waitForFunction(() => {
      const logs = document.querySelector('[class*="font-mono"]');
      return logs && logs.textContent.includes('Iniciando procesamiento');
    }, { timeout: 15000 });
    
    // Wait for processing to complete
    await page.waitForFunction(() => {
      const logs = document.querySelector('[class*="font-mono"]');
      return logs && logs.textContent.includes('Procesamiento completado');
    }, { timeout: 30000 });
    
    // Verify both audio players are present
    const audioPlayers = await page.$$('audio');
    expect(audioPlayers.length).toBe(2);
    
    // Verify download button is present
    const downloadButton = await page.$('button:has-text("Descargar Audio Limpio")');
    expect(downloadButton).toBeTruthy();
    
    // Verify export logs button is present
    const exportButton = await page.$('button:has-text("Exportar Logs")');
    expect(exportButton).toBeTruthy();
  });

  test('Should show real-time VAD and RMS logs', async () => {
    await page.waitForSelector('.audio-demo-section', { timeout: 10000 });
    
    // Wait for VAD logs to appear
    await page.waitForFunction(() => {
      const logs = document.querySelector('[class*="font-mono"]');
      return logs && logs.textContent.includes('VAD=');
    }, { timeout: 30000 });
    
    // Get log content
    const logContent = await page.evaluate(() => {
      const logContainer = document.querySelector('[class*="font-mono"]');
      return logContainer ? logContainer.textContent : '';
    });
    
    // Verify log format
    expect(logContent).toMatch(/Frame \d+:/);
    expect(logContent).toMatch(/VAD=[\d.]+/);
    expect(logContent).toMatch(/RMS=[\d.]+/);
  });

  test('Manual processing with button click', async () => {
    await page.waitForSelector('.audio-demo-section', { timeout: 10000 });
    
    // Click the demo button
    await page.click('button:has-text("Probar Audio Demo")');
    
    // Wait for processing to start
    await page.waitForFunction(() => {
      const logs = document.querySelector('[class*="font-mono"]');
      return logs && logs.textContent.includes('Iniciando procesamiento');
    }, { timeout: 15000 });
    
    // Verify button is disabled during processing
    const isDisabled = await page.evaluate(() => {
      const button = document.querySelector('button:has-text("Procesando...")');
      return button && button.disabled;
    });
    expect(isDisabled).toBe(true);
    
    // Wait for completion
    await page.waitForFunction(() => {
      const logs = document.querySelector('[class*="font-mono"]');
      return logs && logs.textContent.includes('Procesamiento completado');
    }, { timeout: 30000 });
  });

  test('Should display statistics summary', async () => {
    await page.waitForSelector('.audio-demo-section', { timeout: 10000 });
    
    // Wait for processing to complete
    await page.waitForFunction(() => {
      const logs = document.querySelector('[class*="font-mono"]');
      return logs && logs.textContent.includes('Procesamiento completado');
    }, { timeout: 30000 });
    
    // Check for statistics
    await page.waitForSelector('text=Frames Procesados');
    await page.waitForSelector('text=VAD Promedio');
    await page.waitForSelector('text=RMS Promedio');
    
    // Verify statistics have values
    const stats = await page.evaluate(() => {
      const statElements = document.querySelectorAll('.text-2xl');
      return Array.from(statElements).map(el => el.textContent);
    });
    
    expect(stats.length).toBeGreaterThan(0);
    stats.forEach(stat => {
      expect(stat).toMatch(/[\d.]+/);
    });
  });

  test('Download functionality', async () => {
    await page.waitForSelector('.audio-demo-section', { timeout: 10000 });
    
    // Wait for processing to complete
    await page.waitForFunction(() => {
      const logs = document.querySelector('[class*="font-mono"]');
      return logs && logs.textContent.includes('Procesamiento completado');
    }, { timeout: 30000 });
    
    // Set up download path
    const downloadPath = path.resolve(__dirname, '../downloads');
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath, { recursive: true });
    }
    
    await page._client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadPath
    });
    
    // Click download button
    await page.click('button:has-text("Descargar Audio Limpio")');
    
    // Wait for download
    await page.waitForTimeout(2000);
    
    // Check if file was downloaded
    const files = fs.readdirSync(downloadPath);
    const wavFile = files.find(f => f.includes('jfk_speech_cleaned.wav'));
    expect(wavFile).toBeTruthy();
    
    // Clean up
    if (wavFile) {
      fs.unlinkSync(path.join(downloadPath, wavFile));
    }
  });

  test('Export logs functionality', async () => {
    await page.waitForSelector('.audio-demo-section', { timeout: 10000 });
    
    // Wait for processing to complete
    await page.waitForFunction(() => {
      const logs = document.querySelector('[class*="font-mono"]');
      return logs && logs.textContent.includes('Procesamiento completado');
    }, { timeout: 30000 });
    
    // Set up download path
    const downloadPath = path.resolve(__dirname, '../downloads');
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath, { recursive: true });
    }
    
    await page._client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadPath
    });
    
    // Click export logs button
    await page.click('button:has-text("Exportar Logs")');
    
    // Wait for download
    await page.waitForTimeout(2000);
    
    // Check if file was downloaded
    const files = fs.readdirSync(downloadPath);
    const logFile = files.find(f => f.includes('audio_demo_logs_'));
    expect(logFile).toBeTruthy();
    
    // Verify log content
    if (logFile) {
      const content = fs.readFileSync(path.join(downloadPath, logFile), 'utf8');
      expect(content).toContain('Frame');
      expect(content).toContain('VAD=');
      expect(content).toContain('RMS=');
      
      // Clean up
      fs.unlinkSync(path.join(downloadPath, logFile));
    }
  });

  test('Error handling for missing WASM', async () => {
    // Navigate with WebAssembly disabled
    await page.evaluateOnNewDocument(() => {
      delete window.WebAssembly;
    });
    
    await page.goto(BASE_URL);
    await page.waitForSelector('.audio-demo-section', { timeout: 10000 });
    
    // Should show degraded mode warning
    const warning = await page.$('.bg-yellow-900\\/20');
    expect(warning).toBeTruthy();
    
    // Should still be able to process (in degraded mode)
    const demoButton = await page.$('button:has-text("Probar Audio Demo")');
    expect(demoButton).toBeTruthy();
  });
});