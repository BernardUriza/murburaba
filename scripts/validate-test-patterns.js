#!/usr/bin/env node

/**
 * Test Pattern Validation Script
 * Ensures test files use centralized utilities instead of duplicate patterns
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Patterns that should be avoided in test files
const DEPRECATED_PATTERNS = [
  {
    pattern: /global\.AudioContext\s*=\s*vi\.fn\(\)/g,
    message: 'Use createFullTestEnvironment() instead of manually mocking AudioContext',
    fix: 'import { createFullTestEnvironment } from "../shared/test-utils"'
  },
  {
    pattern: /global\.MediaRecorder\s*=\s*vi\.fn\(\)/g,
    message: 'Use createFullTestEnvironment() instead of manually mocking MediaRecorder',
    fix: 'Use testEnv.mediaRecorder from createFullTestEnvironment()'
  },
  {
    pattern: /console\.log\s*=\s*vi\.fn\(\)/g,
    message: 'Use ConsoleManager from test-utils instead of manually mocking console',
    fix: 'Use testEnv.console from createFullTestEnvironment()'
  },
  {
    pattern: /beforeEach\(\(\)\s*=>\s*\{[\s\S]*?vi\.clearAllMocks\(\)/g,
    message: 'Use testEnv.cleanup() in afterEach instead of manual mock clearing',
    fix: 'afterEach(() => testEnv.cleanup())'
  },
  {
    pattern: /const\s+mockAudioContext\s*=\s*\{[\s\S]*?createScriptProcessor/g,
    message: 'Use MockFactories.createAudioContextMock() instead of inline mock creation',
    fix: 'const mockAudioContext = MockFactories.createAudioContextMock(options)'
  },
  {
    pattern: /const\s+mockMediaRecorder\s*=\s*\{[\s\S]*?start:\s*vi\.fn/g,
    message: 'Use MockFactories.createMediaRecorderMock() instead of inline mock creation',
    fix: 'const mockMediaRecorder = MockFactories.createMediaRecorderMock(options)'
  }
];

// Required imports for modern test files
const REQUIRED_IMPORTS = [
  'createFullTestEnvironment',
  'TestUtils',
  'MockFactories'
];

class TestPatternValidator {
  constructor() {
    this.violations = [];
    this.processedFiles = 0;
  }

  validateTestFiles() {
    console.log('🧪 Validating test file patterns...');
    
    const testFiles = glob.sync('packages/murmuraba/src/**/*.{test,spec}.{ts,tsx}', {
      ignore: ['**/node_modules/**', '**/dist/**']
    });

    console.log(`Found ${testFiles.length} test files to validate`);

    testFiles.forEach(file => this.validateFile(file));

    return this.violations.length === 0;
  }

  validateFile(filePath) {
    this.processedFiles++;
    
    if (!fs.existsSync(filePath)) {
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const violations = [];

    // Check for deprecated patterns
    DEPRECATED_PATTERNS.forEach(({ pattern, message, fix }) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach((match, index) => {
          const lineNumber = this.getLineNumber(content, content.indexOf(match));
          violations.push({
            type: 'deprecated-pattern',
            file: filePath,
            line: lineNumber,
            pattern: match.substring(0, 60) + (match.length > 60 ? '...' : ''),
            message,
            fix,
            severity: 'error'
          });
        });
      }
    });

    // Check for missing imports
    const hasTestUtilsImport = content.includes('from "../shared/test-utils"') || 
                              content.includes("from '../shared/test-utils'");
    
    const hasDeprecatedPatterns = DEPRECATED_PATTERNS.some(({ pattern }) => pattern.test(content));
    
    if (hasDeprecatedPatterns && !hasTestUtilsImport) {
      violations.push({
        type: 'missing-import',
        file: filePath,
        line: 1,
        message: 'File uses deprecated patterns but missing test-utils import',
        fix: 'Add: import { createFullTestEnvironment, MockFactories } from "../shared/test-utils"',
        severity: 'error'
      });
    }

    // Check for test file structure
    this.validateTestStructure(filePath, content, violations);

    this.violations.push(...violations);
  }

  validateTestStructure(filePath, content, violations) {
    // Check if test file has proper cleanup
    if (content.includes('beforeEach') && !content.includes('afterEach')) {
      violations.push({
        type: 'missing-cleanup',
        file: filePath,
        line: 1,
        message: 'Test file has setup but no cleanup - potential memory leaks',
        fix: 'Add afterEach(() => testEnv.cleanup())',
        severity: 'warning'
      });
    }

    // Check for hardcoded test data that should use factories
    const hardcodedDataPatterns = [
      /\{\s*id:\s*['"]test-stream['"],?\s*getTracks:/g,
      /\{\s*kind:\s*['"]audio['"],?\s*stop:\s*vi\.fn/g
    ];

    hardcodedDataPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        violations.push({
          type: 'hardcoded-data',
          file: filePath,
          line: this.getLineNumber(content, content.search(pattern)),
          message: 'Use MockFactories instead of hardcoded test data',
          fix: 'Use MockFactories.createMediaStreamMock() or similar',
          severity: 'warning'
        });
      }
    });
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  generateReport() {
    if (this.violations.length === 0) {
      console.log(`✅ All ${this.processedFiles} test files follow modern patterns!`);
      return;
    }

    console.log(`❌ Found ${this.violations.length} pattern violations in ${this.processedFiles} files:\n`);

    // Group by file
    const byFile = this.violations.reduce((acc, violation) => {
      if (!acc[violation.file]) acc[violation.file] = [];
      acc[violation.file].push(violation);
      return acc;
    }, {});

    Object.entries(byFile).forEach(([file, fileViolations]) => {
      console.log(`📄 ${file.replace(process.cwd(), '.')}`);
      
      fileViolations.forEach(violation => {
        const icon = violation.severity === 'error' ? '🚨' : '⚠️';
        console.log(`  ${icon} Line ${violation.line}: ${violation.message}`);
        console.log(`     💡 Fix: ${violation.fix}`);
        
        if (violation.pattern) {
          console.log(`     🔍 Pattern: ${violation.pattern}`);
        }
        console.log();
      });
    });

    // Summary by type
    const byType = this.violations.reduce((acc, v) => {
      acc[v.type] = (acc[v.type] || 0) + 1;
      return acc;
    }, {});

    console.log('📊 Summary by violation type:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  • ${type}: ${count}`);
    });

    console.log('\n📚 Quick Migration Guide:');
    console.log('  1. Import: import { createFullTestEnvironment, MockFactories } from "../shared/test-utils"');
    console.log('  2. Setup: const testEnv = createFullTestEnvironment()');
    console.log('  3. Cleanup: afterEach(() => testEnv.cleanup())');
    console.log('  4. Use factories: MockFactories.createAudioContextMock(options)');
  }

  hasErrors() {
    return this.violations.some(v => v.severity === 'error');
  }
}

// CLI interface
if (require.main === module) {
  const validator = new TestPatternValidator();
  
  const success = validator.validateTestFiles();
  validator.generateReport();
  
  if (!success && validator.hasErrors()) {
    console.error('\n🚫 Commit blocked due to test pattern violations.');
    console.error('Please fix the errors above before committing.');
    process.exit(1);
  } else if (!success) {
    console.warn('\n⚠️  Commit allowed with warnings. Consider fixing these issues.');
    process.exit(0);
  } else {
    console.log('\n🎉 All test patterns are modern and consistent!');
    process.exit(0);
  }
}

module.exports = TestPatternValidator;