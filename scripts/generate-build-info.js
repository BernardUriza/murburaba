const fs = require('fs');
const path = require('path');

// Get package version
const packageJson = require('../package.json');
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