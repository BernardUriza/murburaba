#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Path alias mappings
const aliases = {
  '@features': 'src/features',
  '@shared': 'src/shared',
  '@core': 'src/core',
  '@utils': 'src/utils',
  '@components': 'src/components',
  '@types': 'src/types',
  '@lib': 'src/lib'
};

function getRelativePath(fromFile, toAlias, aliasPath) {
  const fromDir = dirname(fromFile);
  const toPath = join(rootDir, aliasPath);
  let relativePath = relative(fromDir, toPath);
  
  // Ensure we use forward slashes
  relativePath = relativePath.replace(/\\/g, '/');
  
  // Add ./ if it doesn't start with ../
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }
  
  return relativePath;
}

function processFile(filePath) {
  let content = readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Process each alias
  for (const [alias, path] of Object.entries(aliases)) {
    // Match both import and export statements
    const regex = new RegExp(`(from\\s+['"])(${alias})(/[^'"]*)?(['"])`, 'g');
    
    content = content.replace(regex, (match, prefix, aliasMatch, subPath = '', suffix) => {
      const relativePath = getRelativePath(filePath, aliasMatch, path);
      modified = true;
      return `${prefix}${relativePath}${subPath}${suffix}`;
    });
  }
  
  if (modified) {
    writeFileSync(filePath, content);
    console.log(`✅ Fixed aliases in: ${relative(rootDir, filePath)}`);
  }
}

function processDirectory(dir) {
  const files = readdirSync(dir);
  
  for (const file of files) {
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory() && file !== 'node_modules') {
      processDirectory(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      processFile(fullPath);
    }
  }
}

console.log('🔧 Fixing path aliases in source files...');
processDirectory(join(rootDir, 'src'));
console.log('✨ Path aliases fixed!');