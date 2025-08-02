#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Read version from single source of truth
const versionFile = path.join(__dirname, '..', 'version.json');
const { version } = JSON.parse(fs.readFileSync(versionFile, 'utf8'));

console.log(`📦 Syncing version ${version} across all packages...`);

// Update root package.json
const rootPackagePath = path.join(__dirname, '..', 'package.json');
const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, 'utf8'));
rootPackage.version = version;
fs.writeFileSync(rootPackagePath, JSON.stringify(rootPackage, null, 2) + '\n');
console.log('✅ Updated root package.json');

// Update murmuraba package.json
const murmurabaPackagePath = path.join(__dirname, '..', 'packages', 'murmuraba', 'package.json');
const murmurabaPackage = JSON.parse(fs.readFileSync(murmurabaPackagePath, 'utf8'));
murmurabaPackage.version = version;
fs.writeFileSync(murmurabaPackagePath, JSON.stringify(murmurabaPackage, null, 2) + '\n');
console.log('✅ Updated murmuraba package.json');

// Update murmuraba index.js
const indexPath = path.join(__dirname, '..', 'packages', 'murmuraba', 'src', 'index.ts');
let indexContent = fs.readFileSync(indexPath, 'utf8');
indexContent = indexContent.replace(/export const VERSION = ['"].*['"]/, `export const VERSION = '${version}'`);
indexContent = indexContent.replace(/export const MURMURABA_VERSION = ['"].*['"]/, `export const MURMURABA_VERSION = '${version}'`);
fs.writeFileSync(indexPath, indexContent);
console.log('✅ Updated murmuraba index.ts');

// Update build-info component
const buildInfoPath = path.join(__dirname, '..', 'packages', 'murmuraba', 'src', 'components', 'build-info', 'build-info.tsx');
if (fs.existsSync(buildInfoPath)) {
  let buildInfoContent = fs.readFileSync(buildInfoPath, 'utf8');
  buildInfoContent = buildInfoContent.replace(/return process\.env\.PACKAGE_VERSION \|\| ['"].*['"]/, `return process.env.PACKAGE_VERSION || '${version}'`);
  fs.writeFileSync(buildInfoPath, buildInfoContent);
  console.log('✅ Updated build-info.tsx');
}

console.log(`\n🎉 Version ${version} synced successfully!`);