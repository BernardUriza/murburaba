# Murmuraba Test Suite

Modern test structure following TDD principles and 2025 best practices.

## Structure

```
tests/
├── unit/           # Isolated unit tests for individual functions/classes
├── integration/    # Tests for component interactions
├── e2e/           # End-to-end tests for complete workflows  
├── fixtures/       # Test data and mock files
├── utils/         # Test helpers and utilities
└── mocks/         # Mock implementations
```

## Testing Philosophy

1. **TDD First**: Write tests before implementation
2. **Isolation**: Each test should be independent
3. **Fast Feedback**: Unit tests should run in milliseconds
4. **Clear Intent**: Test names describe behavior, not implementation
5. **Modular**: Tests organized by feature/domain

## Test Categories

### Unit Tests
- Pure functions
- Class methods
- State management
- Business logic

### Integration Tests  
- API interactions
- Component integration
- Event flows
- Data transformations

### E2E Tests
- Complete user workflows
- Real browser environment
- Performance validations
- Error scenarios

## Running Tests

```bash
# All tests
npm test

# Unit tests only
npm test -- tests/unit

# Integration tests
npm test -- tests/integration

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## Writing Tests

Follow the AAA pattern:
- **Arrange**: Set up test data
- **Act**: Execute the function
- **Assert**: Verify the result

Example:
```typescript
describe('processAudio', () => {
  it('should remove noise from audio signal', () => {
    // Arrange
    const noisyAudio = createNoisyAudioFixture();
    
    // Act
    const result = processAudio(noisyAudio);
    
    // Assert
    expect(result.noiseLevel).toBeLessThan(0.1);
  });
});
```