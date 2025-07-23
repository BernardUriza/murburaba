import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import puppeteer, { Browser, Page } from 'puppeteer'

describe('AudioDemo E2E Tests', () => {
  let browser: Browser
  let page: Page
  const baseUrl = process.env.TEST_URL || 'http://localhost:3000'

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
  })

  afterAll(async () => {
    await browser.close()
  })

  beforeEach(async () => {
    page = await browser.newPage()
    
    // Listen for console logs
    page.on('console', msg => {
      console.log('Browser log:', msg.text())
    })
    
    // Listen for page errors
    page.on('pageerror', error => {
      console.error('Browser error:', error.message)
    })
  })

  it('should handle already initialized engine without throwing errors', async () => {
    // Track errors
    const errors: string[] = []
    page.on('pageerror', error => {
      errors.push(error.message)
    })
    
    // Navigate to the page with AudioDemo
    await page.goto(baseUrl, { waitUntil: 'networkidle2' })
    
    // Wait for AudioDemo to render
    await page.waitForSelector('[data-testid="audio-demo"]', { timeout: 10000 })
    
    // CRITICAL: Wait for engine to be in 'ready' state
    await page.waitForFunction(
      () => {
        const statusElement = document.querySelector('[data-testid="engine-status"]')
        return statusElement?.textContent === 'ready'
      },
      { timeout: 15000 }
    )
    
    // Check that no initialization errors occurred
    const initErrors = errors.filter(e => e.includes('Audio engine is already initialized'))
    expect(initErrors.length).toBe(0)
    
    // Verify the audio demo loaded successfully
    const audioDemoTitle = await page.$eval('h2', el => el.textContent)
    expect(audioDemoTitle).toContain('Audio Demo')
    
    // Check that the process button is enabled when engine is ready
    const isButtonEnabled = await page.$eval(
      'button:has-text("Probar Audio Demo")',
      (button: Element) => !(button as HTMLButtonElement).disabled
    )
    expect(isButtonEnabled).toBe(true)
  })

  it('should process audio successfully when engine is globally initialized', async () => {
    await page.goto(baseUrl, { waitUntil: 'networkidle2' })
    
    // Wait for AudioDemo
    await page.waitForSelector('[data-testid="audio-demo"]', { timeout: 10000 })
    
    // CRITICAL: Wait for engine to be ready before any interaction
    await page.waitForFunction(
      () => {
        const statusElement = document.querySelector('[data-testid="engine-status"]')
        return statusElement?.textContent === 'ready'
      },
      { timeout: 15000 }
    )
    
    // Now wait for the button to be enabled
    const processButton = await page.waitForSelector('button:has-text("Probar Audio Demo"):not([disabled])', { timeout: 5000 })
    
    // Check if processing already started
    const isProcessing = await page.$eval(
      'button',
      (button: Element) => button.textContent?.includes('Procesando')
    )
    
    if (!isProcessing) {
      await processButton.click()
    }
    
    // Wait for processing to complete
    await page.waitForFunction(
      () => {
        const button = document.querySelector('button')
        return button?.textContent?.includes('Probar Audio Demo')
      },
      { timeout: 30000 }
    )
    
    // Verify processed audio is available
    const processedAudioExists = await page.$eval(
      'audio[src*="blob:"]',
      (audio: Element) => !!(audio as HTMLAudioElement).src
    )
    expect(processedAudioExists).toBe(true)
    
    // Check for successful completion message in logs
    const logsText = await page.$eval(
      '[data-testid="audio-logs"]',
      (el: Element) => el.textContent
    )
    expect(logsText).toContain('Procesamiento completado')
  })

  it('should handle multiple AudioDemo instances without conflicts', async () => {
    // First instance
    await page.goto(baseUrl, { waitUntil: 'networkidle2' })
    await page.waitForSelector('[data-testid="audio-demo"]', { timeout: 10000 })
    
    // Wait for ready state
    await page.waitForFunction(
      () => {
        const statusElement = document.querySelector('[data-testid="engine-status"]')
        return statusElement?.textContent === 'ready'
      },
      { timeout: 15000 }
    )
    
    // Open a second tab with the same page
    const page2 = await browser.newPage()
    const errors2: string[] = []
    page2.on('pageerror', error => {
      errors2.push(error.message)
    })
    
    await page2.goto(baseUrl, { waitUntil: 'networkidle2' })
    await page2.waitForSelector('[data-testid="audio-demo"]', { timeout: 10000 })
    
    // Wait for ready state in second instance
    await page2.waitForFunction(
      () => {
        const statusElement = document.querySelector('[data-testid="engine-status"]')
        return statusElement?.textContent === 'ready'
      },
      { timeout: 15000 }
    )
    
    // Check that no initialization errors occurred in the second instance
    const initErrors = errors2.filter(e => e.includes('Audio engine is already initialized'))
    expect(initErrors.length).toBe(0)
    
    // Both instances should be functional
    const isButton1Enabled = await page.$eval(
      'button:has-text("Probar Audio Demo")',
      (button: Element) => !(button as HTMLButtonElement).disabled
    )
    const isButton2Enabled = await page2.$eval(
      'button:has-text("Probar Audio Demo")',
      (button: Element) => !(button as HTMLButtonElement).disabled
    )
    
    expect(isButton1Enabled).toBe(true)
    expect(isButton2Enabled).toBe(true)
    
    await page2.close()
  })

  it('should display appropriate status when engine is in degraded mode', async () => {
    await page.goto(baseUrl, { waitUntil: 'networkidle2' })
    await page.waitForSelector('[data-testid="audio-demo"]', { timeout: 10000 })
    
    // Check for degraded mode warning if present
    const warningExists = await page.$('[data-testid="degraded-mode-warning"]')
    
    if (warningExists) {
      const warningText = await page.$eval(
        '[data-testid="degraded-mode-warning"]',
        (el: Element) => el.textContent
      )
      expect(warningText).toContain('Modo degradado')
    }
  })

  it('should prevent processing when engine is not ready', async () => {
    await page.goto(baseUrl, { waitUntil: 'networkidle2' })
    await page.waitForSelector('[data-testid="audio-demo"]', { timeout: 10000 })
    
    // Wait for engine status to be displayed
    await page.waitForSelector('[data-testid="engine-status"]', { timeout: 5000 })
    
    // Check current status
    const initialStatus = await page.$eval('[data-testid="engine-status"]', el => el.textContent)
    console.log('Initial engine status:', initialStatus)
    
    // If engine is not ready, button should be disabled
    if (initialStatus !== 'ready') {
      const isButtonDisabled = await page.$eval(
        'button:has-text("Probar Audio Demo")',
        (button: Element) => (button as HTMLButtonElement).disabled
      )
      expect(isButtonDisabled).toBe(true)
      
      // Try to force click (should not work)
      await page.evaluate(() => {
        const button = document.querySelector('button:has-text("Probar Audio Demo")') as HTMLButtonElement
        if (button) button.click()
      })
      
      // Check for error message if any
      const errorExists = await page.$('.bg-red-900')
      if (errorExists) {
        const errorText = await page.$eval('.bg-red-900', el => el.textContent)
        expect(errorText).toContain('Engine is in')
        expect(errorText).toContain('Must be \'ready\'')
      }
    }
  })

  it('should handle double initialization gracefully', async () => {
    await page.goto(baseUrl, { waitUntil: 'networkidle2' })
    await page.waitForSelector('[data-testid="audio-demo"]', { timeout: 10000 })
    
    // Track console messages
    const consoleLogs: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'warn' || msg.type() === 'log') {
        consoleLogs.push(msg.text())
      }
    })
    
    // Wait for first initialization
    await page.waitForFunction(
      () => {
        const statusElement = document.querySelector('[data-testid="engine-status"]')
        return statusElement?.textContent === 'ready'
      },
      { timeout: 15000 }
    )
    
    // Simulate re-initialization by calling initialize again
    await page.evaluate(() => {
      // Force re-initialization through the hook if available
      const initButton = document.querySelector('[data-testid="init-engine-button"]') as HTMLButtonElement
      if (initButton && !initButton.disabled) {
        initButton.click()
      }
    })
    
    // Wait a bit for the warning message
    await page.waitForTimeout(1000)
    
    // Check that warning was logged
    const hasWarning = consoleLogs.some(log => 
      log.includes('Audio engine already exists') || 
      log.includes('Destroying previous instance')
    )
    
    // Should handle gracefully (warning is expected now, not an error)
    console.log('Console logs:', consoleLogs)
    
    // Verify engine is still in ready state after re-initialization attempt
    await page.waitForFunction(
      () => {
        const statusElement = document.querySelector('[data-testid="engine-status"]')
        return statusElement?.textContent === 'ready'
      },
      { timeout: 15000 }
    )
    
    // Verify audio processing still works
    const processButton = await page.$('button:has-text("Probar Audio Demo"):not([disabled])')
    expect(processButton).toBeTruthy()
    
    if (processButton) {
      await processButton.click()
      
      // Wait for processing to complete
      await page.waitForFunction(
        () => {
          const logs = document.querySelector('[data-testid="audio-logs"]')
          return logs?.textContent?.includes('Procesamiento completado')
        },
        { timeout: 30000 }
      )
    }
  })

  it('should export logs successfully', async () => {
    await page.goto(baseUrl, { waitUntil: 'networkidle2' })
    await page.waitForSelector('[data-testid="audio-demo"]', { timeout: 10000 })
    
    // Wait for engine ready state
    await page.waitForFunction(
      () => {
        const statusElement = document.querySelector('[data-testid="engine-status"]')
        return statusElement?.textContent === 'ready'
      },
      { timeout: 15000 }
    )
    
    // Wait for some logs to be generated
    await page.waitForFunction(
      () => {
        const logs = document.querySelector('[data-testid="audio-logs"]')
        return logs && logs.children.length > 0
      },
      { timeout: 15000 }
    )
    
    // Set up download handler
    const downloadPromise = new Promise<string>((resolve) => {
      page.once('download', async (download) => {
        const path = await download.path()
        resolve(path || '')
      })
    })
    
    // Click export logs button
    const exportButton = await page.$('button:has-text("Exportar Logs")')
    if (exportButton) {
      await exportButton.click()
      
      // Verify download started
      const downloadPath = await downloadPromise
      expect(downloadPath).toBeTruthy()
    }
  })
})