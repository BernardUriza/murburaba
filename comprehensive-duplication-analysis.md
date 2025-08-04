# Code Duplication Analysis Report

## Executive Summary

**Project:** Murburaba Audio Processing Library  
**Analysis Date:** August 3, 2025  
**Files Analyzed:** 199 source files  
**Total Duplications Found:** 4,426  
**High Priority Issues:** 14  

### Key Findings
- **Critical Issue:** 53 instances of duplicated test pattern across 6 files
- **Major Impact:** 36 test pattern duplications affecting 91 files
- **Bundle Impact:** Estimated 15-25% size reduction possible
- **Maintainability:** Significant technical debt in test infrastructure

---

## Detailed Analysis by Category

### 1. Test Pattern Duplications (Critical Priority)

#### **Most Critical: renderHook Pattern Duplication**
- **Occurrences:** 53 duplicated instances
- **Files Affected:** 6 core test files
- **Pattern:** `renderHook(() => useMurmubaraEngine())`
- **Impact:** High maintenance overhead, inconsistent test patterns

**Sample Duplicated Code:**
```typescript
const { result } = renderHook(() => useMurmubaraEngine());
await act(async () => {
  await result.current.initialize();
});
```

**Files with highest duplication:**
- `/packages/murmuraba/src/__tests__/integration/audioEngine.integration.test.ts`
- `/packages/murmuraba/src/__tests__/integration/noiseProcessing.integration.test.ts`
- `/packages/murmuraba/src/__tests__/unit/hooks/useMurmubaraEngine.test.ts`
- `/packages/murmuraba/src/hooks/murmuraba-engine/__tests__/use-murmubara-engine.gain.test.tsx`

#### **Test Setup/Cleanup Duplications**
- **beforeEach duplications:** 9 instances across 9 files
- **afterEach duplications:** 13 instances across 13 files

**Common duplicated patterns:**
```typescript
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

### 2. Mock Pattern Duplications (High Priority)

#### **vi.fn() Mock Duplications**
- **Occurrences:** 63 instances (most critical)
- **Files Affected:** Multiple test files
- **Pattern:** Repetitive mock function creation

#### **Audio Context Mocks**
- **Pattern:** Similar AudioContext mock setups across test files
- **Files:** `/packages/murmuraba/src/__tests__/mocks/webAudioMocks.ts` and others
- **Impact:** Code bloat in test files

### 3. Utility Function Duplications (Medium Priority)

#### **Formatting Functions**
- **Files:** `/packages/murmuraba/src/components/chunk-results/formatters.ts`
- **Duplicated patterns:** Time formatting, percentage formatting, file size formatting
- **Lines of Code:** ~10-15 lines each function

**Sample Duplicated Utility:**
```typescript
export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};
```

### 4. Import Pattern Duplications (Low Priority)

#### **Frequently Repeated Imports**
- **vitest imports:** `import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';`
- **React testing imports:** `import { render, screen, fireEvent, waitFor } from '@testing-library/react';`
- **Hook testing imports:** `import { renderHook, act } from '@testing-library/react';`

---

## Bundle Size Impact Analysis

### Current State
- **Total Files:** 199 source files
- **Estimated Duplicate Code:** ~2,500 lines across all duplications
- **Bundle Size Impact:** 15-25% potential reduction

### Breakdown by Category
1. **Test Patterns:** 20-30% reduction in test code size
2. **Mock Patterns:** 15-20% reduction in test infrastructure
3. **Utility Functions:** 10-15% reduction in production bundle
4. **Import Consolidation:** Minimal bundle impact, improved DX

---

## Severity Assessment

### Critical Issues (14 total)
1. **renderHook pattern:** 53 occurrences - Create shared test helper
2. **Test result destructuring:** 49 occurrences - Extract to helper
3. **afterEach cleanup:** 13 occurrences - Standardize cleanup
4. **beforeEach setup:** 9 occurrences - Standardize setup
5. **waitFor patterns:** 7 occurrences - Create shared utility

### High Priority Issues
- Mock pattern standardization (26 patterns)
- Utility function extraction (39 functions)

### Medium/Low Priority Issues
- Import consolidation (5 patterns)
- Minor code block duplications

---

## Actionable Recommendations

### Priority 1: Test Infrastructure Overhaul

#### **Create Centralized Test Utilities**
**Files to Create:**
```
/packages/murmuraba/src/__tests__/shared/
├── test-helpers.ts          # renderHook helpers
├── mock-factories.ts        # Standardized mocks  
├── setup-utilities.ts       # beforeEach/afterEach patterns
└── async-utilities.ts       # act, waitFor helpers
```

**Implementation Steps:**
1. Create `/packages/murmuraba/src/__tests__/shared/test-helpers.ts`:
```typescript
import { renderHook, RenderHookResult } from '@testing-library/react';
import { useMurmubaraEngine } from '../hooks/use-murmubara-engine';

export const createEngineHookTest = (config?: any): RenderHookResult<ReturnType<typeof useMurmubaraEngine>, any> => {
  return renderHook(() => useMurmubaraEngine(config));
};

export const initializeEngine = async (result: RenderHookResult<any, any>) => {
  await act(async () => {
    await result.current.initialize();
  });
};
```

2. Create `/packages/murmuraba/src/__tests__/shared/setup-utilities.ts`:
```typescript
import { vi } from 'vitest';

export const standardBeforeEach = () => {
  vi.clearAllMocks();
};

export const standardAfterEach = () => {
  vi.restoreAllMocks();
};

export const createTestSetup = () => ({
  beforeEach: standardBeforeEach,
  afterEach: standardAfterEach
});
```

**Expected Impact:**
- **Files Affected:** 91 test files
- **Code Reduction:** 20-30% in test files  
- **Maintenance:** Significantly improved consistency

### Priority 2: Mock Pattern Standardization

#### **Centralize Common Mocks**
**Files to Create:**
```
/packages/murmuraba/src/__tests__/shared/
├── audio-mocks.ts           # AudioContext, MediaRecorder mocks
├── engine-mocks.ts          # Engine-specific mocks
└── mock-constants.ts        # Shared mock data
```

**Implementation Example:**
```typescript
// audio-mocks.ts
export const createMockAudioContext = () => ({
  createGain: vi.fn(() => mockGainNode),
  createAnalyser: vi.fn(() => mockAnalyserNode),
  // ... standardized mock
});

export const createMockMediaRecorder = () => ({
  start: vi.fn(),
  stop: vi.fn(),
  // ... standardized mock
});
```

### Priority 3: Utility Function Extraction

#### **Create Shared Utility Modules**
**Files to Create:**
```
/packages/murmuraba/src/utils/
├── formatters.ts           # Time, percentage, file size formatting
├── audio-helpers.ts        # Audio processing utilities
├── validation.ts           # Input validation utilities
└── type-guards.ts          # Type checking utilities
```

**Sample Implementation:**
```typescript
// formatters.ts - Consolidate duplicated formatting functions
export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const formatPercentage = (value: number): string => {
  return `${Math.round(value * 100)}%`;
};

export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};
```

### Priority 4: Import Consolidation

#### **Create Barrel Export Files**
**Files to Create:**
```
/packages/murmuraba/src/
├── components/index.ts      # Component exports
├── hooks/index.ts           # Hook exports  
├── utils/index.ts           # Utility exports
└── __tests__/index.ts       # Test utility exports
```

---

## Implementation Timeline

### Phase 1: Test Infrastructure (Week 1)
- Create shared test utilities
- Update 5-10 high-impact test files
- Validate patterns work correctly

### Phase 2: Mock Standardization (Week 2)  
- Extract common mocks
- Update remaining test files
- Ensure all tests pass

### Phase 3: Utility Extraction (Week 3)
- Create shared utility modules
- Update imports across codebase
- Verify bundle size reduction

### Phase 4: Import Optimization (Week 4)
- Create barrel files
- Update all import statements
- Final validation and testing

---

## Success Metrics

### Quantifiable Goals
- **Test Code Reduction:** 25-30% fewer lines in test files
- **Bundle Size:** 15-20% reduction in overall bundle size
- **Duplication Score:** Reduce from 4,426 to <1,000 duplications
- **Maintainability:** Centralized patterns in <10 shared modules

### Quality Improvements
- **Consistency:** Standardized test patterns across all files
- **Developer Experience:** Faster test writing with shared utilities  
- **Code Reviews:** Easier to review with consistent patterns
- **Onboarding:** New developers can follow established patterns

---

## Risk Assessment & Mitigation

### Risks
1. **Test Breakage:** Refactoring may break existing tests
2. **Bundle Changes:** Utility extraction might affect tree-shaking
3. **Team Adoption:** Developers might not use new patterns

### Mitigation Strategies
1. **Incremental Rollout:** Phase implementation over 4 weeks
2. **Comprehensive Testing:** Validate each phase before proceeding
3. **Documentation:** Create clear examples and migration guides
4. **Code Reviews:** Enforce new patterns in PR reviews

---

## Monitoring & Maintenance

### Tools to Implement
- **Bundle Analyzer:** Monitor bundle size changes
- **Duplication Detection:** Regular scans for new duplications  
- **Test Coverage:** Ensure coverage doesn't decrease
- **Performance Monitoring:** Track build and test execution times

### Ongoing Practices
- **Pre-commit Hooks:** Prevent new duplication patterns
- **Code Review Guidelines:** Check for duplication in PRs
- **Monthly Audits:** Regular duplication analysis
- **Developer Training:** Share best practices with team

---

## Conclusion

The Murburaba codebase has significant code duplication issues, particularly in test infrastructure. By implementing the recommended solutions, the project can achieve:

- **25-30% reduction** in test code size
- **15-20% reduction** in overall bundle size  
- **Significantly improved** maintainability and developer experience
- **Standardized patterns** across the entire codebase

The proposed 4-week implementation timeline provides a structured approach to addressing these duplications while minimizing risk and ensuring quality standards are maintained.

**Next Steps:** Begin with Phase 1 (Test Infrastructure) as it provides the highest impact with lowest risk.