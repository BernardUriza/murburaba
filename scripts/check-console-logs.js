#!/usr/bin/env node

/**
 * Console.log Detection Script
 * Prevents console.log statements in production code and suggests structured logging
 */

const fs = require('fs');
const path = require('path');

// Console patterns that should be replaced
const CONSOLE_PATTERNS = [
  {
    pattern: /console\.log\(/g,
    replacement: 'Use appropriate logger (AudioLogger, ProcessingLogger, UILogger, etc.)',
    severity: 'error'
  },
  {
    pattern: /console\.info\(/g,
    replacement: 'Use logger.info() with category',
    severity: 'warning'
  },
  {
    pattern: /console\.warn\(/g,
    replacement: 'Use logger.warn() with category',
    severity: 'warning'
  },
  {
    pattern: /console\.error\(/g,
    replacement: 'Use logger.error() with category and context',
    severity: 'error'
  },
  {
    pattern: /console\.debug\(/g,
    replacement: 'Use logger.debug() with category',
    severity: 'warning'
  }
];

// Allowed console usage patterns (exceptions)
const ALLOWED_PATTERNS = [
  // Console mocking in tests
  /console\.log\s*=\s*vi\.fn\(\)/,
  /console\..*\s*=\s*mockConsole/,
  
  // Console reference in logger implementation
  /default:\s*return\s*console\.log/,
  
  // Comments or strings containing "console.log"
  /\/\/.*console\.log/,
  /\/\*[\s\S]*?console\.log[\s\S]*?\*\//,
  /'[^']*console\.log[^']*'/,
  /"[^"]*console\.log[^"]*"/,
  /`[^`]*console\.log[^`]*`/
];

// Logger category mapping based on file paths
const LOGGER_MAPPING = {
  '/core/': ['AudioLogger', 'ProcessingLogger'],
  '/engines/': ['AudioLogger', 'WASMLogger'],
  '/workers/': ['WASMLogger', 'ProcessingLogger'],
  '/hooks/': ['UILogger', 'RecordingLogger'],
  '/utils/': ['ProcessingLogger', 'AudioLogger'],
  '/managers/': ['ProcessingLogger', 'RecordingLogger'],
  '/services/': ['ProcessingLogger', 'UILogger']
};

class ConsoleLogChecker {
  constructor() {
    this.violations = [];
  }

  checkFiles(filePaths) {
    console.log('🔍 Checking for console.log statements in production code...');
    
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
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      // Skip if line matches allowed patterns
      if (ALLOWED_PATTERNS.some(pattern => pattern.test(line))) {
        return;
      }

      // Check for console patterns
      CONSOLE_PATTERNS.forEach(({ pattern, replacement, severity }) => {
        const matches = line.match(pattern);
        if (matches) {
          matches.forEach(match => {
            this.violations.push({
              file: filePath,
              line: lineNumber,
              pattern: match,
              content: line.trim(),
              replacement,
              severity,
              suggestedLoggers: this.getSuggestedLoggers(filePath)
            });
          });
        }
      });
    });
  }

  getSuggestedLoggers(filePath) {
    for (const [pathPattern, loggers] of Object.entries(LOGGER_MAPPING)) {
      if (filePath.includes(pathPattern)) {
        return loggers;
      }
    }
    return ['ProcessingLogger']; // Default fallback
  }

  generateReport() {
    if (this.violations.length === 0) {
      console.log('✅ No console.log statements found in production code!');
      return;
    }

    console.log(`❌ Found ${this.violations.length} console statements in production code:\n`);

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
        console.log(`  ${icon} Line ${violation.line}: ${violation.pattern}`);
        console.log(`     Code: ${violation.content}`);
        console.log(`     💡 ${violation.replacement}`);
        
        if (violation.suggestedLoggers.length > 0) {
          console.log(`     🎯 Suggested: ${violation.suggestedLoggers.join(', ')}`);
        }
        console.log();
      });
    });

    // Provide migration examples
    console.log('📚 Migration Examples:');
    console.log('  Before: console.log("Processing audio...", data)');
    console.log('  After:  AudioLogger.info("Processing audio", data)');
    console.log();
    console.log('  Before: console.error("Failed:", error)');
    console.log('  After:  ProcessingLogger.error("Processing failed", error)');
    console.log();
    console.log('  Before: console.debug("Metrics:", metrics)');
    console.log('  After:  RecordingLogger.debug("Metrics updated", metrics)');
    console.log();

    console.log('🔧 Available Loggers:');
    console.log('  • AudioLogger - Audio processing and playback');
    console.log('  • RecordingLogger - Recording and streaming');
    console.log('  • ProcessingLogger - Audio processing and chunks');
    console.log('  • WASMLogger - WebAssembly operations');
    console.log('  • UILogger - User interface interactions');
    console.log('  • PerformanceLogger - Performance metrics');
    console.log();

    console.log('📦 Import:');
    console.log('  import { AudioLogger, ProcessingLogger } from "../utils/logger";');
  }

  hasErrors() {
    return this.violations.some(v => v.severity === 'error');
  }
}

// CLI interface
if (require.main === module) {
  const filePaths = process.argv.slice(2);
  
  if (filePaths.length === 0) {
    console.log('Usage: node check-console-logs.js <file1> <file2> ...');
    process.exit(0);
  }

  const checker = new ConsoleLogChecker();
  const success = checker.checkFiles(filePaths);
  
  if (!success && checker.hasErrors()) {
    console.error('\n🚫 Commit blocked due to console.log statements in production code.');
    console.error('Please replace with structured logging before committing.');
    process.exit(1);
  } else if (!success) {
    console.warn('\n⚠️  Commit allowed with warnings. Consider migrating to structured logging.');
    process.exit(0);
  } else {
    console.log('\n🎉 All production code uses structured logging!');
    process.exit(0);
  }
}

module.exports = ConsoleLogChecker;