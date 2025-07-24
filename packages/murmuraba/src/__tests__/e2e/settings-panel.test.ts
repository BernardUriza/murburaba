import { test, expect } from '@playwright/test';

test.describe('Settings Panel E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('[data-testid="murmuraba-studio"]', { timeout: 10000 });
  });

  test('should open settings panel with correct dimensions', async ({ page }) => {
    // Settings button should exist
    const settingsButton = page.locator('button[aria-label="Settings"]');
    await expect(settingsButton).toBeVisible();
    
    // Click settings button
    await settingsButton.click();
    
    // Settings panel should be visible
    const settingsPanel = page.locator('[data-testid="settings-panel"]');
    await expect(settingsPanel).toBeVisible();
    
    // Check dimensions: 1/8 width, 1/2 height
    const viewportSize = page.viewportSize();
    const panelBox = await settingsPanel.boundingBox();
    
    expect(panelBox).toBeTruthy();
    expect(panelBox!.width).toBeCloseTo(viewportSize!.width / 8, 10);
    expect(panelBox!.height).toBeCloseTo(viewportSize!.height / 2, 10);
    
    // Panel should be on the right side
    expect(panelBox!.x).toBeGreaterThan(viewportSize!.width * 0.8);
  });

  test('should display only VAD-safe settings', async ({ page }) => {
    // Open settings
    await page.click('button[aria-label="Settings"]');
    await page.waitForSelector('[data-testid="settings-panel"]');
    
    // Check for VAD threshold settings
    await expect(page.locator('label:has-text("Silence Threshold")')).toBeVisible();
    await expect(page.locator('label:has-text("Voice Threshold")')).toBeVisible();
    await expect(page.locator('label:has-text("Clear Voice Threshold")')).toBeVisible();
    
    // Check for display settings
    await expect(page.locator('label:has-text("Show VAD values")')).toBeVisible();
    await expect(page.locator('label:has-text("Show VAD timeline")')).toBeVisible();
    
    // Ensure dangerous settings are NOT present
    await expect(page.locator('label:has-text("Sample Rate")')).not.toBeVisible();
    await expect(page.locator('label:has-text("Frame Size")')).not.toBeVisible();
    await expect(page.locator('label:has-text("Buffer Size")')).not.toBeVisible();
    await expect(page.locator('label:has-text("Algorithm")')).not.toBeVisible();
  });

  test('should update VAD thresholds without breaking detection', async ({ page }) => {
    // Initialize engine first
    const initButton = page.locator('button:has-text("Initialize Engine")');
    if (await initButton.isVisible()) {
      await initButton.click();
      await page.waitForSelector('button:has-text("Start Recording")', { timeout: 15000 });
    }
    
    // Open settings
    await page.click('button[aria-label="Settings"]');
    
    // Adjust silence threshold
    const silenceInput = page.locator('input[name="silenceThreshold"]');
    await silenceInput.fill('0.15');
    
    // Apply changes
    await page.click('button:has-text("Apply")');
    
    // Start recording to verify VAD still works
    await page.click('button:has-text("Start Recording")');
    await page.waitForTimeout(2000);
    
    // VAD should still be functioning
    const vadDisplay = page.locator('.vad-display');
    await expect(vadDisplay).toBeVisible();
    
    // Stop recording
    await page.click('button:has-text("Stop")');
  });

  test('should close settings panel when clicking overlay', async ({ page }) => {
    // Open settings
    await page.click('button[aria-label="Settings"]');
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();
    
    // Click overlay
    await page.click('.settings-overlay');
    
    // Settings should be closed
    await expect(page.locator('[data-testid="settings-panel"]')).not.toBeVisible();
  });
});