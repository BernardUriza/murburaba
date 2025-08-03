# Gain Control Testing Documentation

## Overview
This document describes the comprehensive test coverage for the gain control functionality in the Murmuraba audio processing system. The gain control allows users to adjust input volume levels between 0.5x and 3.0x to optimize audio recording quality.

## Test Coverage

### 1. Unit Tests

#### Engine Level (`murmuraba-engine.gain.test.ts`)
- **Constructor Initialization**
  - Default gain value (1.0)
  - Custom gain configuration
  - Boundary clamping (0.5 - 3.0)
  - Invalid value handling (NaN, Infinity, negative)

- **setInputGain Method**
  - Valid range updates
  - Boundary value clamping
  - Fractional precision
  - Sequential updates
  - Active stream updates

- **getInputGain Method**
  - Current value retrieval
  - Update reflection
  - Consistency across calls

- **Gain Node Integration**
  - Node creation during stream processing
  - Value application to gain node
  - Dynamic updates during processing

- **Error Handling**
  - Uninitialized state handling
  - Error state recovery
  - Persistence through destroy/reinitialize

- **Edge Cases**
  - Extreme values (MIN_VALUE, MAX_VALUE)
  - Zero and negative zero
  - Type coercion (undefined, null)

### 2. API Tests (`api.gain.test.ts`)

- **setInputGain Function**
  - Engine initialization requirement
  - Value passing to engine
  - Consecutive calls handling
  - Boundary value processing
  - Error propagation

- **getInputGain Function**  
  - Engine initialization requirement
  - Value retrieval from engine
  - Updated value reflection
  - Error handling

- **Integration with Engine Lifecycle**
  - Value persistence across operations
  - Stream processing compatibility
  - Concurrent operation safety

### 3. React Hook Tests (`use-murmubara-engine.gain.test.tsx`)

- **Initial State**
  - Default gain value
  - Function availability

- **setInputGain Hook Method**
  - Initialization requirement
  - State updates
  - Multiple updates
  - Boundary values
  - API error handling

- **getInputGain Hook Method**
  - Current value retrieval
  - API synchronization
  - Error recovery

- **Recording Integration**
  - Gain persistence during recording
  - Dynamic adjustment while recording
  - Post-recording persistence

- **Hook Lifecycle**
  - Re-render persistence
  - Error recovery
  - Unmount handling

### 4. Component Tests (`AudioRecorder.gain.test.tsx`)

- **UI Rendering**
  - Gain button visibility
  - Panel toggle functionality
  - Current value display
  - Slider attributes

- **User Interactions**
  - Slider value changes
  - Preset button clicks
  - Panel visibility toggle
  - Keyboard navigation

- **Gain Level Indicators**
  - Reduced level (< 1.0)
  - Normal level (= 1.0)
  - Increased level (1.0 - 1.5)
  - High level (1.5 - 2.0)
  - Maximum boost warning (> 2.0)

- **Recording State Integration**
  - Adjustment during recording
  - Adjustment while paused
  - Panel accessibility

- **Accessibility**
  - ARIA labels
  - Keyboard support
  - Focus management

### 5. Integration Tests (`gain-control-integration.test.tsx`)

- **End-to-End Workflow**
  - Complete gain adjustment flow
  - UI to engine synchronization
  - Recording with adjusted gain

- **Error Recovery**
  - Gain update error handling
  - Engine restart persistence

- **Performance**
  - Rapid update handling
  - Memory leak prevention
  - Operation efficiency

## Running the Tests

### All Gain Control Tests
```bash
npm run test:gain
```

### Watch Mode (for development)
```bash
npm run test:gain:watch
```

### With Coverage Report
```bash
npm run test:gain:coverage
```

### Individual Test Suites
```bash
# Engine tests only
npx vitest run packages/murmuraba/src/core/__tests__/murmuraba-engine.gain.test.ts

# API tests only
npx vitest run packages/murmuraba/src/__tests__/api.gain.test.ts

# Hook tests only
npx vitest run packages/murmuraba/src/hooks/murmuraba-engine/__tests__/use-murmubara-engine.gain.test.tsx

# Component tests only
npx vitest run src/features/audio-recording/__tests__/AudioRecorder.gain.test.tsx

# Integration tests only
npx vitest run src/__tests__/gain-control-integration.test.tsx
```

## Test Structure

### Test File Organization
```
/workspaces/murburaba/
├── packages/murmuraba/src/
│   ├── core/__tests__/
│   │   └── murmuraba-engine.gain.test.ts    # Engine unit tests
│   ├── __tests__/
│   │   └── api.gain.test.ts                 # API function tests
│   └── hooks/murmuraba-engine/__tests__/
│       └── use-murmubara-engine.gain.test.tsx # React hook tests
└── src/
    ├── features/audio-recording/__tests__/
    │   └── AudioRecorder.gain.test.tsx      # Component tests
    └── __tests__/
        └── gain-control-integration.test.tsx # Integration tests
```

## Coverage Goals

- **Line Coverage**: 80%+
- **Branch Coverage**: 75%+
- **Function Coverage**: 90%+
- **Statement Coverage**: 80%+

## Key Test Scenarios

### Critical Path Testing
1. User opens gain control panel
2. User adjusts gain using slider
3. Gain value updates in engine
4. Audio processing applies new gain
5. UI reflects updated value

### Edge Case Testing
- Minimum gain (0.5x)
- Maximum gain (3.0x)
- Out-of-range values
- Rapid successive updates
- Concurrent operations

### Error Scenarios
- Engine not initialized
- API failures
- Invalid input values
- Memory constraints

## Mocking Strategy

### Audio APIs
- `AudioContext` and related nodes
- `MediaStream` and `MediaRecorder`
- `navigator.mediaDevices.getUserMedia()`

### WASM Module
- RNNoise loading and processing
- Memory allocation
- Frame processing

### React Testing
- Component rendering
- User events
- State updates
- Hook lifecycle

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on others
2. **Mock Cleanup**: Always clear mocks between tests
3. **Async Handling**: Use proper async/await and waitFor utilities
4. **Error Testing**: Test both success and failure paths
5. **Accessibility**: Include ARIA and keyboard navigation tests
6. **Performance**: Include tests for rapid operations and memory usage

## Continuous Integration

Tests are run automatically on:
- Pull request creation
- Commits to main branch
- Pre-deployment validation

## Debugging Tests

### Verbose Output
```bash
npm run test:gain -- --reporter=verbose
```

### Single Test Focus
```javascript
it.only('should update gain value', () => {
  // Test implementation
});
```

### Debug Mode
```bash
node --inspect-brk ./node_modules/.bin/vitest run test:gain
```

## Future Improvements

1. **Visual Regression Testing**: Add screenshot comparisons for UI
2. **Performance Benchmarks**: Add performance regression tests
3. **Cross-Browser Testing**: Expand to test multiple browsers
4. **Real Audio Testing**: Add tests with actual audio samples
5. **Load Testing**: Test with many simultaneous gain adjustments