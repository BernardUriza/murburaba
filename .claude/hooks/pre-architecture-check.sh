#!/bin/bash
# Architecture Guardian Hook v1.0
# Protege la arquitectura Vite + Rollup

echo "🏛️ Architecture Guardian: Verificando integridad..."

# 1. Check: No Next.js files
if [ -f "next.config.js" ] || [ -f "next.config.ts" ] || [ -f "next-env.d.ts" ] || [ -d "pages" ] || [ -d ".next" ]; then
  echo "❌ VIOLACIÓN: Archivos de Next.js detectados!"
  echo "   Esta app usa Vite, no Next.js."
  echo "   Elimina todos los archivos relacionados con Next.js."
  exit 1
fi

# 2. Check: Vite config exists
if [ ! -f "vite.config.ts" ]; then
  echo "❌ VIOLACIÓN: vite.config.ts no encontrado!"
  echo "   Esta app requiere Vite como bundler."
  exit 1
fi

# 3. Check: Rollup in package
if [ ! -f "packages/murmuraba/rollup.config.js" ]; then
  echo "❌ VIOLACIÓN: rollup.config.js faltante en el package!"
  echo "   La librería debe usar Rollup, no otro bundler."
  exit 1
fi

# 4. Check: No lib mode in Vite
if grep -q "build.*lib:" vite.config.ts; then
  echo "⚠️  ADVERTENCIA: Vite no debe construir la librería."
  echo "   La librería se construye con Rollup en packages/murmuraba"
fi

# 5. Check: Correct dependencies
if grep -q '"next":' package.json; then
  echo "❌ VIOLACIÓN: Next.js encontrado en dependencies!"
  echo "   Remueve Next.js del proyecto."
  exit 1
fi

echo "✅ Architecture Guardian: Todo correcto!"
echo "   - Vite para app demo ✓"
echo "   - Rollup para librería ✓"
echo "   - Sin contaminación de Next.js ✓"