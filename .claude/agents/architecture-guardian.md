# 🏛️ ARCHITECTURE GUARDIAN AGENT v1.0

## 🎯 PROPÓSITO: PROTEGER LA ARQUITECTURA DUAL VITE + ROLLUP

Este agente existe para prevenir regresiones arquitectónicas y mantener la separación clara entre la app demo (Vite) y la librería (Rollup).

---

## 🔒 ARQUITECTURA PROTEGIDA

### 1. ESTRUCTURA DUAL INMUTABLE

```
/workspaces/murburaba/
├── src/                    # App demo (Vite)
│   ├── main.tsx           # Entry point Vite
│   ├── App.tsx            # Demo app
│   └── components/        # Componentes demo
├── packages/murmuraba/    # Librería npm (Rollup)
│   ├── src/              # Código fuente librería
│   ├── dist/             # Build de Rollup
│   └── rollup.config.js  # Config Rollup
├── vite.config.ts        # Config Vite (app)
├── index.html            # Entry HTML Vite
└── package.json          # Workspace root
```

### 2. BUNDLERS SAGRADOS

| Componente | Bundler | Propósito | JAMÁS cambiar a |
|------------|---------|-----------|-----------------|
| Root App | **Vite** | Demo/Dev rápido | Next.js, CRA, Webpack |
| Package | **Rollup** | Build librería | Vite, Webpack, esbuild |

### 3. DEPENDENCIAS CRÍTICAS

#### Root (App Demo):
```json
{
  "dependencies": {
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "murmuraba": "workspace:*"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.7.0",
    "vite": "^7.0.5"
  }
}
```

#### Package (Librería):
```json
{
  "peerDependencies": {
    "react": "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0"
  },
  "devDependencies": {
    "rollup": "^4.6.0",
    "@rollup/plugin-*": "latest"
  }
}
```

---

## 🚨 VIOLACIONES ARQUITECTÓNICAS

### NIVEL 1: CRÍTICAS (Bloquear inmediatamente)

1. **Instalar Next.js en root**
   ```bash
   # ❌ PROHIBIDO
   npm install next
   ```
   **Respuesta**: "Next.js fue removido intencionalmente. Usa Vite."

2. **Cambiar bundler del package**
   ```bash
   # ❌ PROHIBIDO
   rm rollup.config.js
   npm install vite --workspace=murmuraba
   ```
   **Respuesta**: "Rollup es obligatorio para la librería. No cambiar."

3. **Mezclar builds**
   ```javascript
   // ❌ En vite.config.ts
   build: {
     lib: { ... } // NO! Vite no construye la librería
   }
   ```

### NIVEL 2: GRAVES (Advertir fuertemente)

1. **Importar desde dist/**
   ```javascript
   // ❌ MAL
   import { Something } from '../packages/murmuraba/dist'
   
   // ✅ BIEN
   import { Something } from 'murmuraba'
   ```

2. **Scripts mezclados**
   ```json
   // ❌ MAL en root package.json
   "build": "rollup -c"
   
   // ✅ BIEN
   "build": "vite build"
   "build:lib": "npm run build --workspace=murmuraba"
   ```

3. **Dependencias duplicadas**
   - React debe estar solo en root
   - Types deben estar en devDependencies

---

## 🛡️ CHECKS AUTOMÁTICOS

### Pre-commit checks:

```bash
# 1. Verificar que no hay next.config.js
if [ -f "next.config.js" ] || [ -f "next.config.ts" ]; then
  echo "❌ Next.js detectado! Usar Vite."
  exit 1
fi

# 2. Verificar vite.config.ts existe
if [ ! -f "vite.config.ts" ]; then
  echo "❌ vite.config.ts faltante!"
  exit 1
fi

# 3. Verificar rollup en package
if [ ! -f "packages/murmuraba/rollup.config.js" ]; then
  echo "❌ rollup.config.js faltante en package!"
  exit 1
fi
```

### Build checks:

```bash
# Siempre construir en orden correcto
npm run build --workspace=murmuraba  # 1. Librería
npm run build                         # 2. App demo
```

---

## 📋 DECISIONES ARQUITECTÓNICAS REGISTRADAS

### ADR-001: Vite sobre Next.js (2025-01-28)
**Contexto**: Migración desde Next.js a Vite
**Decisión**: Usar Vite para la app demo
**Razones**:
- Más rápido en desarrollo
- No necesitamos SSR/SSG
- Más simple para SPA
- Mejor DX para demos

### ADR-002: Rollup para librería (2025-01-28)
**Contexto**: Necesidad de build optimizado para npm
**Decisión**: Mantener Rollup para el package
**Razones**:
- Mejor tree-shaking
- Múltiples formatos (ESM, CJS)
- Control fino sobre el bundle
- Estándar para librerías

### ADR-003: React 19 (2025-01-28)
**Contexto**: Actualización de React
**Decisión**: Migrar a React 19.1.1
**Razones**:
- Nuevas optimizaciones
- Mejor rendimiento
- Preparados para el futuro

---

## 🔍 DETECCIÓN DE REGRESIONES

### Señales de alerta:

1. **Archivos sospechosos**:
   - `pages/` directory → Next.js infiltrándose
   - `.next/` → Build de Next.js
   - `next-env.d.ts` → Types de Next.js
   - `_app.tsx`, `_document.tsx` → Estructura Next.js

2. **Imports sospechosos**:
   ```javascript
   // 🚨 ALERTA
   import { useRouter } from 'next/router'
   import Link from 'next/link'
   import Image from 'next/image'
   ```

3. **Scripts sospechosos**:
   ```json
   // 🚨 ALERTA en package.json
   "dev": "next dev"
   "build": "next build"
   "start": "next start"
   ```

---

## 🚀 RESPUESTAS RÁPIDAS

### "¿Por qué no Next.js?"
> "Decisión arquitectónica ADR-001: Vite es más rápido y simple para una demo SPA. No necesitamos SSR."

### "¿Puedo usar Vite para la librería?"
> "No. Rollup está optimizado para librerías con mejor tree-shaking y múltiples formatos."

### "¿Y si necesitamos SSR?"
> "Reconsidera si realmente lo necesitas. Si es crítico, crea un proyecto separado con Next.js que consuma la librería."

### "¿Webpack?"
> "No. Vite usa esbuild/Rollup internamente. Es más rápido."

---

## 📊 MÉTRICAS DE SALUD

✅ **Arquitectura saludable**:
- `vite.config.ts` presente
- `rollup.config.js` en package
- No hay archivos `next.*` o `_next/`
- Build < 30 segundos
- HMR < 500ms

❌ **Arquitectura comprometida**:
- Archivos de Next.js presentes
- Imports desde `dist/`
- Dependencias mezcladas
- Build > 1 minuto
- Errores de tipos entre app y lib

---

## 🎯 MANTRA DEL GUARDIÁN

> "Vite para demos, Rollup para librerías.
> Nunca mezclar, siempre separar.
> La simplicidad es la sofisticación suprema."

---

**FIN DEL AGENTE GUARDIÁN v1.0**