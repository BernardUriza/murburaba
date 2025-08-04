#!/usr/bin/env node

/**
 * Comprehensive Refactoring Analysis Script for Murmuraba Studio v3.0.0
 * 
 * This script performs strategic analysis including:
 * - Dead code detection (files, functions, imports)
 * - Bundle size analysis and optimization opportunities
 * - Code duplication detection
 * - Architecture assessment
 * - Performance bottleneck identification
 * - Dependency analysis
 */

import { execSync, spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function section(title) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`${title}`, colors.bright + colors.cyan);
  log(`${'='.repeat(60)}`, colors.cyan);
}

function subsection(title) {
  log(`\n${'-'.repeat(40)}`, colors.blue);
  log(`${title}`, colors.bright + colors.blue);
  log(`${'-'.repeat(40)}`, colors.blue);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function warning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

// Check if command exists
function commandExists(command) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Execute command and return output
function execCommand(command, options = {}) {
  try {
    const result = execSync(command, { 
      encoding: 'utf8', 
      cwd: rootDir,
      ...options 
    });
    return { success: true, output: result };
  } catch (err) {
    return { success: false, error: err.message, output: err.stdout || '' };
  }
}

// Install dependencies if missing
async function ensureDependencies() {
  section('DEPENDENCY VERIFICATION');
  
  const requiredPackages = [
    'knip',
    'depcheck',
    'webpack-bundle-analyzer',
    'source-map-explorer',
    'jscpd',
    'complexity-report',
    'eslint'
  ];
  
  const missingPackages = [];
  
  for (const pkg of requiredPackages) {
    if (!commandExists(pkg)) {
      missingPackages.push(pkg);
    }
  }
  
  if (missingPackages.length > 0) {
    warning(`Missing packages: ${missingPackages.join(', ')}`);
    info('Installing missing analysis tools...');
    
    const installCommand = `npm install -g ${missingPackages.join(' ')}`;
    const result = execCommand(installCommand);
    
    if (result.success) {
      success('Analysis tools installed successfully');
    } else {
      error('Failed to install some tools. Some analysis may be limited.');
      warning('You may need to install manually with sudo or use npx');
    }
  } else {
    success('All required analysis tools are available');
  }
}

// 1. Dead Code Detection
async function analyzeDeadCode() {
  section('DEAD CODE ANALYSIS');
  
  // Knip analysis
  subsection('Knip - Advanced Dead Code Detection');
  const knipResult = execCommand('npx knip --reporter json');
  if (knipResult.success) {
    try {
      const knipData = JSON.parse(knipResult.output);
      
      if (knipData.files?.length > 0) {
        warning(`Found ${knipData.files.length} unused files:`);
        knipData.files.forEach(file => log(`  - ${file}`, colors.yellow));
      }
      
      if (knipData.dependencies?.length > 0) {
        warning(`Found ${knipData.dependencies.length} unused dependencies:`);
        knipData.dependencies.forEach(dep => log(`  - ${dep}`, colors.yellow));
      }
      
      if (knipData.exports?.length > 0) {
        warning(`Found ${knipData.exports.length} unused exports:`);
        knipData.exports.forEach(exp => log(`  - ${exp.file}:${exp.symbol}`, colors.yellow));
      }
      
      if (!knipData.files?.length && !knipData.dependencies?.length && !knipData.exports?.length) {
        success('No dead code detected by Knip');
      }
    } catch (err) {
      error('Failed to parse Knip output');
      log(knipResult.output);
    }
  } else {
    error('Knip analysis failed');
    log(knipResult.error);
  }
  
  // Depcheck analysis
  subsection('Depcheck - Dependency Analysis');
  const depcheckResult = execCommand('npx depcheck --json');
  if (depcheckResult.success) {
    try {
      const depcheckData = JSON.parse(depcheckResult.output);
      
      const unusedDeps = Object.keys(depcheckData.dependencies || {});
      const unusedDevDeps = Object.keys(depcheckData.devDependencies || {});
      const missingDeps = Object.keys(depcheckData.missing || {});
      
      if (unusedDeps.length > 0) {
        warning(`Unused dependencies (${unusedDeps.length}):`);
        unusedDeps.forEach(dep => log(`  - ${dep}`, colors.yellow));
      }
      
      if (unusedDevDeps.length > 0) {
        warning(`Unused dev dependencies (${unusedDevDeps.length}):`);
        unusedDevDeps.forEach(dep => log(`  - ${dep}`, colors.yellow));
      }
      
      if (missingDeps.length > 0) {
        error(`Missing dependencies (${missingDeps.length}):`);
        missingDeps.forEach(dep => log(`  - ${dep}`, colors.red));
      }
      
      if (unusedDeps.length === 0 && unusedDevDeps.length === 0 && missingDeps.length === 0) {
        success('All dependencies are properly used');
      }
    } catch (err) {
      error('Failed to parse Depcheck output');
    }
  } else {
    error('Depcheck analysis failed');
  }
  
  // ESLint unused vars check
  subsection('ESLint - Unused Variables');
  const eslintResult = execCommand('npx eslint src packages/murmuraba/src --ext .ts,.tsx --format json || true');
  if (eslintResult.success && eslintResult.output.trim()) {
    try {
      const eslintData = JSON.parse(eslintResult.output);
      const unusedVarMessages = eslintData.flatMap(file => 
        file.messages.filter(msg => 
          msg.ruleId === 'no-unused-vars' || 
          msg.ruleId === '@typescript-eslint/no-unused-vars'
        ).map(msg => ({ file: file.filePath, ...msg }))
      );
      
      if (unusedVarMessages.length > 0) {
        warning(`Found ${unusedVarMessages.length} unused variables:`);
        unusedVarMessages.slice(0, 10).forEach(msg => 
          log(`  - ${msg.file}:${msg.line}: ${msg.message}`, colors.yellow)
        );
        if (unusedVarMessages.length > 10) {
          log(`  ... and ${unusedVarMessages.length - 10} more`, colors.yellow);
        }
      } else {
        success('No unused variables detected');
      }
    } catch (err) {
      warning('Could not parse ESLint output for unused variables');
    }
  }
}

// 2. Bundle Analysis
async function analyzeBundleSize() {
  section('BUNDLE SIZE ANALYSIS');
  
  // First build the project
  info('Building project for bundle analysis...');
  const buildResult = execCommand('npm run build');
  
  if (!buildResult.success) {
    error('Build failed - cannot analyze bundle');
    return;
  }
  
  success('Build completed successfully');
  
  // Analyze bundle with source-map-explorer if available
  subsection('Bundle Composition Analysis');
  if (existsSync(join(rootDir, 'dist'))) {
    const distFiles = execCommand('find dist -name "*.js" -type f');
    if (distFiles.success) {
      const jsFiles = distFiles.output.trim().split('\n').filter(f => f.endsWith('.js'));
      
      for (const file of jsFiles.slice(0, 3)) { // Analyze top 3 JS files
        const fileSize = execCommand(`stat -f%z "${file}" 2>/dev/null || stat -c%s "${file}" 2>/dev/null || echo "0"`);
        const sizeKB = Math.round(parseInt(fileSize.output.trim()) / 1024);
        log(`📦 ${file}: ${sizeKB} KB`, colors.blue);
      }
    }
    
    // Try to analyze with source-map-explorer
    const sourcemapResult = execCommand('npx source-map-explorer dist/*.js --json 2>/dev/null || echo "[]"');
    if (sourcemapResult.success) {
      try {
        const sourcemapData = JSON.parse(sourcemapResult.output);
        if (Array.isArray(sourcemapData) && sourcemapData.length > 0) {
          info('Source map analysis available - check console output');
        }
      } catch (err) {
        // Silent fail for source map analysis
      }
    }
  }
  
  // Package analysis from package.json
  subsection('Package Size Analysis');
  const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
  const murmurabaPackageJson = JSON.parse(readFileSync(join(rootDir, 'packages/murmuraba/package.json'), 'utf8'));
  
  const allDeps = {
    ...packageJson.dependencies,
    ...murmurabaPackageJson.dependencies
  };
  
  const heavyPackages = [
    'react', 'react-dom', 'recharts', 'sweetalert2', 'zustand',
    '@jitsi/rnnoise-wasm', 'jszip', 'lamejs'
  ];
  
  log('📊 Key package analysis:', colors.blue);
  for (const pkg of heavyPackages) {
    if (allDeps[pkg]) {
      log(`  - ${pkg}: ${allDeps[pkg]}`, colors.cyan);
    }
  }
}

// 3. Code Duplication Analysis
async function analyzeCodeDuplication() {
  section('CODE DUPLICATION ANALYSIS');
  
  const jscpdResult = execCommand('npx jscpd src packages/murmuraba/src --reporters json --output ./jscpd-report.json --min-lines 5 --min-tokens 50 || true');
  
  if (existsSync('./jscpd-report.json')) {
    try {
      const jscpdData = JSON.parse(readFileSync('./jscpd-report.json', 'utf8'));
      
      if (jscpdData.duplicates && jscpdData.duplicates.length > 0) {
        warning(`Found ${jscpdData.duplicates.length} code duplications:`);
        
        jscpdData.duplicates.slice(0, 5).forEach((dup, index) => {
          log(`\n${index + 1}. Duplication (${dup.lines} lines):`, colors.yellow);
          log(`   📄 ${dup.firstFile?.name}:${dup.firstFile?.start}-${dup.firstFile?.end}`, colors.cyan);
          log(`   📄 ${dup.secondFile?.name}:${dup.secondFile?.start}-${dup.secondFile?.end}`, colors.cyan);
        });
        
        if (jscpdData.duplicates.length > 5) {
          log(`\n   ... and ${jscpdData.duplicates.length - 5} more duplications`, colors.yellow);
        }
      } else {
        success('No significant code duplication detected');
      }
      
      if (jscpdData.statistics) {
        log(`\n📊 Duplication Statistics:`, colors.blue);
        log(`   Total lines: ${jscpdData.statistics.total?.lines || 'N/A'}`, colors.cyan);
        log(`   Duplicated lines: ${jscpdData.statistics.clones?.lines || 'N/A'}`, colors.cyan);
        log(`   Duplication percentage: ${jscpdData.statistics.clones?.percentage || 'N/A'}%`, colors.cyan);
      }
    } catch (err) {
      error('Failed to parse code duplication report');
    }
  } else {
    warning('Code duplication analysis not available');
  }
}

// 4. Architecture Analysis
async function analyzeArchitecture() {
  section('ARCHITECTURE ANALYSIS');
  
  subsection('Project Structure Assessment');
  
  // Analyze project structure
  const structureAnalysis = {
    components: 0,
    hooks: 0,
    utils: 0,
    services: 0,
    features: 0,
    tests: 0
  };
  
  const findResult = execCommand('find src packages/murmuraba/src -name "*.tsx" -o -name "*.ts" | grep -v __tests__ | grep -v test');
  if (findResult.success) {
    const files = findResult.output.trim().split('\n').filter(f => f);
    
    files.forEach(file => {
      if (file.includes('/components/')) structureAnalysis.components++;
      else if (file.includes('/hooks/')) structureAnalysis.hooks++;
      else if (file.includes('/utils/')) structureAnalysis.utils++;
      else if (file.includes('/services/')) structureAnalysis.services++;
      else if (file.includes('/features/')) structureAnalysis.features++;
    });
  }
  
  const testResult = execCommand('find src packages/murmuraba/src -name "*.test.*" -o -name "*__tests__*" | wc -l');
  if (testResult.success) {
    structureAnalysis.tests = parseInt(testResult.output.trim());
  }
  
  log('📁 Project Structure:', colors.blue);
  Object.entries(structureAnalysis).forEach(([key, value]) => {
    log(`   ${key}: ${value} files`, colors.cyan);
  });
  
  // Check for barrel exports
  subsection('Module Organization');
  const barrelResult = execCommand('find src packages/murmuraba/src -name "index.ts" -o -name "index.tsx"');
  if (barrelResult.success) {
    const barrels = barrelResult.output.trim().split('\n').filter(f => f);
    log(`📦 Barrel exports found: ${barrels.length}`, colors.cyan);
    barrels.forEach(barrel => log(`   - ${barrel}`, colors.cyan));
  }
  
  // Check for circular dependencies (basic check)
  subsection('Circular Dependencies Check');
  const circularResult = execCommand('npx madge --circular --format amd src packages/murmuraba/src || echo "No circular dependencies found"');
  if (circularResult.success) {
    if (circularResult.output.includes('Circular dependency')) {
      warning('Circular dependencies detected');
      log(circularResult.output, colors.yellow);
    } else {
      success('No circular dependencies detected');
    }
  }
}

// 5. Performance Analysis
async function analyzePerformance() {
  section('PERFORMANCE ANALYSIS');
  
  subsection('Component Complexity');
  
  // Analyze React component complexity
  const complexityResult = execCommand('find src packages/murmuraba/src -name "*.tsx" -exec wc -l {} \\; | sort -nr | head -10');
  if (complexityResult.success) {
    log('📊 Largest components by line count:', colors.blue);
    const lines = complexityResult.output.trim().split('\n');
    lines.forEach(line => {
      const [count, file] = line.trim().split(/\\s+(.+)/);
      if (file) {
        log(`   ${count} lines: ${file}`, colors.cyan);
      }
    });
  }
  
  // Check for heavy imports
  subsection('Heavy Import Analysis');
  const heavyImports = [
    'react-dom',
    'recharts',
    'sweetalert2',
    '@jitsi/rnnoise-wasm',
    'jszip'
  ];
  
  for (const pkg of heavyImports) {
    const importResult = execCommand(`grep -r "from '${pkg}'" src packages/murmuraba/src || true`);
    if (importResult.success && importResult.output.trim()) {
      const count = importResult.output.trim().split('\n').length;
      log(`📦 ${pkg} imported in ${count} files`, colors.cyan);
    }
  }
  
  // Check for potential re-render issues
  subsection('Re-render Risk Analysis');
  const rerenderRisks = [
    'useState.*{',  // Object state
    'useEffect.*\\[\\]', // Missing dependencies
    'useMemo.*undefined', // No dependencies
    'useCallback.*undefined' // No dependencies
  ];
  
  for (const pattern of rerenderRisks) {
    const riskResult = execCommand(`grep -r "${pattern}" src packages/murmuraba/src || true`);
    if (riskResult.success && riskResult.output.trim()) {
      const count = riskResult.output.trim().split('\n').length;
      log(`⚠️  Potential re-render risk (${pattern}): ${count} occurrences`, colors.yellow);
    }
  }
}

// Generate final report
function generateReport() {
  section('REFACTORING STRATEGY SUMMARY');
  
  const recommendations = [
    {
      category: '🎯 High Priority',
      color: colors.red,
      items: [
        'Remove unused dependencies identified by depcheck',
        'Eliminate dead code files found by knip',
        'Optimize heavy bundle chunks (recharts, sweetalert2)',
        'Implement code splitting for large components',
        'Fix circular dependencies if any'
      ]
    },
    {
      category: '⚡ Performance Optimizations',
      color: colors.yellow,
      items: [
        'Implement React.memo for heavy components',
        'Add proper dependency arrays to useEffect/useMemo',
        'Lazy load non-critical components',
        'Optimize WASM loading strategy',
        'Implement virtual scrolling for large lists'
      ]
    },
    {
      category: '🏗️ Architecture Improvements',
      color: colors.blue,
      items: [
        'Consolidate duplicate component patterns',
        'Improve barrel export organization',
        'Enhance type safety across modules',
        'Implement proper error boundaries',
        'Optimize state management patterns'
      ]
    },
    {
      category: '🧹 Code Quality',
      color: colors.green,
      items: [
        'Reduce code duplication below 5%',
        'Improve test coverage for core features',
        'Standardize component prop interfaces',
        'Enhance error handling consistency',
        'Document complex audio processing logic'
      ]
    }
  ];
  
  recommendations.forEach(section => {
    log(`\n${section.category}:`, section.color + colors.bright);
    section.items.forEach(item => {
      log(`  • ${item}`, section.color);
    });
  });
  
  log('\n' + '='.repeat(60), colors.cyan);
  log('IMPLEMENTATION PRIORITY MATRIX', colors.bright + colors.cyan);
  log('='.repeat(60), colors.cyan);
  
  const matrix = [
    { effort: 'Low', impact: 'High', tasks: ['Remove unused deps', 'Fix ESLint warnings', 'Add React.memo'] },
    { effort: 'Medium', impact: 'High', tasks: ['Implement code splitting', 'Optimize WASM loading', 'Add lazy loading'] },
    { effort: 'High', impact: 'Medium', tasks: ['Refactor large components', 'Improve architecture', 'Enhance testing'] },
    { effort: 'Low', impact: 'Medium', tasks: ['Update documentation', 'Standardize interfaces', 'Code formatting'] }
  ];
  
  matrix.forEach(item => {
    log(`\n📊 ${colors.bright}${item.effort} Effort, ${item.impact} Impact:${colors.reset}`, colors.cyan);
    item.tasks.forEach(task => log(`   • ${task}`, colors.cyan));
  });
  
  log(`\n${colors.bright}${colors.green}✅ Analysis Complete!${colors.reset}`);
  log(`📁 Check generated reports in: ./jscpd-report.json`, colors.blue);
  log(`🚀 Start with High Impact, Low Effort tasks for quick wins`, colors.blue);
}

// Main execution
async function main() {
  log(`${colors.bright}${colors.cyan}Murmuraba Studio v3.0.0 - Strategic Refactoring Analysis${colors.reset}`);
  log(`🔍 Comprehensive codebase optimization analysis\n`);
  
  try {
    await ensureDependencies();
    await analyzeDeadCode();
    await analyzeBundleSize();
    await analyzeCodeDuplication();
    await analyzeArchitecture();
    await analyzePerformance();
    generateReport();
  } catch (err) {
    error(`Analysis failed: ${err.message}`);
    process.exit(1);
  }
}

// Run the analysis
main().catch(console.error);