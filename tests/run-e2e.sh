#!/bin/bash

# E2E Test Runner for Murmuraba Audio Demo

echo "🧪 Running Murmuraba E2E Tests..."

# Check if server is running
if ! curl -s http://localhost:3000 > /dev/null; then
  echo "❌ Server not running. Please start the development server first:"
  echo "   npm run dev"
  exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules/puppeteer" ]; then
  echo "📦 Installing test dependencies..."
  npm install --save-dev puppeteer jest
fi

# Create downloads directory
mkdir -p tests/downloads

# Run tests
echo "🚀 Starting E2E tests..."
npx jest tests/e2e/audio-demo.test.js --verbose

# Clean up
rm -rf tests/downloads

echo "✅ E2E tests completed!"