# Component Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [Feature Components](#feature-components)
4. [Shared Components](#shared-components)
5. [State Management](#state-management)
6. [Error Handling](#error-handling)
7. [Testing Strategy](#testing-strategy)

## Architecture Overview

The application follows Clean Architecture principles with the following structure:

```
src/
├── features/       # Feature-based modules
├── core/          # Core business logic
├── shared/        # Shared components and utilities
└── routes/        # Route definitions
```

## Core Components

### App.tsx
**Purpose**: Main application component that orchestrates the entire app.

**Key Features**:
- Error boundary wrapping for crash protection
- Dark mode support
- Lazy loading for performance
- Global state integration

**Props**: None (uses internal state management)

**Usage**:
```tsx
import App from './App';

<App />
```

## Feature Components

### AudioRecorder
**Location**: `src/features/audio-recording/AudioRecorder.tsx`

**Purpose**: Handles audio recording functionality with start, stop, pause, and resume capabilities.

**Props**:
```typescript
interface AudioRecorderProps {
  recordingState: RecordingState;
  isInitialized: boolean;
  isLoading: boolean;
  onStartRecording: () => Promise<void>;
  onStopRecording: () => Promise<void>;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onClearRecordings: () => void;
}
```

**Features**:
- Visual recording status indicator
- Duration display
- Chunk management
- Accessibility support

### FileManager
**Location**: `src/features/file-management/FileManager.tsx`

**Purpose**: Manages file upload and processing with drag-and-drop support.

**Props**:
```typescript
interface FileManagerProps {
  isInitialized: boolean;
  isLoading: boolean;
  engineConfig: any;
  onFileProcessed?: (result: any) => void;
}
```

**Features**:
- Drag and drop interface
- File validation
- Processing feedback
- Success/error notifications

### AudioProcessor
**Location**: `src/features/audio-processing/AudioProcessor.tsx`

**Purpose**: Displays and manages processed audio chunks.

**Props**:
```typescript
interface AudioProcessorProps {
  chunks: ChunkData[];
  isPlaying: { [key: string]: boolean };
  expandedChunk: string | null;
  onTogglePlayback: (chunkId: string) => void;
  onToggleExpansion: (chunkId: string) => void;
  onExportWav: (chunkId: string) => Promise<void>;
  onExportMp3: (chunkId: string) => Promise<void>;
  onDownloadAll: () => Promise<void>;
  ChunkProcessingResults: React.ComponentType<any>;
}
```

**Features**:
- Chunk visualization
- Playback controls
- Export functionality
- Batch operations

### UIControls
**Location**: `src/features/ui-controls/UIControls.tsx`

**Purpose**: Navigation and utility controls for the application.

**Props**:
```typescript
interface UIControlsProps {
  className?: string;
}
```

**Features**:
- Tab navigation
- Dark mode toggle
- Settings access
- Chat interface toggle

## Shared Components

### ErrorBoundary
**Location**: `src/shared/components/ErrorBoundary.tsx`

**Purpose**: Catches and handles React component errors gracefully.

**Props**:
```typescript
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  isolate?: boolean;
  level?: 'page' | 'section' | 'component';
  showDetails?: boolean;
}
```

**Features**:
- Multi-level error handling (page/section/component)
- Auto-reset capability
- Custom error UI
- Error logging integration
- Development mode details

### AsyncBoundary
**Location**: `src/shared/components/AsyncBoundary.tsx`

**Purpose**: Combines Suspense and ErrorBoundary for async component loading.

**Props**:
```typescript
interface AsyncBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  level?: 'page' | 'section' | 'component';
}
```

**Usage**:
```tsx
<AsyncBoundary 
  level="section" 
  fallback={<LoadingSpinner />}
  errorFallback={<ErrorMessage />}
>
  <LazyLoadedComponent />
</AsyncBoundary>
```

## State Management

### useAppStore (Zustand)
**Location**: `src/core/store/useAppStore.ts`

**Purpose**: Global state management using Zustand with persistence.

**State Structure**:
```typescript
interface AppState {
  // Engine Configuration
  engineConfig: EngineConfig;
  updateEngineConfig: (config: Partial<EngineConfig>) => void;
  
  // Display Settings
  displaySettings: DisplaySettings;
  updateDisplaySettings: (settings: Partial<DisplaySettings>) => void;
  
  // VAD Thresholds
  vadThresholds: VadThresholds;
  updateVadThresholds: (thresholds: Partial<VadThresholds>) => void;
  
  // UI State
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  
  // ... more state
}
```

**Features**:
- Automatic persistence
- DevTools integration
- TypeScript support
- Selective state persistence

**Usage**:
```tsx
const { isDarkMode, toggleDarkMode } = useAppStore();
```

## Error Handling

### Error Levels

1. **Page Level**: Complete application failures
   - Shows full-page error UI
   - Suggests page refresh
   - Logs to external service

2. **Section Level**: Feature-specific failures
   - Isolates error to feature
   - Shows contextual error message
   - Allows other features to function

3. **Component Level**: Individual component failures
   - Minimal UI disruption
   - Auto-retry capability
   - Detailed error logging

### Logger Service
**Location**: `src/core/services/Logger.ts`

**Purpose**: Centralized logging with multiple targets.

**Features**:
- Log levels (DEBUG, INFO, WARN, ERROR, FATAL)
- Console output (dev mode)
- Remote logging (production)
- Buffered log transmission
- Performance metrics

**Usage**:
```typescript
Logger.info('User action', { action: 'click', target: 'button' });
Logger.error('API call failed', { endpoint: '/api/data' }, error);
Logger.metric('response_time', 234, 'ms', { endpoint: '/api/data' });
```

## Testing Strategy

### Unit Tests
- Component isolation
- Mock dependencies
- Test user interactions
- Verify state changes

### Integration Tests
- Feature workflows
- Component interactions
- State management
- API communications

### Test Coverage Goals
- Components: > 80%
- Hooks: > 90%
- Utils: > 95%
- Core logic: > 90%

### Test File Structure
```
component/
├── ComponentName.tsx
└── __tests__/
    └── ComponentName.test.tsx
```

## Best Practices

1. **Component Design**
   - Single responsibility
   - Props validation
   - Memoization when needed
   - Accessibility first

2. **State Management**
   - Minimal global state
   - Local state when possible
   - Derived state over stored
   - Immutable updates

3. **Error Handling**
   - Always use ErrorBoundary
   - Log all errors
   - User-friendly messages
   - Recovery mechanisms

4. **Performance**
   - Lazy load heavy components
   - Memoize expensive calculations
   - Virtualize long lists
   - Code split by route

5. **Testing**
   - Test user behavior
   - Mock external dependencies
   - Test error scenarios
   - Maintain high coverage