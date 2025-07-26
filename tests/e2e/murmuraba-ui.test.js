const puppeteer = require('puppeteer');

describe('Murmuraba UI E2E Tests', () => {
  let browser;
  let page;
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: process.env.HEADLESS !== 'false',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--allow-file-access-from-files'
      ]
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    
    // Grant microphone permissions
    const context = browser.defaultBrowserContext();
    await context.overridePermissions(BASE_URL, ['microphone']);
    
    // Log console messages
    page.on('console', msg => {
      console.log(`[Browser ${msg.type()}]:`, msg.text());
    });
    
    // Log errors
    page.on('pageerror', error => {
      console.error('[Browser Error]:', error.message);
    });
    
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  });

  afterEach(async () => {
    await page.close();
  });

  test('Should load the main page', async () => {
    // Wait for main content
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Check title
    const title = await page.title();
    expect(title).toContain('Murmuraba Studio');
    
    // Verify main sections exist
    const recordButton = await page.$('button[aria-label="Iniciar grabación"]');
    expect(recordButton).toBeTruthy();
  });

  test('Should show waveform when recording starts', async () => {
    // Click record button
    await page.click('button[aria-label="Iniciar grabación"]');
    
    // Wait for waveform analyzer to appear
    await page.waitForSelector('canvas', { timeout: 5000 });
    
    // Verify canvas is rendering
    const canvasData = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return null;
      
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Check if any pixels are drawn (not all transparent)
      let hasContent = false;
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] > 0) {
          hasContent = true;
          break;
        }
      }
      
      return {
        width: canvas.width,
        height: canvas.height,
        hasContent
      };
    });
    
    expect(canvasData).toBeTruthy();
    expect(canvasData.width).toBeGreaterThan(0);
    expect(canvasData.height).toBeGreaterThan(0);
  });

  test('Should process chunks when recording stops', async () => {
    // Start recording
    await page.click('button[aria-label="Iniciar grabación"]');
    
    // Wait 3 seconds
    await page.waitForTimeout(3000);
    
    // Stop recording
    await page.click('button[aria-label="Detener grabación"]');
    
    // Wait for chunk processing results
    await page.waitForSelector('[data-testid="chunk-results"]', { timeout: 10000 });
    
    // Verify chunks were created
    const chunks = await page.$$('[data-testid="chunk-item"]');
    expect(chunks.length).toBeGreaterThan(0);
    
    // Check VAD scores are displayed
    const vadScores = await page.evaluate(() => {
      const vadElements = document.querySelectorAll('[data-testid="vad-score"]');
      return Array.from(vadElements).map(el => parseFloat(el.textContent));
    });
    
    expect(vadScores.length).toBeGreaterThan(0);
    vadScores.forEach(score => {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  test('Should display metrics panel', async () => {
    // Check if metrics panel exists
    const metricsPanel = await page.$('[data-testid="metrics-panel"]');
    expect(metricsPanel).toBeTruthy();
    
    // Start recording to generate metrics
    await page.click('button[aria-label="Iniciar grabación"]');
    await page.waitForTimeout(2000);
    
    // Check for metric values
    const metrics = await page.evaluate(() => {
      const elements = document.querySelectorAll('[data-testid^="metric-"]');
      const result = {};
      
      elements.forEach(el => {
        const key = el.getAttribute('data-testid').replace('metric-', '');
        result[key] = el.textContent;
      });
      
      return result;
    });
    
    // Verify some metrics exist
    expect(Object.keys(metrics).length).toBeGreaterThan(0);
  });

  test('Should handle errors gracefully', async () => {
    // Simulate WebAssembly not available
    await page.evaluateOnNewDocument(() => {
      delete window.WebAssembly;
    });
    
    await page.reload({ waitUntil: 'networkidle0' });
    
    // Should show warning but still be functional
    const warningMessage = await page.$('[data-testid="wasm-warning"]');
    if (warningMessage) {
      const text = await warningMessage.evaluate(el => el.textContent);
      expect(text).toContain('WebAssembly');
    }
    
    // App should still load
    const recordButton = await page.$('button[aria-label="Iniciar grabación"]');
    expect(recordButton).toBeTruthy();
  });

  test('Should download processed audio chunks', async () => {
    // Start and stop recording
    await page.click('button[aria-label="Iniciar grabación"]');
    await page.waitForTimeout(2000);
    await page.click('button[aria-label="Detener grabación"]');
    
    // Wait for chunks
    await page.waitForSelector('[data-testid="chunk-item"]', { timeout: 10000 });
    
    // Find download button
    const downloadButton = await page.$('[data-testid="download-chunk-0"]');
    expect(downloadButton).toBeTruthy();
    
    // Set up download monitoring
    const downloadPromise = page.waitForEvent('download');
    
    // Click download
    await downloadButton.click();
    
    // Wait for download
    const download = await downloadPromise;
    const filename = download.suggestedFilename();
    
    expect(filename).toMatch(/chunk.*\.(wav|webm|mp3)$/);
  });

  test('Should display build info', async () => {
    // Check for build info component
    const buildInfo = await page.$('[data-testid="build-info"]');
    expect(buildInfo).toBeTruthy();
    
    // Get build info text
    const buildText = await buildInfo.evaluate(el => el.textContent);
    
    // Should contain version and date
    expect(buildText).toMatch(/v?\d+\.\d+\.\d+/); // Version pattern
    expect(buildText).toMatch(/\d{4}/); // Year in date
  });

  test('Should clear recordings', async () => {
    // Record something first
    await page.click('button[aria-label="Iniciar grabación"]');
    await page.waitForTimeout(2000);
    await page.click('button[aria-label="Detener grabación"]');
    
    // Wait for results
    await page.waitForSelector('[data-testid="chunk-results"]', { timeout: 10000 });
    
    // Find and click clear button
    const clearButton = await page.$('button[aria-label="Limpiar grabaciones"]');
    expect(clearButton).toBeTruthy();
    
    await clearButton.click();
    
    // Confirm in dialog if it appears
    const confirmButton = await page.$('button:has-text("Confirmar")');
    if (confirmButton) {
      await confirmButton.click();
    }
    
    // Results should be gone
    await page.waitForFunction(() => {
      const results = document.querySelector('[data-testid="chunk-results"]');
      return !results || results.children.length === 0;
    }, { timeout: 5000 });
  });

  test('Should play chunk audio', async () => {
    // Record audio
    await page.click('button[aria-label="Iniciar grabación"]');
    await page.waitForTimeout(2000);
    await page.click('button[aria-label="Detener grabación"]');
    
    // Wait for chunks
    await page.waitForSelector('[data-testid="chunk-item"]', { timeout: 10000 });
    
    // Find play button
    const playButton = await page.$('[data-testid="play-chunk-0"]');
    expect(playButton).toBeTruthy();
    
    // Monitor audio playback
    const audioPlaying = await page.evaluate(() => {
      return new Promise((resolve) => {
        // Listen for any audio element play event
        const checkAudio = () => {
          const audios = document.querySelectorAll('audio');
          for (const audio of audios) {
            if (!audio.paused) {
              resolve(true);
              return;
            }
          }
        };
        
        // Set up mutation observer to catch dynamically created audio
        const observer = new MutationObserver(checkAudio);
        observer.observe(document.body, { childList: true, subtree: true });
        
        // Timeout after 5 seconds
        setTimeout(() => resolve(false), 5000);
      });
    });
    
    // Click play
    await playButton.click();
    
    // Wait a bit for audio to start
    await page.waitForTimeout(1000);
    
    // Check if audio started playing
    const isPlaying = await page.evaluate(() => {
      const audios = document.querySelectorAll('audio');
      return Array.from(audios).some(audio => !audio.paused);
    });
    
    expect(isPlaying || audioPlaying).toBe(true);
  });
});