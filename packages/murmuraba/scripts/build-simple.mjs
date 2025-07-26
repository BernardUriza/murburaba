import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to process a file and externalize React imports
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip files that are already processed
  if (content.includes('/* React externalized */')) {
    return;
  }
  
  // Track if React has been required
  let reactRequired = false;
  
  // For react/jsx-runtime imports
  content = content.replace(
    /import\s*{\s*jsx\s+as\s+_jsx(?:,\s*jsxs\s+as\s+_jsxs)?\s*}\s*from\s*["']react\/jsx-runtime["'];?/g,
    () => {
      reactRequired = true;
      return `const React = require('react');
const ReactJSXRuntime = require('react/jsx-runtime');
const _jsx = ReactJSXRuntime.jsx;
const _jsxs = ReactJSXRuntime.jsxs;`;
    }
  );
  
  // Replace ES6 imports with require for React
  content = content.replace(
    /import\s*{([^}]+)}\s*from\s*["']react["'];?/g,
    (match, imports) => {
      const importList = imports.split(',').map(i => i.trim());
      const requireStatement = reactRequired ? '' : `const React = require('react');\n`;
      reactRequired = true;
      return `${requireStatement}const { ${importList.join(', ')} } = React;`;
    }
  );
  
  // Replace other ES6 imports with require
  content = content.replace(
    /import\s*{([^}]+)}\s*from\s*["']([^'"]+)["'];?/g,
    (match, imports, modulePath) => {
      if (modulePath.includes('react')) return match; // Already handled
      return `const { ${imports} } = require('${modulePath}');`;
    }
  );
  
  // Replace default imports
  content = content.replace(
    /import\s+(\w+)\s+from\s+["']([^'"]+)["'];?/g,
    (match, varName, modulePath) => {
      if (modulePath.includes('react')) return match; // Already handled
      // Handle CSS modules differently
      if (modulePath.endsWith('.module.css')) {
        return `const ${varName} = {};`; // Return empty object for CSS modules
      }
      return `const ${varName} = require('${modulePath}');`;
    }
  );
  
  // Collect all exports
  const exportedItems = [];
  
  // Replace export { X } from 'module' statements
  content = content.replace(
    /export\s*{\s*([^}]+)\s*}\s*from\s*["']([^'"]+)["'];?/g,
    (match, exports, modulePath) => {
      const items = exports.split(',').map(e => e.trim());
      items.forEach(item => {
        const [name, alias] = item.split(' as ').map(s => s.trim());
        exportedItems.push(alias || name);
      });
      return `const { ${exports} } = require('${modulePath}');`;
    }
  );
  
  // Replace named exports (without from)
  content = content.replace(
    /export\s*{\s*([^}]+)\s*}(?!\s*from);?/g,
    (match, exports) => {
      exports.split(',').forEach(exp => {
        const trimmed = exp.trim();
        if (trimmed) exportedItems.push(trimmed);
      });
      return ''; // Remove the export statement
    }
  );
  
  // Replace exported functions/const/let/var
  content = content.replace(
    /export\s+(function|const|let|var)\s+(\w+)/g,
    (match, type, name) => {
      exportedItems.push(name);
      return `${type} ${name}`;
    }
  );
  
  // Replace export class
  content = content.replace(
    /export\s+class\s+(\w+)/g,
    (match, className) => {
      exportedItems.push(className);
      return `class ${className}`;
    }
  );
  
  // Replace export default
  content = content.replace(
    /export\s+default\s+/g,
    'module.exports = '
  );
  
  // Handle export * from statements
  content = content.replace(
    /export\s*\*\s*from\s*["']([^'"]+)["'];?/g,
    (match, modulePath) => {
      return `module.exports = { ...module.exports, ...require('${modulePath}') };`;
    }
  );
  
  // Add module.exports at the end
  if (exportedItems.length > 0) {
    content += `\n\nmodule.exports = { ${exportedItems.join(', ')} };`;
  }
  
  // Replace default React import
  content = content.replace(
    /import\s+React\s+from\s+["']react["'];?/g,
    () => {
      const requireStatement = reactRequired ? '' : `const React = require('react');`;
      reactRequired = true;
      return requireStatement;
    }
  );
  
  // Replace react-dom imports
  content = content.replace(
    /import\s*{([^}]+)}\s*from\s*["']react-dom["'];?/g,
    (match, imports) => {
      return `const ReactDOM = require('react-dom');
const { ${imports} } = ReactDOM;`;
    }
  );
  
  // Add marker
  content = '/* React externalized */\n' + content;
  
  fs.writeFileSync(filePath, content);
}

// Function to find all JS files recursively
function findJsFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findJsFiles(fullPath, files);
    } else if (entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Process all JS files in dist
const distPath = path.join(__dirname, '../dist');
const jsFiles = findJsFiles(distPath);
jsFiles.forEach(file => {
  processFile(file);
});

console.log(`✅ Externalized React in ${jsFiles.length} files`);

// Create CommonJS wrapper that properly handles React externalization
const cjsContent = `'use strict';

// This file ensures React is properly externalized for CommonJS environments
// Re-export everything from the TypeScript build
module.exports = require('./index.js');
`;

fs.writeFileSync(path.join(__dirname, '../dist/index.cjs.js'), cjsContent);
console.log('✅ Created CommonJS wrapper with React externalization');

// Create ESM wrapper with proper externalization
const esmContent = `// ESM wrapper - React is expected to be provided by the host application
export * from './index.js';
`;

fs.writeFileSync(path.join(__dirname, '../dist/index.esm.js'), esmContent);
console.log('✅ Created ESM wrapper with React externalization');

// Copy WASM file if not using base64 bundle
const wasmSrc = path.join(__dirname, '../node_modules/@jitsi/rnnoise-wasm/dist/rnnoise.wasm');
const wasmDest = path.join(__dirname, '../dist/rnnoise.wasm');

if (fs.existsSync(wasmSrc) && !fs.existsSync(path.join(__dirname, '../src/utils/wasm-data.ts'))) {
  fs.copyFileSync(wasmSrc, wasmDest);
  console.log('✅ Copied WASM file');
}

// Function to find all CSS module files recursively
function findCssModules(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findCssModules(fullPath, files);
    } else if (entry.name.endsWith('.module.css')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Copy CSS modules
const srcPath = path.join(__dirname, '../src');
const cssFiles = findCssModules(srcPath);
cssFiles.forEach(cssFile => {
  const relativePath = path.relative(srcPath, cssFile);
  const destPath = path.join(__dirname, '../dist', relativePath);
  const destDir = path.dirname(destPath);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  fs.copyFileSync(cssFile, destPath);
});
console.log(`✅ Copied ${cssFiles.length} CSS module files`);

console.log('✅ Build complete with React externalization!');