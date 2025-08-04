# Test Suite Duplication Analysis Report

## Executive Summary
After analyzing the test suite, I've identified significant duplication across multiple test files. The main areas of concern are:
1. **AudioContext and Web Audio API mocking** - duplicated across 9+ files
2. **Console mocking** - repeated in 10+ files with slight variations
3. **Test data creation** - chunk creation and mock props scattered across files
4. **Setup/teardown patterns** - similar beforeEach/afterEach blocks
5. **Mock implementations** - WASM and RNNoise mocks repeated

## Detailed Findings

### 1. AudioContext Mocking Duplication

**Problem**: Each test file creates its own AudioContext mock with similar but slightly different implementations.

**Files affected**:
- `/packages/murmuraba/src/__tests__/engines/AudioWorkletEngine.test.ts`
- `/packages/murmuraba/src/__tests__/core/MurmubaraEngine.test.ts`
- `/packages/murmuraba/src/__tests__/hooks/useAudioEngine.test.ts`
- 6+ other test files

**Example of duplication**:
```typescript
// File 1: AudioWorkletEngine.test.ts
const mockAudioContext = {
  audioWorklet: { addModule: vi.fn() }
};

// File 2: useAudioEngine.test.ts  
mockAudioContext = {
  state: 'running',
  sampleRate: 48000,
  createScriptProcessor: vi.fn(),
  // ... similar properties
};

// File 3: MurmubaraEngine.test.ts
const mockAudioContext = {
  currentTime: 0,
  sampleRate: 48000,
  // ... again similar properties
};
```

### 2. Console Mocking Duplication

**Problem**: Console methods are mocked differently across files, leading to inconsistent test output.

**Files affected**: 10+ test files

**Variations found**:
```typescript
// Pattern 1: Simple mocking
vi.spyOn(console, 'log').mockImplementation();

// Pattern 2: With storage
consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();

// Pattern 3: Multiple methods
beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation();
  vi.spyOn(console, 'log').mockImplementation();
  vi.spyOn(console, 'error').mockImplementation();
});
```

### 3. Test Data Creation Duplication

**Problem**: Similar test data creation functions repeated across component tests.

**Files affected**:
- ChunkProcessingResults.test.tsx
- ChunkHeader.test.tsx
- integration.test.tsx

**Example**:
```typescript
// Repeated in multiple files:
const createChunkWithVAD = (id: string, averageVad: number): ProcessedChunk => ({
  id,
  startTime: Date.now() - 10000,
  endTime: Date.now(),
  // ... same structure repeated
});
```

### 4. WASM/RNNoise Mock Duplication

**Problem**: WASM module mocks are defined in both setup file and individual tests.

**Files affected**:
- vitest.setup.ts
- RNNoiseEngine.test.ts
- MurmubaraEngine.test.ts

### 5. Setup/Teardown Pattern Duplication

**Problem**: Similar beforeEach/afterEach patterns with mock clearing and restoration.

## Recommendations

### 1. Create Centralized Test Utilities Module

**File**: `/packages/murmuraba/src/__tests__/utils/test-utils.ts`

```typescript
// Centralized test utilities
export * from './audio-context-utils';
export * from './console-utils';
export * from './chunk-utils';
export * from './mock-factories';
export * from './custom-matchers';
```

### 2. Audio Context Test Utilities

**File**: `/packages/murmuraba/src/__tests__/utils/audio-context-utils.ts`

```typescript
import { vi } from 'vitest';

export interface AudioContextMockOptions {
  state?: AudioContextState;
  sampleRate?: number;
  includeWorklet?: boolean;
  includeAnalyser?: boolean;
}

export function createMockAudioContext(options: AudioContextMockOptions = {}) {
  const {
    state = 'running',
    sampleRate = 48000,
    includeWorklet = false,
    includeAnalyser = false
  } = options;

  const base = {
    state,
    sampleRate,
    currentTime: 0,
    destination: {},
    createGain: vi.fn(() => createMockGainNode()),
    createScriptProcessor: vi.fn(() => createMockScriptProcessor()),
    createMediaStreamSource: vi.fn(() => createMockMediaStreamSource()),
    close: vi.fn().mockResolvedValue(undefined),
    suspend: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
  };

  if (includeWorklet) {
    base.audioWorklet = {
      addModule: vi.fn().mockResolvedValue(undefined)
    };
  }

  if (includeAnalyser) {
    base.createAnalyser = vi.fn(() => createMockAnalyserNode());
  }

  return base;
}

export function setupAudioContextMock(options?: AudioContextMockOptions) {
  const mock = createMockAudioContext(options);
  global.AudioContext = vi.fn(() => mock);
  return mock;
}
```

### 3. Console Mocking Utilities

**File**: `/packages/murmuraba/src/__tests__/utils/console-utils.ts`

```typescript
import { vi, SpyInstance } from 'vitest';

export interface ConsoleMocks {
  log: SpyInstance;
  error: SpyInstance;
  warn: SpyInstance;
  info: SpyInstance;
  debug: SpyInstance;
}

export function mockConsole(options = { silent: true }): ConsoleMocks {
  const mocks = {
    log: vi.spyOn(console, 'log'),
    error: vi.spyOn(console, 'error'),
    warn: vi.spyOn(console, 'warn'),
    info: vi.spyOn(console, 'info'),
    debug: vi.spyOn(console, 'debug'),
  };

  if (options.silent) {
    Object.values(mocks).forEach(mock => mock.mockImplementation());
  }

  return mocks;
}

export function restoreConsole(mocks: ConsoleMocks) {
  Object.values(mocks).forEach(mock => mock.mockRestore());
}

// Usage helper for beforeEach/afterEach
export function useConsoleMocks(options = { silent: true }) {
  let mocks: ConsoleMocks;

  beforeEach(() => {
    mocks = mockConsole(options);
  });

  afterEach(() => {
    restoreConsole(mocks);
  });

  return () => mocks;
}
```

### 4. Test Data Factories

**File**: `/packages/murmuraba/src/__tests__/utils/factories.ts`

```typescript
import { ProcessedChunk, VADData } from '../../types';

export class ChunkFactory {
  static create(overrides: Partial<ProcessedChunk> = {}): ProcessedChunk {
    const now = Date.now();
    return {
      id: `chunk-${Math.random()}`,
      startTime: now - 10000,
      endTime: now,
      duration: 10000,
      originalSize: 1024000,
      processedSize: 950000,
      noiseRemoved: 74000,
      averageVad: 0.5,
      vadData: this.createVADData(),
      metrics: this.createMetrics(),
      isPlaying: false,
      isExpanded: false,
      isValid: true,
      ...overrides
    };
  }

  static createWithVAD(averageVad: number, id?: string): ProcessedChunk {
    return this.create({ 
      id: id || `chunk-vad-${averageVad}`,
      averageVad,
      vadData: this.createVADData(averageVad)
    });
  }

  static createVADData(average = 0.5): VADData[] {
    return Array.from({ length: 5 }, (_, i) => ({
      time: i,
      vad: average + (Math.random() - 0.5) * 0.3
    }));
  }

  static createMetrics() {
    return {
      processingLatency: 45.2,
      frameCount: 100,
      inputLevel: 0.8,
      outputLevel: 0.7,
      noiseReductionLevel: 0.755,
      timestamp: Date.now(),
      droppedFrames: 0
    };
  }

  static createBatch(count: number): ProcessedChunk[] {
    return Array.from({ length: count }, (_, i) => 
      this.create({ id: `chunk-${i}` })
    );
  }
}

export class MediaStreamFactory {
  static create(options: { audio?: boolean; video?: boolean } = { audio: true }) {
    const tracks = [];
    
    if (options.audio) {
      tracks.push(this.createAudioTrack());
    }
    
    if (options.video) {
      tracks.push(this.createVideoTrack());
    }

    return {
      id: `stream-${Math.random()}`,
      active: true,
      getTracks: vi.fn(() => tracks),
      getAudioTracks: vi.fn(() => tracks.filter(t => t.kind === 'audio')),
      getVideoTracks: vi.fn(() => tracks.filter(t => t.kind === 'video')),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
  }

  static createAudioTrack() {
    return {
      kind: 'audio' as const,
      id: `track-${Math.random()}`,
      label: 'Mock Audio Track',
      enabled: true,
      muted: false,
      readyState: 'live' as MediaStreamTrackState,
      stop: vi.fn(),
      clone: vi.fn(),
    };
  }

  static createVideoTrack() {
    return {
      kind: 'video' as const,
      id: `track-${Math.random()}`,
      label: 'Mock Video Track',
      enabled: true,
      muted: false,
      readyState: 'live' as MediaStreamTrackState,
      stop: vi.fn(),
      clone: vi.fn(),
    };
  }
}
```

### 5. Custom Testing Matchers

**File**: `/packages/murmuraba/src/__tests__/utils/custom-matchers.ts`

```typescript
import { expect } from 'vitest';

declare module 'vitest' {
  interface Assertion<T = any> {
    toBeValidChunk(): void;
    toBeValidAudioContext(): void;
    toHaveBeenCalledWithChunk(chunk: any): void;
    toBeWithinRange(min: number, max: number): void;
  }
}

export function setupCustomMatchers() {
  expect.extend({
    toBeValidChunk(received: any) {
      const pass = 
        received &&
        typeof received.id === 'string' &&
        typeof received.startTime === 'number' &&
        typeof received.endTime === 'number' &&
        received.endTime > received.startTime;
      
      return {
        pass,
        message: () => 
          pass
            ? `expected ${received} not to be a valid chunk`
            : `expected ${received} to be a valid chunk with required properties`,
      };
    },

    toBeValidAudioContext(received: any) {
      const pass = 
        received &&
        typeof received.sampleRate === 'number' &&
        typeof received.currentTime === 'number' &&
        typeof received.state === 'string';
      
      return {
        pass,
        message: () => 
          pass
            ? `expected ${received} not to be a valid AudioContext`
            : `expected ${received} to be a valid AudioContext with required properties`,
      };
    },

    toBeWithinRange(received: number, min: number, max: number) {
      const pass = received >= min && received <= max;
      
      return {
        pass,
        message: () => 
          pass
            ? `expected ${received} not to be within range [${min}, ${max}]`
            : `expected ${received} to be within range [${min}, ${max}]`,
      };
    },
  });
}
```

### 6. Shared Test Setup Helper

**File**: `/packages/murmuraba/src/__tests__/utils/setup-helpers.ts`

```typescript
import { vi } from 'vitest';
import { setupAudioContextMock } from './audio-context-utils';
import { useConsoleMocks } from './console-utils';
import { setupCustomMatchers } from './custom-matchers';

export interface TestEnvironment {
  audioContext: any;
  consoleMocks: any;
  cleanup: () => void;
}

export function setupTestEnvironment(options = {}): TestEnvironment {
  // Setup custom matchers once
  setupCustomMatchers();

  // Setup console mocks
  const getConsoleMocks = useConsoleMocks();

  // Setup AudioContext
  const audioContext = setupAudioContextMock(options);

  // Setup WASM mocks
  setupWASMMocks();

  return {
    audioContext,
    consoleMocks: getConsoleMocks(),
    cleanup: () => {
      vi.clearAllMocks();
      vi.restoreAllMocks();
    }
  };
}

function setupWASMMocks() {
  const mockWasmModule = {
    _rnnoise_create: vi.fn().mockReturnValue(123),
    _rnnoise_destroy: vi.fn(),
    _rnnoise_process_frame: vi.fn().mockReturnValue(1),
    _malloc: vi.fn().mockReturnValue(1000),
    _free: vi.fn(),
    HEAPF32: new Float32Array(10000),
    HEAP32: new Int32Array(10000)
  };

  vi.mock('../../utils/rnnoise-loader', () => ({
    loadRNNoiseModule: vi.fn().mockResolvedValue(mockWasmModule)
  }));

  return mockWasmModule;
}
```

### 7. Component Test Utilities

**File**: `/packages/murmuraba/src/__tests__/utils/react-test-utils.tsx`

```typescript
import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';

// Custom render with providers
export function renderWithProviders(
  ui: React.ReactElement,
  options?: RenderOptions
) {
  // Add any providers here
  const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>;
  };

  return render(ui, { wrapper: AllTheProviders, ...options });
}

// Common component props factory
export function createComponentProps<T>(defaults: T) {
  return (overrides: Partial<T> = {}): T => ({
    ...defaults,
    ...overrides
  });
}

// Example usage:
export const createChunkResultsProps = createComponentProps({
  chunks: [],
  averageNoiseReduction: 0,
  selectedChunk: null,
  onTogglePlayback: vi.fn(),
  onToggleExpansion: vi.fn(),
  onClearAll: vi.fn(),
  onExportWav: vi.fn(),
  onExportMp3: vi.fn(),
  onDownloadChunk: vi.fn()
});
```

## Implementation Strategy

### Phase 1: Create Core Utilities (Week 1)
1. Create test-utils directory structure
2. Implement audio-context-utils.ts
3. Implement console-utils.ts
4. Implement factories.ts

### Phase 2: Refactor High-Impact Tests (Week 2)
1. Update MurmubaraEngine.test.ts
2. Update AudioWorkletEngine tests
3. Update useAudioEngine.test.ts
4. Update component tests

### Phase 3: Documentation & Standards (Week 3)
1. Create testing guidelines document
2. Add examples for common patterns
3. Set up linting rules for test files
4. Create test templates

## Benefits of This Approach

### 1. **Reduced Duplication** (Est. 40% reduction in test code)
- Single source of truth for mocks
- Reusable factories and utilities
- Consistent setup/teardown patterns

### 2. **Improved Maintainability**
- Changes to mocks only need to be made in one place
- Easier to update when APIs change
- Clear separation of concerns

### 3. **Better Test Quality**
- Consistent mocking behavior across tests
- More time to focus on actual test logic
- Reduced chance of mock-related bugs

### 4. **Faster Development**
- Quick test setup with utilities
- Copy-paste friendly patterns
- Less boilerplate code

### 5. **Enhanced Readability**
- Tests focus on behavior, not setup
- Clear intent with named utilities
- Consistent patterns across codebase

## Migration Checklist

- [ ] Create `/packages/murmuraba/src/__tests__/utils/` directory
- [ ] Implement audio-context-utils.ts
- [ ] Implement console-utils.ts
- [ ] Implement factories.ts
- [ ] Implement custom-matchers.ts
- [ ] Implement setup-helpers.ts
- [ ] Implement react-test-utils.tsx
- [ ] Update vitest.setup.ts to use new utilities
- [ ] Refactor AudioWorkletEngine tests
- [ ] Refactor RNNoiseEngine tests
- [ ] Refactor MurmubaraEngine tests
- [ ] Refactor hook tests
- [ ] Refactor component tests
- [ ] Create testing best practices document
- [ ] Add test utility usage examples
- [ ] Set up ESLint rules for test patterns

## Example: Refactored Test

### Before:
```typescript
describe('AudioWorkletEngine', () => {
  let originalAudioContext: any;
  
  beforeEach(() => {
    originalAudioContext = (global as any).AudioContext;
    const mockAudioContext = {
      audioWorklet: { addModule: vi.fn() }
    };
    (global as any).AudioContext = vi.fn(() => mockAudioContext);
  });

  afterEach(() => {
    (global as any).AudioContext = originalAudioContext;
  });

  // ... tests
});
```

### After:
```typescript
import { setupTestEnvironment } from '@tests/utils';

describe('AudioWorkletEngine', () => {
  const env = setupTestEnvironment({ includeWorklet: true });

  afterEach(() => env.cleanup());

  // ... tests focus on behavior, not setup
});
```

## Metrics to Track

1. **Lines of test code**: Target 40% reduction
2. **Test execution time**: Should remain stable or improve
3. **Test failures due to mocks**: Should decrease significantly
4. **Time to write new tests**: Should decrease by 50%
5. **Code coverage**: Should remain at 80%+

## Conclusion

The current test suite has significant duplication that impacts maintainability and development speed. By implementing these centralized utilities and patterns, we can:

- Reduce test code by approximately 40%
- Improve consistency across all tests
- Make tests more maintainable
- Speed up new test development
- Focus on testing behavior rather than setup

The investment in creating these utilities will pay off immediately and continue to provide value as the codebase grows.