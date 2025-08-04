import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get package version
const packageJson = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const version = packageJson.version;

// Get current date in a readable format
const buildDate = new Date().toLocaleString('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

// Create .env file with build info for Vite
const envContent = `VITE_VERSION=${version}
VITE_BUILD_DATE="${buildDate}"
`;

fs.writeFileSync(path.join(__dirname, '..', '.env'), envContent);

console.log(`Build info generated:`);
console.log(`  Version: ${version}`);
console.log(`  Build Date: ${buildDate}`);