import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Copy CSS modules
const cssFiles = glob.sync(path.join(__dirname, '../src/**/*.module.css'));
cssFiles.forEach(cssFile => {
  const relativePath = path.relative(path.join(__dirname, '../src'), cssFile);
  const destPath = path.join(__dirname, '../dist', relativePath);
  const destDir = path.dirname(destPath);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  fs.copyFileSync(cssFile, destPath);
});

console.log(`✅ Copied ${cssFiles.length} CSS module files`);