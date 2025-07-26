import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Capture console logs
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error' || type === 'warn') {
        console.log(`[${type.toUpperCase()}]`, msg.text());
      }
    });
    
    // Capture page errors
    page.on('pageerror', error => {
      console.error('Page error:', error.message);
    });

    await page.setViewport({ width: 1280, height: 800 });
    
    // Step 1: Navigate to app
    console.log('1. Navigating to localhost:3002...');
    await page.goto('http://localhost:3002', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    // Wait for MurmurabaSuite to initialize
    console.log('   Waiting for MurmurabaSuite to initialize...');
    await page.waitForFunction(
      () => !document.body.innerText.includes('Initializing MurmurabaSuite'),
      { timeout: 30000 }
    );
    console.log('   ✓ App initialized');
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Additional wait for buttons to render
    
    // Step 2: Click on Audio Demo button
    console.log('2. Looking for 🎧 Audio Demo button...');
    
    // Debug: Check page content
    const pageInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const allText = document.body.innerText;
      return {
        buttonCount: buttons.length,
        buttonTexts: buttons.map(btn => btn.textContent?.trim()),
        hasAudioDemo: allText.includes('Audio Demo'),
        pageText: allText.substring(0, 300)
      };
    });
    console.log('   Page info:', pageInfo);
    
    // Check if Audio Demo is already open
    const isAudioDemoOpen = await page.evaluate(() => {
      return document.body.innerText.includes('🎧 Audio Demo') && 
             document.body.innerText.includes('Process Demo');
    });
    
    if (isAudioDemoOpen) {
      console.log('   ✓ Audio Demo is already open');
    } else {
      // Try to click Audio Demo FAB button
      const audioDemoClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const audioBtn = buttons.find(btn => 
          btn.textContent?.includes('🎵') && !btn.textContent?.includes('Process')
        );
        if (audioBtn) {
          audioBtn.click();
          return true;
        }
        return false;
      });
      
      if (!audioDemoClicked) {
        throw new Error('Could not find Audio Demo button');
      }
      console.log('   ✓ Clicked Audio Demo button');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Step 3: Wait for "ready" state
    console.log('3. Waiting for "ready" state...');
    const isReady = await page.waitForFunction(
      () => {
        const spans = Array.from(document.querySelectorAll('span'));
        return spans.some(span => span.textContent === 'ready');
      },
      { timeout: 10000 }
    );
    
    if (isReady) {
      console.log('   ✓ Audio Demo is ready');
    }
    
    // Take screenshot of ready state
    await page.screenshot({ path: 'audio-demo-ready.png' });
    console.log('   📸 Screenshot saved: audio-demo-ready.png');
    
    // Step 4: Check for "No processed audio" text
    console.log('4. Checking for "No processed audio" state...');
    const hasNoProcessedAudio = await page.evaluate(() => {
      return document.body.textContent?.includes('No processed audio');
    });
    
    if (hasNoProcessedAudio) {
      console.log('   ✓ Found "No processed audio" - ready to process');
    }
    
    // Step 5: Click Process Demo button
    console.log('5. Looking for 🎵 Process Demo button...');
    const processClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const processBtn = buttons.find(btn => 
        btn.textContent?.includes('Process Demo') || 
        (btn.textContent?.includes('🎵') && btn.textContent?.includes('Process'))
      );
      if (processBtn && !processBtn.disabled) {
        console.log('Found process button:', processBtn.textContent);
        processBtn.click();
        return true;
      }
      return false;
    });
    
    if (!processClicked) {
      throw new Error('Could not click Process Demo button');
    }
    console.log('   ✓ Clicked Process Demo button');
    
    // Step 6: Wait for processing to complete
    console.log('6. Waiting for processing to complete...');
    
    // Wait for button text to change from "Processing..." back to "Process Demo"
    await page.waitForFunction(
      () => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const processBtn = buttons.find(btn => 
          btn.textContent?.includes('Process') || btn.textContent?.includes('🎵')
        );
        return processBtn && !processBtn.textContent?.includes('Processing...');
      },
      { timeout: 15000 }
    );
    
    // Wait a bit more for audio elements to render
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 7: Verify processed audio is present
    console.log('7. Verifying processed audio...');
    const audioInfo = await page.evaluate(() => {
      const audioElements = Array.from(document.querySelectorAll('audio'));
      const errors = Array.from(document.querySelectorAll('[class*="error"]'))
        .map(el => el.textContent);
      
      return {
        audioCount: audioElements.length,
        audioSources: audioElements.map(audio => ({
          src: audio.src,
          hasSource: !!audio.src
        })),
        errors: errors,
        hasProcessedSection: document.body.textContent?.includes('Processed')
      };
    });
    
    console.log('   Audio elements found:', audioInfo.audioCount);
    console.log('   Has processed section:', audioInfo.hasProcessedSection);
    
    if (audioInfo.errors.length > 0) {
      console.log('   ❌ Errors found:', audioInfo.errors);
    } else {
      console.log('   ✓ No errors found');
    }
    
    if (audioInfo.audioCount >= 2) {
      console.log('   ✓ Both original and processed audio present');
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'audio-demo-processed.png' });
    console.log('   📸 Final screenshot saved: audio-demo-processed.png');
    
    // Step 8: Final verification
    if (audioInfo.audioCount >= 2 && audioInfo.errors.length === 0) {
      console.log('\n✅ Audio Demo test completed successfully!');
    } else {
      console.log('\n⚠️  Test completed with issues');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    // Take error screenshot
    try {
      await page.screenshot({ path: 'audio-demo-error.png' });
      console.log('Error screenshot saved: audio-demo-error.png');
    } catch (e) {}
    
  } finally {
    await browser.close();
  }
})();