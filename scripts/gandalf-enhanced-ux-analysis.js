#!/usr/bin/env node

/**
 * GANDALF FURIOSO ENHANCED UX ANALYSIS
 * "YOU SHALL NOT PASS!" - To bad UX patterns, accessibility violations, and orphaned CSS
 * Now with screenshot capabilities and CSS module analysis!
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob').sync;
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class GandalfEnhancedUXAnalyzer {
  constructor() {
    this.issues = {
      critical: [],
      warnings: [],
      suggestions: [],
      cssOrphans: [],
      screenshots: []
    };
    this.filePatterns = {
      components: '**/*.{tsx,jsx}',
      styles: '**/*.{css,scss,module.css}',
      tests: '**/*.test.{tsx,jsx,ts,js}'
    };
    this.cssClassUsage = new Map();
    this.cssClassDeclarations = new Map();
  }

  // The Eye of Sauron - Screenshot Analysis
  async captureScreenshots() {
    console.log('\n📸 ACTIVATING THE EYE OF SAURON - CAPTURING SCREENSHOTS...\n');
    
    // Check if the app is running
    try {
      const response = await fetch('http://localhost:3001');
      if (!response.ok) {
        console.log('⚠️  App not running on localhost:3001. Skipping screenshots.');
        return;
      }
    } catch (error) {
      console.log('⚠️  App not running on localhost:3001. Skipping screenshots.');
      return;
    }

    // List of routes/components to screenshot
    const routes = [
      { path: '/', name: 'home' },
      { path: '/recording', name: 'recording' },
      { path: '/settings', name: 'settings' },
      { path: '/history', name: 'history' }
    ];

    const screenshotDir = path.join(process.cwd(), 'gandalf-screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir);
    }

    for (const route of routes) {
      try {
        // Using Playwright for screenshots
        const script = `
          const { chromium } = require('playwright');
          (async () => {
            const browser = await chromium.launch();
            const context = await browser.newContext({
              viewport: { width: 1280, height: 720 },
              deviceScaleFactor: 2
            });
            const page = await context.newPage();
            
            // Desktop screenshot
            await page.goto('http://localhost:3001${route.path}');
            await page.waitForLoadState('networkidle');
            await page.screenshot({ 
              path: '${screenshotDir}/${route.name}-desktop.png',
              fullPage: true 
            });
            
            // Mobile screenshot
            await page.setViewportSize({ width: 375, height: 667 });
            await page.screenshot({ 
              path: '${screenshotDir}/${route.name}-mobile.png',
              fullPage: true 
            });
            
            // Tablet screenshot
            await page.setViewportSize({ width: 768, height: 1024 });
            await page.screenshot({ 
              path: '${screenshotDir}/${route.name}-tablet.png',
              fullPage: true 
            });
            
            await browser.close();
          })();
        `;

        await execAsync(`node -e "${script.replace(/\n/g, ' ')}"`);
        
        this.issues.screenshots.push({
          route: route.path,
          files: [
            `${route.name}-desktop.png`,
            `${route.name}-mobile.png`,
            `${route.name}-tablet.png`
          ]
        });
        
        console.log(`✅ Captured screenshots for ${route.path}`);
      } catch (error) {
        console.log(`❌ Failed to capture ${route.path}: ${error.message}`);
      }
    }
  }

  // The Nazgûl Detection System - CSS Module Analysis
  detectCSSOrphans() {
    console.log('\n🦅 NAZGÛL SEARCHING FOR CSS ORPHANS...\n');

    // Find all CSS modules
    const cssModules = glob('**/*.module.css', { 
      ignore: ['node_modules/**', 'dist/**', 'build/**'] 
    });

    // Find all component files
    const componentFiles = glob('**/*.{tsx,jsx,ts,js}', { 
      ignore: ['node_modules/**', 'dist/**', 'build/**', '**/*.test.*', '**/*.spec.*'] 
    });

    // Analyze CSS modules
    cssModules.forEach(cssFile => {
      const content = fs.readFileSync(cssFile, 'utf-8');
      const classes = this.extractCSSClasses(content);
      
      classes.forEach(className => {
        if (!this.cssClassDeclarations.has(cssFile)) {
          this.cssClassDeclarations.set(cssFile, new Set());
        }
        this.cssClassDeclarations.get(cssFile).add(className);
      });
    });

    // Analyze component usage
    componentFiles.forEach(componentFile => {
      const content = fs.readFileSync(componentFile, 'utf-8');
      
      // Check for CSS module imports
      const cssImportMatch = content.match(/import\s+(\w+)\s+from\s+['"](.+\.module\.css)['"]/g);
      if (cssImportMatch) {
        cssImportMatch.forEach(importStatement => {
          const match = importStatement.match(/import\s+(\w+)\s+from\s+['"](.+\.module\.css)['"]/);
          if (match) {
            const [, importName, cssPath] = match;
            
            // Find usages like styles.className or styles['className']
            const usagePattern = new RegExp(`${importName}\\.(\\w+)|${importName}\\['([^']+)'\\]|${importName}\\["([^"]+)"\\]`, 'g');
            let usageMatch;
            
            while ((usageMatch = usagePattern.exec(content)) !== null) {
              const className = usageMatch[1] || usageMatch[2] || usageMatch[3];
              if (!this.cssClassUsage.has(cssPath)) {
                this.cssClassUsage.set(cssPath, new Set());
              }
              this.cssClassUsage.get(cssPath).add(className);
            }
          }
        });
      }
    });

    // Find orphaned classes
    this.cssClassDeclarations.forEach((classes, cssFile) => {
      const usedClasses = this.cssClassUsage.get(cssFile) || new Set();
      const orphanedClasses = [...classes].filter(cls => !usedClasses.has(cls));
      
      if (orphanedClasses.length > 0) {
        this.issues.cssOrphans.push({
          file: cssFile,
          orphanedClasses,
          totalClasses: classes.size,
          usedClasses: usedClasses.size,
          percentageUsed: Math.round((usedClasses.size / classes.size) * 100)
        });
      }
    });

    // Find CSS modules with no imports
    cssModules.forEach(cssFile => {
      const isImported = componentFiles.some(componentFile => {
        const content = fs.readFileSync(componentFile, 'utf-8');
        return content.includes(cssFile) || content.includes(path.basename(cssFile));
      });

      if (!isImported) {
        this.issues.cssOrphans.push({
          file: cssFile,
          issue: 'CSS module file not imported anywhere',
          severity: 'CRITICAL'
        });
      }
    });
  }

  extractCSSClasses(cssContent) {
    const classes = new Set();
    
    // Match class selectors (e.g., .className)
    const classMatches = cssContent.match(/\.([a-zA-Z_][\w-]*)/g) || [];
    classMatches.forEach(match => {
      classes.add(match.substring(1)); // Remove the dot
    });

    return [...classes];
  }

  // Enhanced Balrog Detection with Visual Analysis
  async detectBalrogsWithVisualContext(content, filePath) {
    const balrogs = [];

    // Original accessibility checks
    if (content.match(/<button[^>]*>(?!.*aria-label)/gi)) {
      balrogs.push({
        file: filePath,
        issue: 'Button without aria-label detected',
        line: this.findLineNumber(content, /<button[^>]*>(?!.*aria-label)/i),
        severity: 'CRITICAL',
        fix: 'Add descriptive aria-label to all buttons',
        visualImpact: 'Screen readers cannot announce button purpose'
      });
    }

    // Check for missing focus styles
    if (filePath.endsWith('.css') || filePath.endsWith('.scss')) {
      if (!content.includes(':focus') && !content.includes(':focus-visible')) {
        balrogs.push({
          file: filePath,
          issue: 'No focus styles defined',
          severity: 'CRITICAL',
          fix: 'Add :focus or :focus-visible styles for keyboard navigation',
          visualImpact: 'Keyboard users cannot see which element has focus'
        });
      }
    }

    // Check for low contrast (simplified check)
    const colorPairs = this.extractColorPairs(content);
    colorPairs.forEach(pair => {
      if (this.calculateContrast(pair.fg, pair.bg) < 4.5) {
        balrogs.push({
          file: filePath,
          issue: `Low color contrast: ${pair.fg} on ${pair.bg}`,
          severity: 'CRITICAL',
          fix: 'Ensure minimum 4.5:1 contrast ratio for normal text',
          visualImpact: 'Text may be unreadable for users with visual impairments'
        });
      }
    });

    return balrogs;
  }

  extractColorPairs(content) {
    // Simplified color extraction - in production, use a proper CSS parser
    const pairs = [];
    const colorRegex = /color:\s*(#[0-9a-f]{3,6}|rgb\([^)]+\))/gi;
    const bgRegex = /background(-color)?:\s*(#[0-9a-f]{3,6}|rgb\([^)]+\))/gi;
    
    // This is a simplified version - real implementation would need context
    return pairs;
  }

  calculateContrast(fg, bg) {
    // Simplified contrast calculation
    // In production, use proper WCAG contrast calculation
    return 5; // Placeholder
  }

  findLineNumber(content, regex) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (regex.test(lines[i])) {
        return i + 1;
      }
    }
    return 0;
  }

  async analyzeFile(filePath) {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      
      // Enhanced Balrog detection with visual context
      const balrogs = await this.detectBalrogsWithVisualContext(content, filePath);
      this.issues.critical.push(...balrogs);

    } catch (error) {
      console.error(`Failed to analyze ${filePath}:`, error.message);
    }
  }

  async runAnalysis() {
    console.log('\n🧙‍♂️ GANDALF FURIOSO ENHANCED UX ANALYSIS INITIATED');
    console.log('="="="="="="="="="="="="="="="="="="="="="="="="=\n');

    // Capture screenshots first
    await this.captureScreenshots();

    // Detect CSS orphans
    this.detectCSSOrphans();

    // Find all relevant files
    const componentFiles = glob('src/**/*.{tsx,jsx}', { ignore: 'node_modules/**' });
    const styleFiles = glob('src/**/*.{css,scss}', { ignore: 'node_modules/**' });

    // Analyze all files
    for (const file of [...componentFiles, ...styleFiles]) {
      await this.analyzeFile(file);
    }

    // Generate report
    this.generateReport();
  }

  generateReport() {
    console.log('\n⚔️  BALROGS DETECTED (CRITICAL ISSUES - YOU SHALL NOT PASS!)');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    if (this.issues.critical.length === 0) {
      console.log('✅ No critical issues found. The bridge is clear!\n');
    } else {
      this.issues.critical.forEach((issue, index) => {
        console.log(`🔥 BALROG #${index + 1}: ${issue.issue}`);
        console.log(`   File: ${issue.file}${issue.line ? ` (Line ${issue.line})` : ''}`);
        console.log(`   Fix: ${issue.fix}`);
        if (issue.visualImpact) {
          console.log(`   Visual Impact: ${issue.visualImpact}`);
        }
        console.log('');
      });
    }

    console.log('\n🦅 CSS NAZGÛL REPORT (ORPHANED STYLES)');
    console.log('════════════════════════════════════════\n');
    
    if (this.issues.cssOrphans.length === 0) {
      console.log('✅ No CSS orphans found. All styles are in use!\n');
    } else {
      this.issues.cssOrphans.forEach((orphan, index) => {
        if (orphan.issue) {
          console.log(`💀 CRITICAL: ${orphan.issue}`);
          console.log(`   File: ${orphan.file}`);
        } else {
          console.log(`👻 CSS MODULE #${index + 1}: ${orphan.file}`);
          console.log(`   Orphaned Classes: ${orphan.orphanedClasses.join(', ')}`);
          console.log(`   Usage: ${orphan.usedClasses}/${orphan.totalClasses} classes (${orphan.percentageUsed}%)`);
        }
        console.log('');
      });
    }

    console.log('\n📸 SCREENSHOTS CAPTURED');
    console.log('════════════════════════\n');
    
    if (this.issues.screenshots.length === 0) {
      console.log('⚠️  No screenshots captured. Is the app running?\n');
    } else {
      console.log('Screenshots saved to: gandalf-screenshots/');
      this.issues.screenshots.forEach(screenshot => {
        console.log(`  📍 ${screenshot.route}: ${screenshot.files.join(', ')}`);
      });
    }

    // Summary
    console.log('\n📊 ENHANCED ANALYSIS SUMMARY');
    console.log('═══════════════════════════');
    console.log(`🔥 Critical Issues: ${this.issues.critical.length}`);
    console.log(`👻 CSS Orphans: ${this.issues.cssOrphans.length}`);
    console.log(`📸 Screenshots: ${this.issues.screenshots.length * 3} (${this.issues.screenshots.length} routes × 3 viewports)`);
    
    console.log('\n🔮 GANDALF\'S ENHANCED WISDOM');
    console.log('═══════════════════════════════');
    console.log('1. VISUAL TESTING: Review screenshots for visual regressions');
    console.log('2. CSS HYGIENE: Remove orphaned CSS classes to reduce bundle size');
    console.log('3. RESPONSIVE DESIGN: Check all viewports (mobile, tablet, desktop)');
    console.log('4. FOCUS MANAGEMENT: Ensure visible focus indicators everywhere');
    console.log('5. COLOR CONTRAST: Maintain WCAG AA compliance (4.5:1 minimum)');
    
    console.log('\n"Even the smallest CSS class can change the course of the future!"');
    console.log('\n🧙‍♂️ Enhanced analysis complete. May your styles be ever purposeful!\n');
  }
}

// Execute the enhanced analysis
const gandalf = new GandalfEnhancedUXAnalyzer();
gandalf.runAnalysis().catch(console.error);