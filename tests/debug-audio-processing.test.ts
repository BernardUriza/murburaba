import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import puppeteer, { Browser, Page } from 'puppeteer';

describe('Audio Processing Debug', () => {
  let browser: Browser;
  let page: Page;
  
  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
  }, 30000);
  
  afterAll(async () => {
    await browser?.close();
  });
  
  it('should process audio demo without errors', async () => {
    
    // Capture ALL console logs
    const logs: string[] = [];
    page.on('console', msg => {
      const text = `[${msg.type()}] ${msg.text()}`;
      logs.push(text);
      console.log(text);
    });
    
    // Capture page errors
    page.on('pageerror', error => {
      const text = `[ERROR] ${error.message}`;
      logs.push(text);
      console.error(text);
    });

    console.log('=== Starting Audio Processing Debug ===\n');
    
    // Navigate
    console.log('1. Navigating to app...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'domcontentloaded'
    });
    
    // Wait for app to initialize
    await page.waitForFunction(
      () => !document.body.innerText.includes('Initializing MurmurabaSuite'),
      { timeout: 30000 }
    );
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if Audio Demo is already open
    const isOpen = await page.evaluate(() => 
      document.body.innerText.includes('🎧 Audio Demo')
    );
    
    if (!isOpen) {
      console.log('2. Opening Audio Demo...');
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent?.includes('🎵'));
        if (btn) btn.click();
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log('2. Audio Demo already open');
    }
    
    // Clear previous logs and focus on processing
    logs.length = 0;
    console.log('\n3. Clicking Process Demo button...\n');
    
    // Click Process Demo
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const processBtn = buttons.find(btn => 
        btn.textContent?.includes('Process Demo') || 
        (btn.textContent?.includes('🎵') && btn.textContent?.includes('Process'))
      );
      if (processBtn && !processBtn.disabled) {
        processBtn.click();
        return true;
      }
      return false;
    });
    
    if (!clicked) {
      console.log('Could not find Process Demo button');
      return;
    }
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Check final state
    const finalState = await page.evaluate(() => {
      const errors = Array.from(document.querySelectorAll('[class*="error"]'))
        .map(el => el.textContent);
      const hasProcessed = document.body.innerText.includes('Processed');
      const audioCount = document.querySelectorAll('audio').length;
      
      return { errors, hasProcessed, audioCount };
    });
    
    console.log('\n=== Final State ===');
    console.log('Errors:', finalState.errors);
    console.log('Has processed section:', finalState.hasProcessed);
    console.log('Audio elements:', finalState.audioCount);
    
    console.log('\n=== All Console Logs ===');
    logs.forEach(log => console.log(log));
    
    
    // Assertions
    expect(finalState.errors).toHaveLength(0);
    expect(finalState.hasProcessed).toBe(true);
    expect(finalState.audioCount).toBeGreaterThan(0);
  }, 30000);
});