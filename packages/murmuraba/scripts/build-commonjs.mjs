import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to convert ES modules to CommonJS
function convertToCommonJS(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already processed
  if (content.includes('/* CommonJS build */')) {
    return;
  }
  
  // Convert all export statements to module.exports
  const exports = [];
  
  // Handle export function/const/let/var/class
  content = content.replace(/export\s+(function|const|let|var|class)\s+(\w+)/g, (match, type, name) => {
    exports.push(name);
    return `${type} ${name}`;
  });
  
  // Handle export { ... }
  content = content.replace(/export\s*{\s*([^}]+)\s*}/g, (match, items) => {
    items.split(',').forEach(item => {
      const name = item.trim().split(' as ')[0].trim();
      if (name) exports.push(name);
    });
    return '';
  });
  
  // Handle export { ... } from '...'
  content = content.replace(/export\s*{\s*([^}]+)\s*}\s*from\s*["']([^'"]+)["']/g, (match, items, mod) => {
    const itemList = items.split(',').map(i => i.trim());
    itemList.forEach(item => {
      const [local, exported] = item.split(' as ').map(s => s.trim());
      exports.push(exported || local);
    });
    return `const { ${items} } = require('${mod}');`;
  });
  
  // Handle export * from
  content = content.replace(/export\s*\*\s*from\s*["']([^'"]+)["']/g, (match, mod) => {
    return `Object.assign(exports, require('${mod}'));`;
  });
  
  // Handle import statements
  content = content.replace(/import\s+{([^}]+)}\s+from\s+["']([^'"]+)["']/g, (match, imports, mod) => {
    return `const {${imports}} = require('${mod}');`;
  });
  
  content = content.replace(/import\s+(\w+)\s+from\s+["']([^'"]+)["']/g, (match, name, mod) => {
    return `const ${name} = require('${mod}');`;
  });
  
  // Handle React JSX imports specially
  content = content.replace(/const\s*{\s*jsx\s+as\s+_jsx[^}]*}\s*=\s*require\(['"]react\/jsx-runtime['"]\);/g, () => {
    return `const _jsx = require('react/jsx-runtime').jsx;
const _jsxs = require('react/jsx-runtime').jsxs;`;
  });
  
  // Handle CSS imports
  content = content.replace(/const\s+(\w+)\s*=\s*require\(['"]([^'"]+\.module\.css)['"]\);/g, (match, name) => {
    return `const ${name} = {};`;
  });
  
  // Add exports at the end if any were found
  if (exports.length > 0) {
    content += `\n\nmodule.exports = { ${exports.join(', ')} };`;
  }
  
  // Handle export default
  content = content.replace(/export\s+default\s+/g, 'module.exports = ');
  
  // Add marker
  content = '/* CommonJS build */\n' + content;
  
  fs.writeFileSync(filePath, content);
}

// Find all JS files
function findJSFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.includes('__tests__')) {
      files.push(...findJSFiles(fullPath));
    } else if (entry.name.endsWith('.js') && !entry.name.includes('.test.')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

const distPath = path.join(__dirname, '../dist');
const files = findJSFiles(distPath);

console.log(`Converting ${files.length} files to CommonJS...`);
files.forEach(file => {
  try {
    convertToCommonJS(file);
  } catch (err) {
    console.error(`Error processing ${file}:`, err.message);
  }
});

console.log('✅ CommonJS conversion complete!');