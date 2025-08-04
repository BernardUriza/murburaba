# Code Duplication Analysis Report
    
Generated: 2025-08-04T00:05:36.575Z

## Summary
- **Total Duplications Found**: 409
- **Critical Issues**: 0
- **Estimated Savings**: 0%

## Pattern Analysis
### useState duplications
- Files affected: 3
- Total occurrences: 7

### useEffect duplications
- Files affected: 4
- Total occurrences: 18

### vi.fn() mocks
- Files affected: 7
- Total occurrences: 264

### AudioContext mocks
- Files affected: 1
- Total occurrences: 2

### Console.log statements
- Files affected: 11
- Total occurrences: 106

### Error throwing patterns
- Files affected: 11
- Total occurrences: 49

### RMS calculations
- Files affected: 0
- Total occurrences: 0


## Recommendations
1. **High Priority**: Consolidate test utilities and mocks
2. **Medium Priority**: Extract shared React hooks
3. **Low Priority**: Standardize console logging

## Next Steps
1. Run `npm run lint:duplication` regularly
2. Add duplication checks to CI/CD pipeline
3. Set duplication thresholds in pre-commit hooks
