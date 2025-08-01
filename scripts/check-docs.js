#!/usr/bin/env node

/**
 * Documentation Checker for Murmuraba
 * Ensures README is always up to date with actual exports
 */

const fs = require('fs');
const path = require('path');

console.log('📚 Checking Murmuraba documentation...\n');

// Paths
const indexPath = path.join(__dirname, '../packages/murmuraba/src/index.ts');
const readmePath = path.join(__dirname, '../packages/murmuraba/README.md');
const packagePath = path.join(__dirname, '../packages/murmuraba/package.json');

// Read files
const indexContent = fs.readFileSync(indexPath, 'utf8');
const readmeContent = fs.readFileSync(readmePath, 'utf8');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

let hasErrors = false;
let hasWarnings = false;

// 1. Check version
console.log('📌 Checking version...');
if (!readmeContent.includes(packageJson.version)) {
  console.error(`❌ Version mismatch: package.json has ${packageJson.version} but not found in README`);
  hasErrors = true;
} else {
  console.log(`✅ Version ${packageJson.version} is documented`);
}

// 2. Extract exports from index.ts
console.log('\n🔍 Checking exports...');
const exportRegex = /export\s+{([^}]+)}/g;
const namedExports = [];
let match;

while ((match = exportRegex.exec(indexContent)) !== null) {
  const exports = match[1]
    .split(',')
    .map(e => e.trim())
    .filter(e => e && !e.includes(' as '))
    .map(e => e.split(' ')[0]);
  namedExports.push(...exports);
}

// Also check for direct exports
const directExportRegex = /export\s+(?:const|function|class|interface|type)\s+(\w+)/g;
while ((match = directExportRegex.exec(indexContent)) !== null) {
  namedExports.push(match[1]);
}

// Remove duplicates
const uniqueExports = [...new Set(namedExports)];
console.log(`Found ${uniqueExports.length} exports`);

// 3. Check each export is documented
const undocumentedExports = [];
uniqueExports.forEach(exportName => {
  if (!readmeContent.includes(exportName)) {
    undocumentedExports.push(exportName);
  }
});

if (undocumentedExports.length > 0) {
  console.warn('\n⚠️  Undocumented exports:');
  undocumentedExports.forEach(exp => console.warn(`   - ${exp}`));
  hasWarnings = true;
}

// 4. Check for common issues
console.log('\n🏥 Checking for common issues...');

// Check React version in badge
const reactBadgeMatch = readmeContent.match(/React-(\d+\.\d+\.\d+)/);
if (reactBadgeMatch) {
  const readmeReactVersion = reactBadgeMatch[1];
  const actualReactVersion = packageJson.peerDependencies?.react || packageJson.dependencies?.react || '';
  if (!actualReactVersion.includes(readmeReactVersion.split('.')[0])) {
    console.warn(`⚠️  React version in badge (${readmeReactVersion}) might be outdated`);
    hasWarnings = true;
  }
}

// Check if examples use correct imports
const importExamples = readmeContent.match(/import\s+{([^}]+)}\s+from\s+['"]murmuraba['"]/g) || [];
importExamples.forEach(imp => {
  const imports = imp.match(/{([^}]+)}/)[1]
    .split(',')
    .map(i => i.trim());
  
  imports.forEach(importName => {
    if (!uniqueExports.includes(importName)) {
      console.error(`❌ Example imports non-existent export: ${importName}`);
      hasErrors = true;
    }
  });
});

// 5. Check for TODO or FIXME in README
if (readmeContent.includes('TODO') || readmeContent.includes('FIXME')) {
  console.warn('⚠️  README contains TODO or FIXME markers');
  hasWarnings = true;
}

// Summary
console.log('\n📊 Summary:');
if (!hasErrors && !hasWarnings) {
  console.log('✅ Documentation is up to date!');
  process.exit(0);
} else {
  if (hasWarnings) {
    console.log(`⚠️  ${undocumentedExports.length} warnings found`);
  }
  if (hasErrors) {
    console.log(`❌ Errors found - documentation needs updating`);
    process.exit(1);
  }
  process.exit(0);
}