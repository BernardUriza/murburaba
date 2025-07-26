import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to process a file and externalize React imports
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace React imports to use external React
  content = content.replace(
    /from\s+['"]react['"]/g,
    'from "react"'
  );
  content = content.replace(
    /from\s+['"]react-dom['"]/g,
    'from "react-dom"'
  );
  
  // Replace require statements
  content = content.replace(
    /require\(['"]react['"]/g,
    'require("react"'
  );
  content = content.replace(
    /require\(['"]react-dom['"]/g,
    'require("react-dom"'
  );
  
  fs.writeFileSync(filePath, content);
}

// Process all JS files in dist
const jsFiles = glob.sync(path.join(__dirname, '../dist/**/*.js'));
jsFiles.forEach(file => {
  processFile(file);
});

console.log(`✅ Externalized React in ${jsFiles.length} files`);

// Create CommonJS wrapper that properly handles React externalization
const cjsContent = `'use strict';

// Ensure React is externalized
if (typeof require !== 'undefined') {
  const React = require('react');
  const ReactDOM = require('react-dom');
  
  // Re-export everything from the TypeScript build
  module.exports = require('./index.js');
}
`;

fs.writeFileSync(path.join(__dirname, '../dist/index.cjs.js'), cjsContent);
console.log('✅ Created CommonJS wrapper with React externalization');

// Create ESM wrapper with proper externalization
const esmContent = `// ESM wrapper with React externalization
import React from 'react';
import ReactDOM from 'react-dom';

// Ensure React is available globally for the bundle
if (typeof window !== 'undefined') {
  window.React = React;
  window.ReactDOM = ReactDOM;
}

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

console.log('✅ Build complete with React externalization!');