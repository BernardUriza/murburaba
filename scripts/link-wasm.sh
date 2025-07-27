#!/bin/bash
# Create symlinks instead of copying WASM files

echo "Creating symlinks for WASM files..."

# Create symlinks in public directory
ln -sf ../node_modules/@jitsi/rnnoise-wasm/dist/rnnoise.wasm public/rnnoise.wasm
ln -sf ../node_modules/@jitsi/rnnoise-wasm/dist/rnnoise.js public/rnnoise.js

echo "Symlinks created successfully"