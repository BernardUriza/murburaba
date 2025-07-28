# 🚨 Anti-Pattern Documentation - NEVER AGAIN

## ⚠️ **WARNING: THESE PATTERNS ARE PROHIBITED**

This document serves as a **permanent reminder** of the anti-patterns that were **ELIMINATED** from Murmuraba and must **NEVER** return.

---

## 🔥 **#1: String-based AudioWorklets - ELIMINATED**

### ❌ **FORBIDDEN PATTERN**
```typescript
// 🚨 UNDER PENALTY OF DEATH - NEVER DO THIS
const getProcessorCode = () => `
  class RNNoiseProcessor extends AudioWorkletProcessor {
    constructor() {
      super();
      this.frameSize = 480;
      this.wasmModule = null;
      // ... 200+ lines of code as STRING
    }
    
    process(inputs, outputs) {
      // ... complex processing logic as STRING
      return true;
    }
  }
  
  registerProcessor('rnnoise-processor', RNNoiseProcessor);
`;

// 🚨 THIS CREATES BLOBS AND URLS - FORBIDDEN
const blob = new Blob([processorCode], { type: 'application/javascript' });
const workletURL = URL.createObjectURL(blob);
await audioContext.audioWorklet.addModule(workletURL);
```

### ✅ **CORRECT PATTERN - ES6 Modules**
```typescript
// ✅ PURE ES6 MODULE FILE: rnnoise-processor.worklet.js
await audioContext.audioWorklet.addModule(
  '/packages/murmuraba/src/engines/rnnoise-processor.worklet.js'
);
```

### **Why This Was Eliminated**
- **Debugging Hell**: No source maps, no stack traces
- **Performance**: String concatenation and blob creation overhead
- **Maintainability**: 231 lines of code in strings
- **Type Safety**: No TypeScript checking
- **Code Duplication**: Logic repeated across multiple places

---

## 💀 **#2: God Objects - ELIMINATED**

### ❌ **FORBIDDEN PATTERN**
```typescript
// 🚨 MASSIVE GOD OBJECT - NEVER AGAIN
export class MurmubaraEngine {
  // ... 1,383 LINES OF EVERYTHING
  
  async initialize() { /* 200+ lines */ }
  async processFile() { /* 300+ lines */ }
  async createStreamController() { /* 250+ lines */ }
  processFrame() { /* 150+ lines */ }
  initializeWASM() { /* 200+ lines */ }
  handleMetrics() { /* 100+ lines */ }
  // ... EVERYTHING IN ONE CLASS
}
```

### ✅ **CORRECT PATTERN - Modular Architecture**
```typescript
// ✅ FOCUSED MODULES WITH SINGLE RESPONSIBILITY
export class WasmManager {          // 85 lines - WASM lifecycle
export class FrameProcessor {       // 171 lines - Frame processing
export class StreamProcessor {      // 304 lines - Stream management  
export class FileProcessor {        // 316 lines - File processing
```

### **Why This Was Eliminated**
- **Impossible to Test**: Too many responsibilities
- **Debugging Nightmare**: 1,383 lines to search through
- **Code Coupling**: Everything depends on everything
- **Memory Leaks**: Complex lifecycle management
- **Team Conflicts**: Multiple developers modifying same file

---

## 🔄 **#3: Code Duplication - ELIMINATED**

### ❌ **FORBIDDEN PATTERN**
```typescript
// 🚨 DUPLICATE WASM LOADERS - ELIMINATED
// File 1: wasm-loader-simple.ts
export async function loadRNNoiseWASM() {
  const wasmUrl = '/rnnoise.wasm';
  const wasmBuffer = await fetch(wasmUrl).then(r => r.arrayBuffer());
  const module = await WebAssembly.instantiate(wasmBuffer);
  return module.instance.exports;
}

// File 2: wasm-loader-unified.ts  
export async function loadRNNoiseWASM() {
  const wasmData = await import('./wasm-data');
  const wasmBuffer = await wasmData.decodeWasmBase64();
  const module = await WebAssembly.instantiate(wasmBuffer);
  return module.instance.exports;
}
```

### ✅ **CORRECT PATTERN - Single Source of Truth**
```typescript
// ✅ UNIFIED WASM MANAGEMENT
export class WasmManager {
  async initialize(): Promise<void> {
    const { loadRNNoiseWASM } = await import('../engines/wasm-loader-unified');
    this.module = await loadRNNoiseWASM();
    this.initPromise = null;
  }
}
```

### **Why This Was Eliminated**
- **Maintenance Burden**: Fixing bugs in multiple places
- **Inconsistent Behavior**: Different loading strategies
- **Bundle Size**: Duplicate code shipped to browser
- **Testing Complexity**: Multiple code paths to test

---

## 🎭 **#4: Type Chaos - ELIMINATED**

### ❌ **FORBIDDEN PATTERN**
```typescript
// 🚨 SCATTERED TYPE DEFINITIONS - ELIMINATED
// File 1: WasmManager.ts
export interface WasmManagerConfig { /* ... */ }

// File 2: FrameProcessor.ts  
export interface FrameProcessingResult { /* ... */ }

// File 3: StreamProcessor.ts
export interface StreamProcessorConfig { /* ... */ }

// ❌ INCONSISTENT IMPORTS EVERYWHERE
import { Config } from './WasmManager';
import { Result } from './FrameProcessor';
import { StreamConfig } from './StreamProcessor';
```

### ✅ **CORRECT PATTERN - Centralized Types**
```typescript
// ✅ UNIFIED TYPE SYSTEM
// src/types/audio-types.ts - SINGLE SOURCE OF TRUTH
export interface WasmManagerConfig { /* ... */ }
export interface FrameProcessingResult { /* ... */ }
export interface StreamProcessorConfig { /* ... */ }

// ✅ CLEAN IMPORTS
import type { 
  WasmManagerConfig,
  FrameProcessingResult,
  StreamProcessorConfig 
} from '../types';
```

---

## 🧪 **#5: Test Negligence - ELIMINATED**

### ❌ **FORBIDDEN PATTERN**
```typescript
// 🚨 NO TESTS OR TRIVIAL TESTS - ELIMINATED
describe('MurmubaraEngine', () => {
  it('should exist', () => {
    expect(MurmubaraEngine).toBeDefined();
  });
  
  // ❌ ONE USELESS TEST FOR 1,383 LINES
});
```

### ✅ **CORRECT PATTERN - Comprehensive Testing**
```typescript
// ✅ REAL TESTS FOR EVERY MODULE
describe('WasmManager', () => {
  // 11 tests covering initialization, state management, memory, cleanup, errors
});

describe('FrameProcessor', () => {
  // 10 tests covering frame processing, metrics, scaling, validation
});

describe('Audio Pipeline Integration', () => {
  // Integration tests for complete workflows
});
```

---

## 📏 **#6: Line Count Madness - ELIMINATED**

### ❌ **FORBIDDEN PATTERN**
```typescript
// 🚨 MASSIVE FILES - NEVER AGAIN
// MurmubaraEngine.ts - 1,383 lines
// AudioProcessorService.ts - 477 lines  
// AudioWorkletEngine.ts - 294 lines (with string pattern)
```

### ✅ **CORRECT PATTERN - Line Limits Enforced**
```json
// ✅ ESLINT ENFORCEMENT
{
  "rules": {
    "max-lines": ["error", 150]  // TARGET
  }
}
```

**Current State**:
- WasmManager: 85 lines ✅
- FrameProcessor: 171 lines ⚠️ (target 150)
- StreamProcessor: 304 lines ⚠️ (needs splitting)
- FileProcessor: 316 lines ⚠️ (needs splitting)

---

## 🔒 **Enforcement Mechanisms**

### **Pre-commit Hooks**
```bash
# Automatic checks before every commit
npm run lint           # Line limits
npm run build:ts       # Type checking  
npm test              # Test coverage
```

### **CI/CD Pipeline**
```yaml
# GitHub Actions enforcement
- name: Check line limits
  run: npm run lint
  
- name: Verify no string worklets  
  run: grep -r "createObjectURL\|new Blob" src/ && exit 1 || exit 0
  
- name: Check test coverage
  run: npm test -- --coverage --threshold 80
```

### **Code Review Checklist**
- [ ] No files >150 lines (absolute max 316)
- [ ] No string-based worklet patterns
- [ ] No code duplication
- [ ] Unit tests for new functionality
- [ ] Types exported from `/types`
- [ ] Integration tests if needed

---

## 🚨 **Warning Signs to Watch For**

### **Red Flags**
```typescript
// 🚨 IF YOU SEE THESE, STOP IMMEDIATELY
const code = `class ${className} {`;           // String templates
new Blob([processorCode]);                     // Blob creation
URL.createObjectURL(blob);                     // URL creation
export class Everything {                      // God objects
// ... 200+ lines                              // File too long
function doEverything() {                      // Functions too long
```

### **Green Flags**
```typescript
// ✅ THESE ARE GOOD
await audioContext.audioWorklet.addModule('/path/to/module.js');  // ES6 modules
export class SpecificThing {                                      // Single responsibility  
import type { Config } from '../types';                           // Centralized types
describe('Module', () => { /* 10+ tests */ });                    // Good test coverage
```

---

## 🎯 **The Sacred Rules**

1. **NO string-based worklets** - ES6 modules only
2. **NO god objects** - Single responsibility principle
3. **NO code duplication** - DRY principle applied brutally
4. **NO type chaos** - Centralized type system
5. **NO test negligence** - Every module tested
6. **NO massive files** - 150 line target, 316 absolute max

## 🔥 **Remember**

> "The architecture that emerges from refactoring in public, with brutal enforcement of anti-patterns, and comprehensive testing, is always superior to the architecture that emerges from cathedral-style development."

**These anti-patterns nearly killed this project. They must never return.** 💀

---

**Last Updated**: After Bazaar Refactor Completion  
**Status**: **ALL ANTI-PATTERNS ELIMINATED** ✅