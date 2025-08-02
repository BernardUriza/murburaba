#!/usr/bin/env node
/**
 * Comprehensive React Project Analysis Script
 * Detects ghost files, dead code, and cleanup opportunities
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Starting comprehensive project analysis...\n');

// Helper functions
function findFiles(dir, extensions, excludeDirs = []) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !excludeDirs.includes(entry.name)) {
      files.push(...findFiles(fullPath, extensions, excludeDirs));
    } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  return files;
}

function analyzeImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const imports = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.includes('import')) {
        imports.push(line.trim());
      }
    }
    return imports;
  } catch (err) {
    return [];
  }
}

// 1. Check for ghost files (files that exist but shouldn't be tracked)
console.log('👻 GHOST FILE ANALYSIS');
console.log('='.repeat(50));

const distFiles = findFiles('./packages/murmuraba/dist', ['.js', '.d.ts', '.map'], ['node_modules']);
const sourceMaps = distFiles.filter(f => f.includes('.map'));
const buildArtifacts = distFiles.filter(f => !f.includes('.map'));

console.log(`📦 Found ${buildArtifacts.length} build artifacts in dist/`);
console.log(`🗺️  Found ${sourceMaps.length} source map files`);

// Check for modified dist files (these shouldn't be tracked)
let modifiedDistFiles = [];
try {
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  modifiedDistFiles = gitStatus
    .split('\n')
    .filter(line => line.includes('packages/murmuraba/dist/'))
    .map(line => line.substring(3));
    
  if (modifiedDistFiles.length > 0) {
    console.log('⚠️  GHOST FILES DETECTED - Modified dist files (should not be tracked):');
    modifiedDistFiles.forEach(file => console.log(`   ${file}`));
  }
} catch (err) {
  console.log('❌ Could not check git status');
}

// 2. Check for orphaned test files
console.log('\n🧪 ORPHANED TEST ANALYSIS');
console.log('='.repeat(50));

const testFiles = findFiles('./src', ['.test.tsx', '.test.ts', '.spec.tsx', '.spec.ts'], ['node_modules']);
const packageTestFiles = findFiles('./packages', ['.test.tsx', '.test.ts', '.spec.tsx', '.spec.ts'], ['node_modules', 'dist']);

console.log(`📋 Found ${testFiles.length} test files in src/`);
console.log(`📋 Found ${packageTestFiles.length} test files in packages/`);

// Check for test files without corresponding source files
const orphanedTests = [];
testFiles.forEach(testFile => {
  const baseName = testFile.replace(/\.(test|spec)\.(tsx?|jsx?)$/, '');
  const possibleSources = [
    `${baseName}.tsx`,
    `${baseName}.ts`,
    `${baseName}.jsx`,
    `${baseName}.js`
  ];
  
  const hasSource = possibleSources.some(src => fs.existsSync(src));
  if (!hasSource) {
    orphanedTests.push(testFile);
  }
});

if (orphanedTests.length > 0) {
  console.log('🚨 ORPHANED TESTS DETECTED:');
  orphanedTests.forEach(file => console.log(`   ${file}`));
}

// 3. Check for duplicate component names
console.log('\n🔄 DUPLICATE COMPONENT ANALYSIS');
console.log('='.repeat(50));

const componentFiles = findFiles('./src', ['.tsx', '.jsx'], ['node_modules', '__tests__', 'test']);
const packageComponentFiles = findFiles('./packages', ['.tsx', '.jsx'], ['node_modules', 'dist', '__tests__', 'test']);

const allComponents = [...componentFiles, ...packageComponentFiles];
const componentNames = new Map();

allComponents.forEach(filePath => {
  const fileName = path.basename(filePath, path.extname(filePath));
  if (!componentNames.has(fileName)) {
    componentNames.set(fileName, []);
  }
  componentNames.get(fileName).push(filePath);
});

const duplicates = Array.from(componentNames.entries()).filter(([name, paths]) => paths.length > 1);
if (duplicates.length > 0) {
  console.log('🔄 DUPLICATE COMPONENT NAMES DETECTED:');
  duplicates.forEach(([name, paths]) => {
    console.log(`   ${name}:`);
    paths.forEach(p => console.log(`     - ${p}`));
  });
} else {
  console.log('✅ No duplicate component names found');
}

// 4. Check for large files
console.log('\n📏 LARGE FILE ANALYSIS');
console.log('='.repeat(50));

const allSourceFiles = findFiles('.', ['.ts', '.tsx', '.js', '.jsx'], ['node_modules', 'dist', 'coverage']);
const largeFiles = [];

allSourceFiles.forEach(filePath => {
  try {
    const stats = fs.statSync(filePath);
    if (stats.size > 20000) { // 20KB threshold
      largeFiles.push({
        path: filePath,
        size: Math.round(stats.size / 1024)
      });
    }
  } catch (err) {
    // Ignore errors
  }
});

largeFiles.sort((a, b) => b.size - a.size);
if (largeFiles.length > 0) {
  console.log('📏 LARGE FILES (>20KB):');
  largeFiles.slice(0, 10).forEach(file => {
    console.log(`   ${file.path} (${file.size}KB)`);
  });
}

// 5. Check for backup/temporary files
console.log('\n🗑️  TEMPORARY FILE ANALYSIS');
console.log('='.repeat(50));

const tempExtensions = ['.backup', '.tmp', '.bak', '.old', '.orig'];
const tempFiles = findFiles('.', tempExtensions, ['node_modules']);
const tsbuildinfo = findFiles('.', ['.tsbuildinfo'], ['node_modules']);

if (tempFiles.length > 0) {
  console.log('🗑️  TEMPORARY FILES DETECTED:');
  tempFiles.forEach(file => console.log(`   ${file}`));
}

if (tsbuildinfo.length > 0) {
  console.log('🏗️  BUILD INFO FILES:');
  tsbuildinfo.forEach(file => console.log(`   ${file}`));
}

// 6. Summary and recommendations
console.log('\n📊 ANALYSIS SUMMARY');
console.log('='.repeat(50));

const issues = [];
if (modifiedDistFiles && modifiedDistFiles.length > 0) issues.push(`${modifiedDistFiles.length} ghost files in dist/`);
if (orphanedTests.length > 0) issues.push(`${orphanedTests.length} orphaned test files`);
if (duplicates.length > 0) issues.push(`${duplicates.length} duplicate component names`);
if (tempFiles.length > 0) issues.push(`${tempFiles.length} temporary files`);

if (issues.length > 0) {
  console.log('⚠️  ISSUES FOUND:');
  issues.forEach(issue => console.log(`   - ${issue}`));
} else {
  console.log('✅ No major structural issues detected');
}

console.log('\n🎯 CLEANUP RECOMMENDATIONS:');
console.log('1. Add dist/ to .gitignore to prevent tracking build artifacts');
console.log('2. Remove orphaned test files or create corresponding source files');
console.log('3. Resolve duplicate component names');
console.log('4. Clean up temporary files');
console.log('5. Consider splitting large files into smaller modules');

console.log('\n✨ Analysis complete!');