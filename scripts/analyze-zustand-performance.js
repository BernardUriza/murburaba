#!/usr/bin/env node

/**
 * Zustand Store Performance Analysis Script
 * Analyzes store subscription patterns and potential performance issues
 */

const fs = require('fs');
const path = require('path');

class ZustandAnalyzer {
  constructor() {
    this.issues = [];
    this.recommendations = [];
    this.metrics = {
      totalStoreUsages: 0,
      componentsWithDirectAccess: 0,
      componentsWithSelectors: 0,
      potentialRerenderSources: 0
    };
  }

  analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(process.cwd(), filePath);
    
    // Check for useAppStore usage patterns
    const storeUsagePattern = /useAppStore\s*\(/g;
    const selectorUsagePattern = /useAppStore\s*\(\s*select[A-Z]\w+\s*\)/g;
    const directUsagePattern = /useAppStore\s*\(\s*\)/g;
    
    const storeUsages = content.match(storeUsagePattern) || [];
    const selectorUsages = content.match(selectorUsagePattern) || [];
    const directUsages = content.match(directUsagePattern) || [];
    
    this.metrics.totalStoreUsages += storeUsages.length;
    
    if (directUsages.length > 0) {
      this.metrics.componentsWithDirectAccess++;
      this.issues.push({
        file: relativePath,
        type: 'direct-store-access',
        severity: 'high',
        message: `Component uses direct store access (${directUsages.length} times) which can cause unnecessary re-renders`,
        suggestion: 'Use selective store subscriptions with stable selectors'
      });
    }
    
    if (selectorUsages.length > 0) {
      this.metrics.componentsWithSelectors++;
    }
    
    // Check for unstable selectors (inline functions)
    const inlineSelectorPattern = /useAppStore\s*\(\s*useCallback\s*\(/g;
    const inlineSelectors = content.match(inlineSelectorPattern) || [];
    
    if (inlineSelectors.length > 0) {
      this.metrics.potentialRerenderSources++;
      this.issues.push({
        file: relativePath,
        type: 'unstable-selector',
        severity: 'critical',
        message: 'Component uses unstable selector (useCallback) causing infinite re-renders',
        suggestion: 'Move selectors outside component or use pre-defined stable selectors'
      });
    }
    
    // Check for useMemo dependency arrays with many items
    const complexMemoPattern = /useMemo\s*\([^)]+\),\s*\[[^\]]+,[^\]]+,[^\]]+/g;
    const complexMemos = content.match(complexMemoPattern) || [];
    
    if (complexMemos.length > 0) {
      this.issues.push({
        file: relativePath,
        type: 'complex-memoization',
        severity: 'medium',
        message: 'Component has complex useMemo dependency arrays that may cause frequent re-computation',
        suggestion: 'Consider using shallow equality checks or simplifying dependencies'
      });
    }
  }

  analyzeProject() {
    const srcDir = path.join(process.cwd(), 'src');
    const packageDir = path.join(process.cwd(), 'packages/murmuraba/src');
    
    this.walkDirectory(srcDir);
    if (fs.existsSync(packageDir)) {
      this.walkDirectory(packageDir);
    }
  }

  walkDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        this.walkDirectory(filePath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        this.analyzeFile(filePath);
      }
    }
  }

  generateReport() {
    console.log('\\n🔍 Zustand Store Performance Analysis Report\\n');
    console.log('=' * 60);
    
    // Metrics
    console.log('\\n📊 METRICS:');
    console.log(`Total store usages: ${this.metrics.totalStoreUsages}`);
    console.log(`Components with direct access: ${this.metrics.componentsWithDirectAccess}`);
    console.log(`Components with selectors: ${this.metrics.componentsWithSelectors}`);
    console.log(`Potential re-render sources: ${this.metrics.potentialRerenderSources}`);
    
    // Issues by severity
    const criticalIssues = this.issues.filter(i => i.severity === 'critical');
    const highIssues = this.issues.filter(i => i.severity === 'high');
    const mediumIssues = this.issues.filter(i => i.severity === 'medium');
    
    console.log('\\n🚨 ISSUES BY SEVERITY:');
    console.log(`Critical: ${criticalIssues.length}`);
    console.log(`High: ${highIssues.length}`);
    console.log(`Medium: ${mediumIssues.length}`);
    
    // Detailed issues
    if (this.issues.length > 0) {
      console.log('\\n📝 DETAILED ISSUES:\\n');
      
      this.issues.forEach((issue, index) => {
        const severityEmoji = {
          'critical': '🔴',
          'high': '🟠',
          'medium': '🟡'
        }[issue.severity] || '⚪';
        
        console.log(`${index + 1}. ${severityEmoji} ${issue.type.toUpperCase()}`);
        console.log(`   File: ${issue.file}`);
        console.log(`   Issue: ${issue.message}`);
        console.log(`   Fix: ${issue.suggestion}\\n`);
      });
    }
    
    // Performance recommendations
    console.log('\\n💡 PERFORMANCE RECOMMENDATIONS:\\n');
    
    const recommendations = [
      '1. Use stable selectors defined outside components',
      '2. Avoid inline selectors and useCallback in store subscriptions',
      '3. Split large stores into smaller, focused stores',
      '4. Use shallow equality checks for complex objects',
      '5. Memoize expensive computations with stable dependencies',
      '6. Consider using Zustand middleware for persistence and devtools',
      '7. Implement proper error boundaries for store-related errors'
    ];
    
    recommendations.forEach(rec => console.log(rec));
    
    // Performance score
    const totalComponents = this.metrics.componentsWithDirectAccess + this.metrics.componentsWithSelectors;
    const selectorRatio = totalComponents > 0 ? this.metrics.componentsWithSelectors / totalComponents : 1;
    const criticalScore = Math.max(0, 100 - (criticalIssues.length * 30));
    const performanceScore = Math.floor(selectorRatio * criticalScore);
    
    console.log(`\\n🎯 PERFORMANCE SCORE: ${performanceScore}/100`);
    
    if (performanceScore >= 80) {
      console.log('✅ Excellent store performance!');
    } else if (performanceScore >= 60) {
      console.log('⚠️  Good performance, some optimizations possible');
    } else {
      console.log('🚨 Poor performance, immediate optimization needed');
    }
    
    console.log('\\n' + '=' * 60);
  }
}

// Run analysis
const analyzer = new ZustandAnalyzer();
analyzer.analyzeProject();
analyzer.generateReport();