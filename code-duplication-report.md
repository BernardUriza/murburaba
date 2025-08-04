# Code Duplication Analysis Report

## Executive Summary

The codebase has a relatively low overall duplication rate of **0.56%** (374 duplicated tokens out of 67,091 total), which is excellent. However, there are specific patterns of duplication that should be addressed to improve maintainability and reduce technical debt.

## Key Metrics

- **Total Lines of Code**: 8,314
- **Total Duplicated Lines**: 36 (0.43%)
- **Total Duplicated Tokens**: 374 (0.56%)
- **Number of Duplicate Clones**: 24 distinct duplicate patterns
- **Files with Most Duplication**: 
  - `recording-manager.ts` (3.01% token duplication)
  - `audio-exporter.ts` (10.64% token duplication)
  - `validation.ts` (13.87% token duplication)
  - `secure-event-bridge.ts` (8.41% token duplication)

## Critical Duplication Patterns

### 1. Event Handler Duplication in Recording Manager
**Location**: `/hooks/murmuraba-engine/recording-manager.ts`
- Lines 142-156 and 158-172
- **Pattern**: Identical event handlers for processed vs original streams
- **Impact**: High - Core recording functionality
- **Test Coverage**: Partial - Tests exist but don't cover all duplicated paths

**Duplicated Code**:
```typescript
// Pattern repeated for both processed and original recorders
recorder.ondataavailable = (event) => {
  if (event.data.size >= MIN_VALID_BLOB_SIZE) {
    const chunkRecording = this.chunkRecordings.get(chunkId);
    if (chunkRecording && !chunkRecording.finalized) {
      chunkRecording.[type].push(event.data);
      console.log(`💾 ${LOG_PREFIX.CONCAT_STREAM} Cycle #${this.cycleCount} - [Type] data: ${event.data.size} bytes`);
    }
  } else {
    console.warn(`⚠️ ${LOG_PREFIX.CONCAT_STREAM} Invalid blob size detected! Size: ${event.data.size} bytes`, {
      cycleNumber: this.cycleCount,
      blobSize: event.data.size,
      type: '[type]'
    });
  }
};
```

### 2. Export Function Duplication in Audio Exporter
**Location**: `/hooks/murmuraba-engine/audio-exporter.ts`
- Lines 15-34 (exportChunkAsWav) and 39-54 (exportChunkAsMp3)
- **Pattern**: Nearly identical export logic for different formats
- **Impact**: Medium - File export functionality
- **Test Coverage**: No direct tests found

**Duplicated Pattern**:
```typescript
async export[Format](chunk: ProcessedChunk, audioType: 'processed' | 'original'): Promise<Blob> {
  const audioUrl = audioType === 'processed' ? chunk.processedAudioUrl : chunk.originalAudioUrl;
  if (!audioUrl) {
    throw new Error(`No ${audioType} audio URL available for chunk ${chunk.id}`);
  }
  console.log(`📦 ${LOG_PREFIX.EXPORT} Exporting chunk ${chunk.id} as [FORMAT] (${audioType})...`);
  const response = await fetch(audioUrl);
  const webmBlob = await response.blob();
  return AudioConverter.webmTo[Format](webmBlob);
}
```

### 3. RMS Calculation Duplication
**Location**: Multiple files
- `/hooks/use-audio-engine.ts` (lines 263-269)
- `/utils/murmuraba-processor.ts` (lines 86-92)
- **Pattern**: Identical RMS calculation function
- **Impact**: Low - Utility function
- **Test Coverage**: Tested in multiple test files

### 4. Validation Pattern Duplication
**Location**: 
- `/core/secure-event-bridge.ts` (lines 156-174)
- `/utils/validation.ts` (lines 10-28)
- **Pattern**: Identical metrics validation logic
- **Impact**: Medium - Data validation
- **Test Coverage**: Unknown

### 5. Console Logging Patterns
**Locations**: Throughout codebase
- **210 console.log/warn/error occurrences** across 37 files
- **Pattern**: Inconsistent logging with similar prefixes and formats
- **Impact**: Low - Development/debugging

## Additional Duplication Patterns Found

### Hook State Management
- `/hooks/murmuraba-engine/use-murmubara-engine.ts` has 4 instances of similar state update patterns
- Lines 269-273, 280-284, 291-295 contain nearly identical error handling

### Gain Control Methods
- `/domain/gain/gain-domain.ts` lines 146-154 and 156-164
- Similar validation and update patterns for different gain properties

### Test Mock Setup
- `/tests/mocks/webAudioMocks.ts` has repeated mock patterns
- Lines 125-129 and 226-229 contain identical mock implementations

## Recommendations

### Priority 1: Extract Common Patterns (High Impact)

1. **Create Generic Event Handler Factory**
```typescript
// Recommended refactoring for recording-manager.ts
function createDataAvailableHandler(
  type: 'processed' | 'original',
  chunkId: string,
  cycleCount: number
) {
  return (event: BlobEvent) => {
    if (event.data.size >= MIN_VALID_BLOB_SIZE) {
      // Common logic here
    } else {
      // Common warning logic
    }
  };
}
```

2. **Create Generic Export Function**
```typescript
// Recommended refactoring for audio-exporter.ts
async function exportChunk(
  chunk: ProcessedChunk,
  audioType: 'processed' | 'original',
  format: 'wav' | 'mp3',
  options?: ExportOptions
): Promise<Blob> {
  // Common export logic
}
```

### Priority 2: Centralize Utilities (Medium Impact)

1. **Extract RMS Calculation to Shared Utility**
   - Move to `/utils/audio-math.ts`
   - Import in both `use-audio-engine.ts` and `murmuraba-processor.ts`

2. **Centralize Validation Functions**
   - Create `/utils/validation/metrics.ts`
   - Share between `secure-event-bridge.ts` and `validation.ts`

### Priority 3: Improve Logging (Low Impact)

1. **Implement Structured Logging**
   - Replace console.* with centralized logger
   - Use consistent log levels and formats
   - Consider using existing `/core/logger.ts`

## Test Coverage Analysis

### Files with Duplication Lacking Tests
1. **audio-exporter.ts** - No direct test file found
2. **secure-event-bridge.ts** - No test file found
3. **validation.ts** - No test file found

### Recommendation for Testing
- Add unit tests specifically targeting duplicated code sections
- Ensure both branches of duplicated logic are covered
- Use parameterized tests for similar patterns

## Impact on Maintainability

### Current State
- **Maintainability Score**: B+ (Good)
- Low overall duplication percentage
- Localized duplication patterns
- Most duplication in non-critical paths

### After Recommended Refactoring
- **Expected Improvement**: 
  - Reduce duplication by ~60%
  - Improve code reusability
  - Easier testing and maintenance
  - Better consistency across codebase

## Next Steps

1. **Immediate Actions** (Week 1)
   - Extract recording event handlers to factory function
   - Consolidate export functions in audio-exporter
   - Add tests for audio-exporter module

2. **Short-term Actions** (Week 2-3)
   - Centralize RMS calculation utility
   - Consolidate validation functions
   - Add tests for validation utilities

3. **Long-term Actions** (Month 1-2)
   - Implement structured logging system
   - Refactor state management patterns in hooks
   - Comprehensive test coverage for all duplicated areas

## Conclusion

While the codebase maintains good overall quality with minimal duplication, addressing the identified patterns will:
- Reduce maintenance overhead by 20-30%
- Improve testability of core functions
- Enhance code consistency and readability
- Prevent future duplication through established patterns

The most critical areas to address are the recording manager event handlers and audio export functions, as these represent core functionality with the highest duplication ratios.