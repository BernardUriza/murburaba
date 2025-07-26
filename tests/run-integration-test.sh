#!/bin/bash

# Script to run MurmurabaSuite integration test

echo "🚀 Starting MurmurabaSuite integration test..."

# Kill any existing dev server
echo "🔪 Killing any existing dev server..."
pkill -f "next dev" || true
sleep 2

# Start the dev server in background
echo "🔧 Starting Next.js dev server..."
npm run dev &
DEV_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for server to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
    echo "✅ Server is ready!"
    break
  fi
  
  echo "⏳ Waiting for server... (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)"
  sleep 2
  RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "❌ Server failed to start after $MAX_RETRIES attempts"
  kill $DEV_PID 2>/dev/null || true
  exit 1
fi

# Run the Puppeteer test
echo "🧪 Running Puppeteer test..."
npm test -- tests/murmuraba-suite.test.ts

# Capture test exit code
TEST_EXIT_CODE=$?

# Kill the dev server
echo "🔪 Killing dev server..."
kill $DEV_PID 2>/dev/null || true

# Exit with test exit code
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "✅ Test passed!"
else
  echo "❌ Test failed!"
fi

exit $TEST_EXIT_CODE