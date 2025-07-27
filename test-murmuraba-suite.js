const puppeteer = require('puppeteer');
const fs = require('fs');

// Configuration
const MAX_WAIT_TIME = 10000; // 10 seconds max
const SCREENSHOT_PATH = 'murmuraba-test-final.png';

async function testMurmurabaSuite() {
  console.log('🚀 Starting MurmurabaSuite test...\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  let testPassed = false;
  
  try {
    const page = await browser.newPage();
    
    // Set viewport for consistent screenshots
    await page.setViewport({ width: 1280, height: 720 });
    
    // Collect console messages
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push({ type: msg.type(), text });
      
      // Log ALL messages for debugging
      console.log(`[${msg.type().toUpperCase()}] ${text}`);
      
      // Check for initialization completion or errors
      if (text.toLowerCase().includes('error') || text.toLowerCase().includes('fail')) {
        errors.push('Console error: ' + text);
      }
    });
    
    // Collect errors
    const errors = [];
    page.on('pageerror', error => {
      errors.push(error.toString());
      console.error('❌ Page error:', error.toString());
    });
    
    // Also catch unhandled promise rejections
    page.on('unhandledrejection', error => {
      const errorStr = error ? error.toString() : 'Unknown rejection';
      errors.push('Unhandled rejection: ' + errorStr);
      console.error('❌ Unhandled rejection:', errorStr);
    });
    
    console.log('📍 Navigating to http://localhost:3000...');
    try {
      await page.goto('http://localhost:3000', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
    } catch (navError) {
      console.error('❌ Failed to navigate:', navError.message);
      console.log('\n🔧 Make sure the server is running: npm run dev:next');
      return;
    }
    
    console.log('✅ Page loaded\n');
    
    // Click on the page to trigger AudioContext (Chrome autoplay policy)
    console.log('🖱️ Clicking on page to trigger AudioContext...');
    await page.click('body');
    await new Promise(resolve => setTimeout(resolve, 500)); // Give it a moment
    
    // Wait for MurmurabaSuite to initialize (max 10 seconds)
    console.log('⏳ Waiting for MurmurabaSuite to initialize (max 10 seconds)...');
    const startTime = Date.now();
    
    try {
      // Wait for the loading message to disappear
      await page.waitForFunction(
        () => !document.body.textContent.includes('Initializing MurmurabaSuite'),
        { timeout: MAX_WAIT_TIME }
      );
      
      const initTime = Date.now() - startTime;
      console.log(`✅ MurmurabaSuite initialized in ${initTime}ms\n`);
      
    } catch (waitError) {
      console.error('❌ MurmurabaSuite failed to initialize within 10 seconds');
      
      // Take error screenshot
      await page.screenshot({ path: 'murmuraba-error.png' });
      console.log('📸 Error screenshot saved to murmuraba-error.png');
      
      // Check what's on the page
      const pageText = await page.evaluate(() => document.body.innerText);
      console.log('\n📄 Page content:', pageText.substring(0, 200) + '...');
      
      // Show all console logs
      console.log('\n📋 All console logs:');
      consoleLogs.forEach(log => {
        console.log(`  [${log.type}] ${log.text}`);
      });
      
      // Show all errors
      if (errors.length > 0) {
        console.log('\n❌ All errors:');
        errors.forEach(err => console.log('  ', err));
      }
      
      return;
    }
    
    // Check for MurmurabaSuite status indicator
    console.log('🔍 Looking for MurmurabaSuite status indicator...');
    const statusElement = await page.$('div[style*="bottom: 20"]');
    if (statusElement) {
      const statusText = await statusElement.evaluate(el => el.innerText);
      console.log('📊 MurmurabaSuite Status:\n', statusText);
      
      // Check if it's ready
      const isReady = statusText.includes('Ready: ✅');
      if (isReady) {
        console.log('✅ MurmurabaSuite is ready!\n');
      } else {
        console.log('⚠️ MurmurabaSuite status shows not ready\n');
      }
    }
    
    // Look for AudioDemo FAB button
    console.log('🔍 Looking for AudioDemo FAB button...');
    
    // Try multiple selectors for the FAB button
    const fabSelectors = [
      'button:has-text("🎵")',
      'button[aria-label*="Audio Demo"]',
      'button[aria-label*="audio demo"]',
      '.fab-button:has-text("🎵")',
      '[data-testid="audio-demo-fab"]',
      'button[title*="Audio Demo"]'
    ];
    
    let audioFabButton = null;
    for (const selector of fabSelectors) {
      try {
        // Use XPath for has-text functionality
        if (selector.includes(':has-text')) {
          const text = selector.match(/:has-text\("(.+)"\)/)?.[1];
          if (text) {
            audioFabButton = await page.$x(`//button[contains(text(), "${text}")]`);
            if (audioFabButton.length > 0) {
              audioFabButton = audioFabButton[0];
              console.log(`✅ Found AudioDemo FAB with selector: ${selector}`);
              break;
            }
          }
        } else {
          audioFabButton = await page.$(selector);
          if (audioFabButton) {
            console.log(`✅ Found AudioDemo FAB with selector: ${selector}`);
            break;
          }
        }
      } catch (e) {
        // Continue trying
      }
    }
    
    // If not found with specific selectors, search all buttons
    if (!audioFabButton) {
      const allButtons = await page.$$('button');
      console.log(`\n📱 Found ${allButtons.length} buttons on the page`);
      
      for (const button of allButtons) {
        const text = await button.evaluate(el => el.textContent);
        const ariaLabel = await button.evaluate(el => el.getAttribute('aria-label'));
        const title = await button.evaluate(el => el.getAttribute('title'));
        
        if (text?.includes('🎵') || 
            ariaLabel?.toLowerCase().includes('audio') ||
            title?.toLowerCase().includes('audio')) {
          audioFabButton = button;
          console.log(`✅ Found AudioDemo FAB by content: "${text || ariaLabel || title}"`);
          break;
        }
      }
    }
    
    // Take final screenshot
    await page.screenshot({ path: SCREENSHOT_PATH });
    console.log(`\n📸 Final screenshot saved to ${SCREENSHOT_PATH}`);
    
    // Highlight the FAB button if found
    if (audioFabButton) {
      // Add a red border to highlight it
      await audioFabButton.evaluate(el => {
        el.style.border = '3px solid red';
        el.style.boxShadow = '0 0 10px red';
      });
      
      // Take another screenshot with highlighted button
      await page.screenshot({ path: 'murmuraba-highlighted.png' });
      console.log('📸 Screenshot with highlighted FAB saved to murmuraba-highlighted.png');
      
      testPassed = true;
    } else {
      console.log('\n❌ AudioDemo FAB button not found');
      
      // List all buttons for debugging
      const buttons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button')).map(btn => ({
          text: btn.textContent,
          ariaLabel: btn.getAttribute('aria-label'),
          className: btn.className,
          isVisible: btn.offsetWidth > 0 && btn.offsetHeight > 0
        }));
      });
      
      console.log('\n📋 All buttons found:');
      buttons.forEach((btn, i) => {
        if (btn.isVisible) {
          console.log(`  ${i + 1}. Text: "${btn.text}", Aria: "${btn.ariaLabel}", Class: "${btn.className}"`);
        }
      });
    }
    
    // Final summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY:');
    console.log('='.repeat(50));
    console.log(`MurmurabaSuite initialized: ✅`);
    console.log(`AudioDemo FAB found: ${testPassed ? '✅' : '❌'}`);
    console.log(`Errors encountered: ${errors.length}`);
    console.log(`Test result: ${testPassed ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
  } finally {
    await browser.close();
  }
  
  return testPassed;
}

// Run the test
testMurmurabaSuite().then(passed => {
  process.exit(passed ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});