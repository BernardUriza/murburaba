#!/usr/bin/env node

/**
 * Duplication Threshold Enforcement Script
 * Checks if code duplication exceeds acceptable thresholds before allowing commits
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Duplication thresholds configuration
const THRESHOLDS = {
  // Global thresholds
  maxTotalDuplications: 500,
  maxCriticalIssues: 5,
  
  // Pattern-specific thresholds
  patterns: {
    'vi.fn() mocks': {
      maxOccurrences: 300,
      severity: 'warning'
    },
    'Console.log statements': {
      maxOccurrences: 100,
      severity: 'error'
    },
    'Error throwing patterns': {
      maxOccurrences: 40,
      severity: 'error'
    },
    'useState duplications': {
      maxOccurrences: 15,
      severity: 'warning'
    },
    'useEffect duplications': {
      maxOccurrences: 25,
      severity: 'warning'
    }
  },
  
  // File-specific thresholds
  filePatterns: {
    '**/*.test.ts': {
      allowedPatterns: ['vi.fn() mocks', 'beforeEach patterns'],
      maxDuplicationPerFile: 20
    },
    'packages/murmuraba/src/core/**/*.ts': {
      maxDuplicationPerFile: 5,
      strictMode: true
    },
    'packages/murmuraba/src/utils/**/*.ts': {
      maxDuplicationPerFile: 3,
      strictMode: true
    }
  }
};

class DuplicationThresholdChecker {
  constructor() {
    this.violations = [];
  }

  async checkThresholds() {
    console.log('🔍 Checking duplication thresholds...');
    
    // Run duplication analysis
    let analysisResults;
    try {
      const output = execSync('node scripts/duplication-detector.js', { 
        encoding: 'utf8',
        cwd: process.cwd()
      });
      
      // Parse the results
      analysisResults = this.parseAnalysisResults();
    } catch (error) {
      console.error('❌ Failed to run duplication analysis:', error.message);
      process.exit(1);
    }

    // Check global thresholds
    this.checkGlobalThresholds(analysisResults);
    
    // Check pattern-specific thresholds
    this.checkPatternThresholds(analysisResults);
    
    // Check file-specific thresholds
    await this.checkFileThresholds();
    
    // Report results
    this.reportResults();
    
    return this.violations.length === 0;
  }

  parseAnalysisResults() {
    const reportPath = './reports/duplication/duplication-report.json';
    
    if (!fs.existsSync(reportPath)) {
      throw new Error('Duplication report not found. Run duplication analysis first.');
    }
    
    return JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  }

  checkGlobalThresholds(results) {
    const { summary } = results;
    
    if (summary.totalDuplications > THRESHOLDS.maxTotalDuplications) {
      this.violations.push({
        type: 'global',
        severity: 'error',
        message: `Total duplications (${summary.totalDuplications}) exceed threshold (${THRESHOLDS.maxTotalDuplications})`,
        current: summary.totalDuplications,
        threshold: THRESHOLDS.maxTotalDuplications
      });
    }
    
    if (summary.criticalIssues > THRESHOLDS.maxCriticalIssues) {
      this.violations.push({
        type: 'global',
        severity: 'error',
        message: `Critical issues (${summary.criticalIssues}) exceed threshold (${THRESHOLDS.maxCriticalIssues})`,
        current: summary.criticalIssues,
        threshold: THRESHOLDS.maxCriticalIssues
      });
    }
  }

  checkPatternThresholds(results) {
    const { patterns } = results.tools;
    
    Object.entries(THRESHOLDS.patterns).forEach(([patternName, config]) => {
      const patternResults = patterns[patternName];
      if (!patternResults) return;
      
      const totalOccurrences = patternResults.reduce((sum, result) => sum + result.occurrences, 0);
      
      if (totalOccurrences > config.maxOccurrences) {
        this.violations.push({
          type: 'pattern',
          severity: config.severity,
          pattern: patternName,
          message: `Pattern "${patternName}" occurrences (${totalOccurrences}) exceed threshold (${config.maxOccurrences})`,
          current: totalOccurrences,
          threshold: config.maxOccurrences,
          files: patternResults.map(r => r.file)
        });
      }
    });
  }

  async checkFileThresholds() {
    // This would require more sophisticated analysis
    // For now, we'll implement basic checks
    
    const glob = require('glob');
    
    Object.entries(THRESHOLDS.filePatterns).forEach(([pattern, config]) => {
      const files = glob.sync(pattern);
      
      files.forEach(file => {
        if (config.strictMode) {
          // In strict mode, any duplication is a violation
          // This would require file-level duplication analysis
          // Implementation would go here
        }
      });
    });
  }

  reportResults() {
    if (this.violations.length === 0) {
      console.log('✅ All duplication thresholds passed!');
      return;
    }

    console.log(`❌ Found ${this.violations.length} threshold violations:\n`);
    
    // Group by severity
    const errors = this.violations.filter(v => v.severity === 'error');
    const warnings = this.violations.filter(v => v.severity === 'warning');
    
    if (errors.length > 0) {
      console.log('🚨 ERRORS (will block commit):');
      errors.forEach(violation => {
        console.log(`  • ${violation.message}`);
        if (violation.files) {
          console.log(`    Files: ${violation.files.slice(0, 3).join(', ')}${violation.files.length > 3 ? '...' : ''}`);
        }
      });
      console.log();
    }
    
    if (warnings.length > 0) {
      console.log('⚠️  WARNINGS:');
      warnings.forEach(violation => {
        console.log(`  • ${violation.message}`);
      });
      console.log();
    }

    // Provide actionable suggestions
    console.log('💡 Suggestions:');
    console.log('  1. Use createFullTestEnvironment() in test files instead of duplicating setup');
    console.log('  2. Replace console.log with structured logging (AudioLogger, ProcessingLogger, etc.)');
    console.log('  3. Use ErrorFactory instead of "throw new Error()"');
    console.log('  4. Extract common patterns into shared utilities');
    console.log();
    
    console.log('📚 Documentation: Check ./reports/duplication/ for detailed analysis');
  }

  shouldBlockCommit() {
    return this.violations.some(v => v.severity === 'error');
  }
}

// CLI interface
if (require.main === module) {
  const checker = new DuplicationThresholdChecker();
  
  checker.checkThresholds().then(passed => {
    if (!passed && checker.shouldBlockCommit()) {
      console.error('\n🚫 Commit blocked due to duplication threshold violations.');
      console.error('Please fix the errors above before committing.');
      process.exit(1);
    } else if (!passed) {
      console.warn('\n⚠️  Commit allowed with warnings. Consider fixing these issues.');
      process.exit(0);
    } else {
      console.log('\n🎉 All checks passed! Commit allowed.');
      process.exit(0);
    }
  }).catch(error => {
    console.error('❌ Threshold check failed:', error);
    process.exit(1);
  });
}

module.exports = DuplicationThresholdChecker;