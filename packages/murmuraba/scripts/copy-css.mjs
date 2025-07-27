import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function copyCssFiles() {
  const srcDir = path.join(__dirname, '../src');
  const distDir = path.join(__dirname, '../dist');
  
  // Find all CSS module files
  const cssFiles = await glob('**/*.module.css', { cwd: srcDir });
  
  let copiedCount = 0;
  
  for (const cssFile of cssFiles) {
    const srcPath = path.join(srcDir, cssFile);
    const distPath = path.join(distDir, cssFile);
    
    // Ensure directory exists
    const dir = path.dirname(distPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Copy the file
    fs.copyFileSync(srcPath, distPath);
    copiedCount++;
  }
  
  console.log(`✅ Copied ${copiedCount} CSS module files`);
}

copyCssFiles().catch(console.error);