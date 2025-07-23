const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

describe('WASM Loading Tests', () => {
  let server;
  let browser;
  let page;
  const PORT = 8081;

  // Simple HTTP server to serve test files
  function createTestServer() {
    return http.createServer((req, res) => {
      if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
<!DOCTYPE html>
<html>
<head>
    <title>WASM Loading Test</title>
</head>
<body>
    <h1>WASM Loading Test</h1>
    <div id="status">Loading...</div>
    <pre id="log"></pre>
    <script>
        const logEl = document.getElementById('log');
        function log(msg) {
            console.log(msg);
            logEl.textContent += msg + '\\n';
        }
        
        async function testWasm() {
            const statusEl = document.getElementById('status');
            
            try {
                log('Testing WASM support...');
                
                if (!window.WebAssembly) {
                    throw new Error('WebAssembly not supported');
                }
                
                // Load RNNoise script
                log('Loading RNNoise script...');
                const script = document.createElement('script');
                script.src = '/rnnoise-fixed.js';
                
                await new Promise((resolve, reject) => {
                    script.onload = () => {
                        log('Script loaded');
                        resolve();
                    };
                    script.onerror = () => reject(new Error('Failed to load script'));
                    document.head.appendChild(script);
                });
                
                // Create WASM module
                if (!window.createRNNWasmModule) {
                    throw new Error('createRNNWasmModule not found');
                }
                
                log('Creating WASM module...');
                const wasmModule = await window.createRNNWasmModule({
                    locateFile: (filename) => filename // Return as-is, no path manipulation
                });
                
                log('WASM module created successfully');
                
                // Test RNNoise
                const state = wasmModule._rnnoise_create(0);
                if (state) {
                    log('RNNoise state created');
                    wasmModule._rnnoise_destroy(state);
                }
                
                statusEl.textContent = 'SUCCESS';
                statusEl.style.color = 'green';
                window.testResult = 'success';
                
            } catch (error) {
                log('Error: ' + error.message);
                statusEl.textContent = 'FAILED: ' + error.message;
                statusEl.style.color = 'red';
                window.testResult = 'failed';
                window.testError = error.message;
            }
        }
        
        window.addEventListener('load', testWasm);
    </script>
</body>
</html>
        `);
      } else if (req.url === '/rnnoise-fixed.js') {
        const filePath = path.join(__dirname, '../../../../public/rnnoise-fixed.js');
        if (fs.existsSync(filePath)) {
          res.writeHead(200, { 'Content-Type': 'application/javascript' });
          fs.createReadStream(filePath).pipe(res);
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      } else if (req.url === '/dist/rnnoise.wasm') {
        const filePath = path.join(__dirname, '../../../../public/dist/rnnoise.wasm');
        if (fs.existsSync(filePath)) {
          res.writeHead(200, { 
            'Content-Type': 'application/wasm',
            'Access-Control-Allow-Origin': '*'
          });
          fs.createReadStream(filePath).pipe(res);
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
  }

  beforeAll(async () => {
    // Start test server
    server = createTestServer();
    await new Promise(resolve => {
      server.listen(PORT, resolve);
    });

    // Launch browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });
  });

  afterAll(async () => {
    if (browser) await browser.close();
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
    page.on('console', msg => {
      console.log(`Browser [${msg.type()}]:`, msg.text());
    });
  });

  afterEach(async () => {
    if (page) await page.close();
  });

  test('WASM module loads successfully', async () => {
    await page.goto(`http://localhost:${PORT}`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for test to complete
    await page.waitForFunction(
      () => window.testResult !== undefined,
      { timeout: 10000 }
    );

    const result = await page.evaluate(() => window.testResult);
    const error = await page.evaluate(() => window.testError);

    expect(result).toBe('success');
    if (error) {
      console.error('Test error:', error);
    }
  });

  test('WASM paths are correctly resolved', async () => {
    const requests = [];
    
    page.on('request', request => {
      requests.push(request.url());
    });

    await page.goto(`http://localhost:${PORT}`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for test completion
    await page.waitForFunction(
      () => window.testResult !== undefined,
      { timeout: 10000 }
    );

    // Check that WASM was requested at the correct path
    const wasmRequests = requests.filter(url => url.includes('.wasm'));
    expect(wasmRequests.length).toBeGreaterThan(0);
    
    // Ensure no double /dist/ paths
    wasmRequests.forEach(url => {
      expect(url).not.toMatch(/\/dist\/\/dist\//);
    });
  });
});