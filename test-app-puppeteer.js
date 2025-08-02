const puppeteer = require('puppeteer');

async function testApp() {
  console.log('🚀 Starting Puppeteer test...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Capture console logs
    page.on('console', msg => {
      console.log(`📋 Browser Console [${msg.type()}]:`, msg.text());
    });
    
    // Capture errors
    page.on('pageerror', error => {
      console.error('❌ Page Error:', error.message);
    });
    
    // Capture failed requests
    page.on('requestfailed', request => {
      console.error('❌ Request Failed:', request.url(), request.failure().errorText);
    });
    
    console.log('📍 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Wait a bit for React to mount
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if the app rendered
    const rootContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        hasContent: root && root.innerHTML.length > 0,
        innerHTML: root ? root.innerHTML.substring(0, 200) : 'No root element',
        childCount: root ? root.children.length : 0
      };
    });
    
    console.log('\n📊 Root Element Status:');
    console.log('- Has content:', rootContent.hasContent);
    console.log('- Child count:', rootContent.childCount);
    console.log('- Content preview:', rootContent.innerHTML);
    
    // Check for specific elements
    const appTitle = await page.$eval('h1', el => el.textContent).catch(() => 'Not found');
    console.log('\n🏷️ App Title:', appTitle);
    
    // Check for error messages
    const errors = await page.$$eval('.error, [class*="error"]', elements => 
      elements.map(el => el.textContent)
    );
    
    if (errors.length > 0) {
      console.log('\n⚠️ Error messages found:', errors);
    }
    
    // Take a screenshot
    await page.screenshot({ path: 'app-screenshot.png', fullPage: true });
    console.log('\n📸 Screenshot saved as app-screenshot.png');
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
  } finally {
    await browser.close();
    console.log('\n✅ Test completed');
  }
}

testApp().catch(console.error);