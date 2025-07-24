import { test, expect } from '@playwright/test';

test.describe('CopilotChat Format E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('[data-testid="murmuraba-studio"]', { timeout: 10000 });
  });

  test('should display help with proper markdown formatting', async ({ page }) => {
    // Open copilot chat
    const copilotButton = page.locator('button[aria-label="Copilot Chat"]');
    await expect(copilotButton).toBeVisible();
    await copilotButton.click();
    
    // Chat should be visible
    const chatPanel = page.locator('.copilot-chat');
    await expect(chatPanel).toBeVisible();
    
    // Type /help command
    const input = page.locator('.copilot-input');
    await input.fill('/help');
    await input.press('Enter');
    
    // Wait for response
    await page.waitForSelector('.message.copilot:last-child .message-content', { timeout: 5000 });
    
    // Check formatting - should have proper line breaks and structure
    const helpMessage = page.locator('.message.copilot:last-child .message-content');
    const content = await helpMessage.textContent();
    
    // Should contain formatted list, not raw \n
    expect(content).toContain('Comandos disponibles:');
    expect(content).not.toContain('\\n');
    
    // Should have proper spacing between commands
    const messageElement = await helpMessage.elementHandle();
    const innerHTML = await messageElement?.evaluate(el => el.innerHTML);
    expect(innerHTML).toMatch(/<br>|<p>|<div>/); // Should have HTML formatting
  });

  test('should display VAD documentation with markdown format', async ({ page }) => {
    // Open copilot chat
    await page.click('button[aria-label="Copilot Chat"]');
    
    // Type /vad help
    const input = page.locator('.copilot-input');
    await input.fill('/vad help');
    await input.press('Enter');
    
    // Wait for response
    await page.waitForSelector('.message.copilot:last-child', { timeout: 5000 });
    
    // Check VAD documentation is properly formatted
    const vadMessage = page.locator('.message.copilot:last-child .message-content');
    const content = await vadMessage.textContent();
    
    // Should contain VAD rules information
    expect(content).toMatch(/VAD|Voice Activity Detection/i);
    
    // Should be properly formatted with sections
    const messageElement = await vadMessage.elementHandle();
    const innerHTML = await messageElement?.evaluate(el => el.innerHTML);
    
    // Should have markdown elements rendered
    expect(innerHTML).toMatch(/<strong>|<em>|<code>|<ul>|<h\d>/);
  });

  test('should only suggest VAD-safe commands', async ({ page }) => {
    // Open copilot chat
    await page.click('button[aria-label="Copilot Chat"]');
    
    // Type /help
    await page.locator('.copilot-input').fill('/help');
    await page.locator('.copilot-input').press('Enter');
    
    // Wait for help response
    await page.waitForSelector('.message.copilot:last-child', { timeout: 5000 });
    
    // Get help content
    const helpContent = await page.locator('.message.copilot:last-child .message-content').textContent();
    
    // Should include VAD-safe commands
    expect(helpContent).toContain('/vad threshold');
    expect(helpContent).toContain('/vad display');
    expect(helpContent).toContain('/vad timeline');
    
    // Should NOT include dangerous commands
    expect(helpContent).not.toContain('/buffer');
    expect(helpContent).not.toContain('/algorithm');
    expect(helpContent).not.toContain('/noise');
  });

  test('should display README sections with proper formatting', async ({ page }) => {
    // Open copilot chat
    await page.click('button[aria-label="Copilot Chat"]');
    
    // Ask about VAD
    const input = page.locator('.copilot-input');
    await input.fill('how does vad work?');
    await input.press('Enter');
    
    // Wait for response
    await page.waitForSelector('.message.copilot:last-child', { timeout: 5000 });
    
    // Response should pull from README with formatting
    const response = page.locator('.message.copilot:last-child .message-content');
    const responseElement = await response.elementHandle();
    const innerHTML = await responseElement?.evaluate(el => el.innerHTML);
    
    // Should have markdown formatting, not plain text
    expect(innerHTML).not.toMatch(/<pre>/); // Should not use pre tags
    expect(innerHTML).toMatch(/<p>|<div>|<br>/); // Should have proper HTML structure
  });
});