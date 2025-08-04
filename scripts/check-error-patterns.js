#!/usr/bin/env node

/**
 * Error Pattern Validation Script
 * Ensures errors use ErrorFactory instead of raw Error constructors
 */

const fs = require('fs');
const path = require('path');

// Error patterns that should be replaced
const ERROR_PATTERNS = [
  {
    pattern: /throw new Error\(/g,
    replacement: 'Use ErrorFactory methods (e.g., ErrorFactory.audioContextCreationFailed())',
    severity: 'error',
    category: 'raw-error'
  },
  {
    pattern: /new Error\(/g,
    replacement: 'Use ErrorFactory methods for consistent error handling',
    severity: 'warning',
    category: 'raw-error'
  },
  {
    pattern: /Promise\.reject\(new Error\(/g,
    replacement: 'Use ErrorFactory methods in Promise.reject()',
    severity: 'error',
    category: 'promise-error'
  }
];

// Allowed error usage patterns (exceptions)
const ALLOWED_PATTERNS = [
  // Error factory implementation itself
  /class.*Error.*extends Error/,
  /new Error\(.*\).*in.*error-handler\.ts/,
  
  // Test files - error creation for testing
  /\.test\.ts:.*new Error\(/,
  /\.spec\.ts:.*new Error\(/,
  /mockRejectedValue.*new Error/,
  /toThrow.*new Error/,
  
  // Comments or strings
  /\/\/.*new Error/,
  /\/\*[\s\S]*?new Error[\s\S]*?\*\//,
  /'[^']*new Error[^']*'/,
  /"[^"]*new Error[^"]*"/,
  /`[^`]*new Error[^`]*`/,
  
  // Error wrapping in error-handler.ts
  /wrapError.*new Error/,
  /originalError.*new Error/
];

// ErrorFactory method suggestions based on context
const ERROR_SUGGESTIONS = {
  'AudioContext': ['audioContextCreationFailed', 'audioContextSuspended', 'audioContextNotSupported'],
  'WASM': ['wasmModuleLoadFailed', 'wasmModuleNotLoaded', 'wasmProcessingFailed'],
  'MediaRecorder': ['mediaRecorderStartFailed', 'mediaRecorderNotSupported', 'mediaRecorderInvalidState'],
  'validation': ['invalidParameter', 'parameterOutOfRange', 'requiredParameterMissing'],
  'initialization': ['initializationFailed', 'componentAlreadyInitialized'],
  'permission': ['microphonePermissionDenied', 'audioPermissionNotGranted'],
  'feature': ['featureNotSupported', 'browserNotSupported'],
  'processing': ['audioProcessingFailed', 'invalidAudioFormat', 'audioBufferTooSmall']
};

class ErrorPatternChecker {
  constructor() {
    this.violations = [];
  }

  checkFiles(filePaths) {
    console.log('🔍 Checking for error pattern violations...');
    
    if (filePaths.length === 0) {
      console.log('No files to check.');
      return true;
    }

    filePaths.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        this.checkFile(filePath);
      }
    });

    this.generateReport();
    return this.violations.length === 0;
  }

  checkFile(filePath) {
    // Skip error-handler.ts itself
    if (filePath.includes('error-handler.ts')) {
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Check if file imports ErrorFactory
    const hasErrorFactoryImport = content.includes('ErrorFactory') || 
                                 content.includes('from "../utils/error-handler"') ||
                                 content.includes("from '../utils/error-handler'");

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const contextKey = `${filePath}:${lineNumber}`;
      
      // Skip if line matches allowed patterns
      if (ALLOWED_PATTERNS.some(pattern => pattern.test(`${filePath}:${line}`))) {
        return;
      }

      // Check for error patterns
      ERROR_PATTERNS.forEach(({ pattern, replacement, severity, category }) => {
        const matches = line.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const suggestion = this.getSuggestion(line, filePath);
            
            this.violations.push({
              file: filePath,
              line: lineNumber,
              pattern: match,
              content: line.trim(),
              replacement,
              severity,
              category,
              suggestion,
              hasErrorFactoryImport,
              context: this.getErrorContext(line)
            });
          });
        }
      });
    });
  }

  getSuggestion(line, filePath) {
    const lowercaseLine = line.toLowerCase();
    
    // Try to determine the best ErrorFactory method based on context
    for (const [contextKey, methods] of Object.entries(ERROR_SUGGESTIONS)) {
      if (lowercaseLine.includes(contextKey.toLowerCase())) {
        return {
          category: contextKey,
          methods: methods,
          example: `ErrorFactory.${methods[0]}(error, { context })`
        };
      }
    }

    // Generic suggestion
    return {
      category: 'generic',
      methods: ['wrapError'],
      example: 'ErrorFactory.wrapError(new Error(message), ErrorType.PROCESSING, additionalMessage)'
    };
  }

  getErrorContext(line) {
    // Extract context clues from the error message
    const contextClues = [];
    
    if (line.includes('AudioContext')) contextClues.push('audio-context');
    if (line.includes('WASM') || line.includes('WebAssembly')) contextClues.push('wasm');
    if (line.includes('MediaRecorder')) contextClues.push('media-recorder');
    if (line.includes('initialize') || line.includes('init')) contextClues.push('initialization');
    if (line.includes('permission') || line.includes('denied')) contextClues.push('permission');
    if (line.includes('not supported')) contextClues.push('feature-support');
    if (line.includes('invalid') || line.includes('validation')) contextClues.push('validation');
    
    return contextClues;
  }

  generateReport() {
    if (this.violations.length === 0) {
      console.log('✅ All error handling uses ErrorFactory patterns!');
      return;
    }

    console.log(`❌ Found ${this.violations.length} error pattern violations:\n`);

    // Group by file
    const byFile = this.violations.reduce((acc, violation) => {
      if (!acc[violation.file]) acc[violation.file] = [];
      acc[violation.file].push(violation);
      return acc;
    }, {});

    Object.entries(byFile).forEach(([file, fileViolations]) => {
      console.log(`📄 ${file.replace(process.cwd(), '.')}`);
      
      if (!fileViolations[0].hasErrorFactoryImport) {
        console.log('  ⚠️  Missing ErrorFactory import!');
        console.log('     Add: import { ErrorFactory, ErrorType } from "../utils/error-handler";');
        console.log();
      }
      
      fileViolations.forEach(violation => {
        const icon = violation.severity === 'error' ? '🚨' : '⚠️';
        console.log(`  ${icon} Line ${violation.line}: ${violation.pattern}`);
        console.log(`     Code: ${violation.content}`);
        console.log(`     💡 ${violation.replacement}`);
        
        if (violation.suggestion) {
          console.log(`     🎯 Suggested: ${violation.suggestion.example}`);
          if (violation.suggestion.methods.length > 1) {
            console.log(`     🔧 Other options: ${violation.suggestion.methods.slice(1).join(', ')}`);
          }
        }
        
        if (violation.context.length > 0) {
          console.log(`     📝 Context: ${violation.context.join(', ')}`);
        }
        console.log();
      });
    });

    // Migration examples
    console.log('📚 Migration Examples:');
    console.log('  Before: throw new Error("AudioContext failed")');
    console.log('  After:  throw ErrorFactory.audioContextCreationFailed(error, { context })');
    console.log();
    console.log('  Before: throw new Error("Invalid parameter")');
    console.log('  After:  throw ErrorFactory.invalidParameter("paramName", "expected", received)');
    console.log();
    console.log('  Before: throw new Error("WASM load failed")');
    console.log('  After:  throw ErrorFactory.wasmModuleLoadFailed(error, { url, status })');
    console.log();

    // Summary by category
    const byCategory = this.violations.reduce((acc, v) => {
      acc[v.category] = (acc[v.category] || 0) + 1;
      return acc;
    }, {});

    console.log('📊 Violations by category:');
    Object.entries(byCategory).forEach(([category, count]) => {
      console.log(`  • ${category}: ${count}`);
    });

    console.log('\n🔧 Available ErrorFactory methods:');
    Object.entries(ERROR_SUGGESTIONS).forEach(([category, methods]) => {
      console.log(`  ${category}: ${methods.join(', ')}`);
    });
  }

  hasErrors() {
    return this.violations.some(v => v.severity === 'error');
  }
}

// CLI interface
if (require.main === module) {
  const filePaths = process.argv.slice(2);
  
  if (filePaths.length === 0) {
    console.log('Usage: node check-error-patterns.js <file1> <file2> ...');
    process.exit(0);
  }

  const checker = new ErrorPatternChecker();
  const success = checker.checkFiles(filePaths);
  
  if (!success && checker.hasErrors()) {
    console.error('\n🚫 Commit blocked due to error pattern violations.');
    console.error('Please use ErrorFactory methods before committing.');
    process.exit(1);
  } else if (!success) {
    console.warn('\n⚠️  Commit allowed with warnings. Consider migrating to ErrorFactory.');
    process.exit(0);
  } else {
    console.log('\n🎉 All error handling follows consistent patterns!');
    process.exit(0);
  }
}

module.exports = ErrorPatternChecker;