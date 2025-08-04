# Code Duplication Elimination Guide

## 🎯 Overview

This guide provides a comprehensive system for detecting, preventing, and eliminating code duplication in the Murmuraba project. The system includes automated detection, pre-commit hooks, and refactoring utilities.

## 🚀 Quick Start

### 1. Setup Pre-commit Hooks
```bash
# Install pre-commit (requires Python)
npm run setup:pre-commit

# Or manually:
pip install pre-commit
pre-commit install
```

### 2. Run Quality Checks
```bash
# Run all quality checks
npm run quality:check

# Individual checks
npm run check:duplication-thresholds
npm run check:test-patterns  
npm run check:console-logs
npm run check:error-patterns
```

### 3. Analyze Current Duplication
```bash
# Full analysis with reports
npm run analyze:duplication

# Basic duplication detection
npm run lint:duplication
```

## 🛠️ Automated Tools

### Duplication Detection
- **Script**: `scripts/duplication-detector.js`
- **Reports**: `./reports/duplication/`
- **Thresholds**: Configurable limits for different pattern types

### Pre-commit Hooks
- **Config**: `.pre-commit-config.yaml`
- **Enforcement**: Blocks commits that exceed duplication thresholds
- **Validation**: Ensures modern patterns in test files

### Quality Checkers
1. **Duplication Thresholds** - Prevents excessive code duplication
2. **Test Pattern Validation** - Ensures tests use centralized utilities
3. **Console Log Detection** - Enforces structured logging
4. **Error Pattern Validation** - Ensures consistent error handling

## 📊 Duplication Thresholds

### Current Limits
```javascript
maxTotalDuplications: 500,
maxCriticalIssues: 5,

patterns: {
  'Console.log statements': { maxOccurrences: 100, severity: 'error' },
  'Error throwing patterns': { maxOccurrences: 40, severity: 'error' },
  'vi.fn() mocks': { maxOccurrences: 300, severity: 'warning' }
}
```

### File-specific Limits
- Core modules: max 5 duplications per file
- Utils: max 3 duplications per file  
- Tests: relaxed limits with pattern allowances

## 🧪 Test Refactoring

### Before (Duplicated Setup)
```typescript
describe('Component', () => {
  let mockAudioContext: any;
  
  beforeEach(() => {
    mockAudioContext = {
      createScriptProcessor: vi.fn().mockReturnValue({
        connect: vi.fn(),
        disconnect: vi.fn()
      }),
      // ... 50+ lines of mock setup
    };
    global.AudioContext = vi.fn(() => mockAudioContext);
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
});
```

### After (Centralized Utilities)
```typescript
import { createFullTestEnvironment } from '../shared/test-utils';

describe('Component', () => {
  let testEnv: ReturnType<typeof createFullTestEnvironment>;
  
  beforeEach(() => {
    testEnv = createFullTestEnvironment();
  });
  
  afterEach(() => {
    testEnv.cleanup();
  });
});
```

## 📝 Logging Migration

### Before (Console Statements)
```typescript
console.log('Processing audio...', data);
console.error('Failed to process:', error);
console.debug('Metrics:', metrics);
```

### After (Structured Logging)
```typescript
import { AudioLogger, ProcessingLogger } from '../utils/logger';

AudioLogger.info('Processing audio chunk', data);
ProcessingLogger.error('Processing failed', error);
ProcessingLogger.debug('Metrics updated', metrics);
```

### Available Loggers
- `AudioLogger` - Audio processing and playback
- `RecordingLogger` - Recording and streaming
- `ProcessingLogger` - Audio processing and chunks
- `WASMLogger` - WebAssembly operations
- `UILogger` - User interface interactions
- `PerformanceLogger` - Performance metrics

## ⚠️ Error Handling Migration

### Before (Raw Errors)
```typescript
throw new Error('AudioContext failed');
throw new Error('Invalid parameter');
throw new Error('WASM load failed');
```

### After (ErrorFactory)
```typescript
import { ErrorFactory, ErrorType } from '../utils/error-handler';

throw ErrorFactory.audioContextCreationFailed(error, { context });
throw ErrorFactory.invalidParameter('paramName', 'expected', received);
throw ErrorFactory.wasmModuleLoadFailed(error, { url, status });
```

### Available ErrorFactory Methods
- `audioContextCreationFailed()` - AudioContext issues
- `wasmModuleLoadFailed()` - WASM loading failures
- `mediaRecorderStartFailed()` - MediaRecorder issues
- `invalidParameter()` - Parameter validation
- `initializationFailed()` - Component initialization
- `featureNotSupported()` - Browser feature support

## 🔧 Utility Classes

### MockFactories
```typescript
import { MockFactories } from '../shared/test-utils';

// Instead of inline mocks
const audioContext = MockFactories.createAudioContextMock(options);
const mediaRecorder = MockFactories.createMediaRecorderMock();
const stream = MockFactories.createMediaStreamMock(tracks);
```

### TestEnvironment
```typescript
import { createFullTestEnvironment } from '../shared/test-utils';

const testEnv = createFullTestEnvironment({
  audio: true,
  mediaRecorder: true,
  console: { silent: true },
  wasm: true
});

// Access mocks
testEnv.audioContext
testEnv.mediaRecorder
testEnv.console
testEnv.wasm
```

### TestUtils
```typescript
import { TestUtils } from '../shared/test-utils';

await TestUtils.waitFor(100);
await TestUtils.waitForCondition(() => condition);
const audioData = TestUtils.createTestAudioData(1024, 440);
const dropEvent = TestUtils.createDropEvent(files);
```

## 📈 Monitoring & Reports

### Daily Reports
- Automated duplication analysis via CI/CD
- Trend tracking in `trends/duplication/`
- PR comments with duplication impact

### Metrics Tracked
- Total duplications count
- Pattern-specific violations
- File-level duplication percentages
- Threshold compliance status

### Report Locations
- `./reports/duplication/duplication-summary.md` - Human-readable summary
- `./reports/duplication/duplication-report.json` - Machine-readable data
- `./reports/duplication/duplication-metrics.csv` - Tracking history

## 🎯 Migration Priorities

### Phase 1: Critical Infrastructure
1. ✅ Test utilities consolidation
2. ✅ Console.log to structured logging  
3. ✅ ErrorFactory implementation
4. 🔄 Pre-commit hook setup

### Phase 2: Progressive Refactoring
1. 🔄 Migrate remaining test files
2. ⏳ Complete console.log migration
3. ⏳ Finish ErrorFactory adoption
4. ⏳ Optimize mock patterns

### Phase 3: Advanced Optimization
1. ⏳ Bundle size analysis
2. ⏳ Component duplication detection
3. ⏳ Performance impact analysis
4. ⏳ Documentation generation

## 🚨 Troubleshooting

### Pre-commit Hook Issues
```bash
# If pre-commit fails to install
pip install --user pre-commit
pre-commit install --install-hooks

# Skip hooks temporarily (not recommended)
git commit --no-verify
```

### Threshold Violations
```bash
# Check current status
npm run check:duplication-thresholds

# View detailed report
cat ./reports/duplication/duplication-summary.md

# Adjust thresholds (if justified)
# Edit scripts/check-duplication-thresholds.js
```

### Test Migration Issues
```bash
# Validate test patterns
npm run check:test-patterns

# Check specific test file
node scripts/validate-test-patterns.js path/to/test.ts
```

## 📚 Best Practices

### Do's ✅
- Use `createFullTestEnvironment()` for test setup
- Use category-specific loggers (`AudioLogger`, etc.)
- Use `ErrorFactory` methods for consistent errors
- Extract common patterns into utilities
- Run quality checks before commits

### Don'ts ❌
- Manual AudioContext/MediaRecorder mocking
- Raw `console.log` statements in production
- Generic `throw new Error()` patterns
- Copy-paste test setup code
- Skip pre-commit hooks without reason

## 🤝 Contributing

When adding new features:
1. Use existing utilities instead of creating duplicates
2. Add new patterns to centralized factories
3. Update logger categories if needed
4. Extend ErrorFactory for new error types
5. Update documentation and examples

## 📞 Support

For questions or issues:
1. Check `./reports/duplication/` for analysis
2. Run `npm run quality:check` for validation
3. Review this guide for patterns
4. Update thresholds if justified by architecture changes