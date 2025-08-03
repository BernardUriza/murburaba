#!/usr/bin/env node

/**
 * GANDALF FURIOSO UX ANALYSIS
 * "YOU SHALL NOT PASS!" - To bad UX patterns and accessibility violations
 */

/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unused-vars */

const fs = require('fs');
const glob = require('glob').sync;

class GandalfUXAnalyzer {
  constructor() {
    this.issues = {
      critical: [],
      warnings: [],
      suggestions: []
    };
    this.filePatterns = {
      components: '**/*.{tsx,jsx}',
      styles: '**/*.{css,scss}',
      tests: '**/*.test.{tsx,jsx,ts,js}'
    };
  }

  // The Balrog Detection System - Critical Issues
  detectBalrogs(content, filePath) {
    const balrogs = [];

    // Missing aria-label on interactive elements
    if (content.match(/<button[^>]*>(?!.*aria-label)/gi)) {
      balrogs.push({
        file: filePath,
        issue: 'Button without aria-label detected',
        line: this.findLineNumber(content, /<button[^>]*>(?!.*aria-label)/i),
        severity: 'CRITICAL',
        fix: 'Add descriptive aria-label to all buttons'
      });
    }

    // Images without alt text
    if (content.match(/<img[^>]*>(?!.*alt=)/gi)) {
      balrogs.push({
        file: filePath,
        issue: 'Image without alt attribute',
        line: this.findLineNumber(content, /<img[^>]*>(?!.*alt=)/i),
        severity: 'CRITICAL',
        fix: 'Add meaningful alt text or alt="" for decorative images'
      });
    }

    // Form inputs without labels
    if (content.match(/<input[^>]*>(?!.*aria-label)(?!.*id=)/gi)) {
      balrogs.push({
        file: filePath,
        issue: 'Input without label association',
        line: this.findLineNumber(content, /<input[^>]*>(?!.*aria-label)(?!.*id=)/i),
        severity: 'CRITICAL',
        fix: 'Associate input with label using htmlFor or add aria-label'
      });
    }

    // Divs with onClick but no keyboard support
    if (content.match(/<div[^>]*onClick[^>]*>(?!.*onKeyDown)/gi)) {
      balrogs.push({
        file: filePath,
        issue: 'Interactive div without keyboard support',
        line: this.findLineNumber(content, /<div[^>]*onClick[^>]*>(?!.*onKeyDown)/i),
        severity: 'CRITICAL',
        fix: 'Add onKeyDown handler or use button element'
      });
    }

    // Color-only information
    if (content.match(/color:\s*#[0-9a-f]{3,6}[^}]*}[^{]*(?!content|:before|:after)/gi)) {
      const colorOnlyMatches = content.match(/\.recording-dot|\.status-indicator|\.error-indicator/gi);
      if (colorOnlyMatches) {
        balrogs.push({
          file: filePath,
          issue: 'Relying on color alone to convey information',
          severity: 'CRITICAL',
          fix: 'Add text labels, icons, or patterns in addition to color'
        });
      }
    }

    return balrogs;
  }

  // The Orc Detection System - Warnings
  detectOrcs(content, filePath) {
    const orcs = [];

    // Small touch targets
    if (content.match(/height:\s*[0-3]?[0-9]px/gi) && content.match(/width:\s*[0-3]?[0-9]px/gi)) {
      orcs.push({
        file: filePath,
        issue: 'Touch target possibly too small (< 44x44px)',
        severity: 'WARNING',
        fix: 'Ensure minimum 44x44px touch targets for mobile'
      });
    }

    // Missing loading states
    if (content.includes('isLoading') && !content.includes('aria-busy')) {
      orcs.push({
        file: filePath,
        issue: 'Loading state without aria-busy',
        severity: 'WARNING',
        fix: 'Add aria-busy="true" during loading states'
      });
    }

    // Hardcoded colors instead of CSS variables
    if (content.match(/#[0-9a-f]{3,6}(?![\w-])/gi) && !filePath.includes('design-system')) {
      orcs.push({
        file: filePath,
        issue: 'Hardcoded colors detected',
        severity: 'WARNING',
        fix: 'Use CSS variables from design system'
      });
    }

    // Missing error boundaries
    if (filePath.includes('App') && !content.includes('ErrorBoundary')) {
      orcs.push({
        file: filePath,
        issue: 'Component without error boundary',
        severity: 'WARNING',
        fix: 'Wrap complex components in ErrorBoundary'
      });
    }

    return orcs;
  }

  // The Goblin Detection System - Suggestions
  detectGoblins(content, filePath) {
    const goblins = [];

    // Performance issues
    if (content.match(/useEffect\s*\(\s*\(\s*\)\s*=>\s*{[^}]*},\s*\[\s*\]\s*\)/)) {
      goblins.push({
        file: filePath,
        issue: 'useEffect with empty dependency array',
        severity: 'SUGGESTION',
        fix: 'Consider if this effect really needs to run only once'
      });
    }

    // Missing memoization
    if (content.includes('.map(') && !content.includes('useMemo') && !content.includes('memo(')) {
      goblins.push({
        file: filePath,
        issue: 'Unmemoized list rendering',
        severity: 'SUGGESTION',
        fix: 'Consider memoizing list items for performance'
      });
    }

    // Inline styles
    if (content.match(/style\s*=\s*{{/gi)) {
      goblins.push({
        file: filePath,
        issue: 'Inline styles detected',
        severity: 'SUGGESTION',
        fix: 'Move to CSS classes for better performance'
      });
    }

    return goblins;
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
      
      // Detect critical issues (Balrogs)
      const balrogs = this.detectBalrogs(content, filePath);
      this.issues.critical.push(...balrogs);

      // Detect warnings (Orcs)
      const orcs = this.detectOrcs(content, filePath);
      this.issues.warnings.push(...orcs);

      // Detect suggestions (Goblins)
      const goblins = this.detectGoblins(content, filePath);
      this.issues.suggestions.push(...goblins);

    } catch (error) {
      console.error(`Failed to analyze ${filePath}:`, error.message);
    }
  }

  async runAnalysis() {
    console.log('\n🧙‍♂️ GANDALF FURIOSO UX ANALYSIS INITIATED');
    console.log('="="="="="="="="="="="="="="="="="="="="=\n');

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
        console.log('');
      });
    }

    console.log('\n⚠️  ORCS DETECTED (WARNINGS)');
    console.log('════════════════════════════\n');
    
    if (this.issues.warnings.length === 0) {
      console.log('✅ No warnings found. The path is safe!\n');
    } else {
      this.issues.warnings.forEach((issue, index) => {
        console.log(`👹 ORC #${index + 1}: ${issue.issue}`);
        console.log(`   File: ${issue.file}`);
        console.log(`   Fix: ${issue.fix}`);
        console.log('');
      });
    }

    console.log('\n💡 GOBLINS DETECTED (SUGGESTIONS)');
    console.log('═════════════════════════════════\n');
    
    if (this.issues.suggestions.length === 0) {
      console.log('✅ No suggestions. Your code is pristine!\n');
    } else {
      this.issues.suggestions.forEach((issue, index) => {
        console.log(`👺 GOBLIN #${index + 1}: ${issue.issue}`);
        console.log(`   File: ${issue.file}`);
        console.log(`   Fix: ${issue.fix}`);
        console.log('');
      });
    }

    // Summary
    console.log('\n📊 ANALYSIS SUMMARY');
    console.log('═══════════════════');
    console.log(`🔥 Critical Issues: ${this.issues.critical.length}`);
    console.log(`⚠️  Warnings: ${this.issues.warnings.length}`);
    console.log(`💡 Suggestions: ${this.issues.suggestions.length}`);
    
    const totalIssues = this.issues.critical.length + this.issues.warnings.length + this.issues.suggestions.length;
    
    if (totalIssues === 0) {
      console.log('\n🎉 EXCELLENT! Your UX is worthy of the Undying Lands!');
    } else if (this.issues.critical.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES MUST BE RESOLVED! The Balrog blocks your path!');
    } else if (this.issues.warnings.length > 0) {
      console.log('\n⚠️  Address the warnings to improve your UX significantly.');
    } else {
      console.log('\n👍 Good work! Just some minor improvements suggested.');
    }

    // Specific recommendations
    console.log('\n🔮 GANDALF\'S WISDOM');
    console.log('═══════════════════');
    console.log('1. ACCESSIBILITY: Ensure ALL interactive elements are keyboard accessible');
    console.log('2. MOBILE FIRST: Design for thumbs - 44x44px minimum touch targets');
    console.log('3. ERROR HANDLING: Every error should guide users to recovery');
    console.log('4. PERFORMANCE: Lazy load, memoize, and optimize for 60fps');
    console.log('5. CONSISTENCY: Use the design system tokens everywhere');
    
    console.log('\n"A wizard\'s UX is never late, nor is it early. It arrives precisely when the user needs it!"');
    console.log('\n🧙‍♂️ Analysis complete. May your UX be ever accessible!\n');
  }
}

// Execute the analysis
const gandalf = new GandalfUXAnalyzer();
gandalf.runAnalysis().catch(console.error);