# Migration Guide: processFileWithMetrics → MurmurabaSuite

## Overview

We've upgraded from the legacy `processFileWithMetrics` API to the elegant `MurmurabaSuite` dependency injection system. This provides better performance, cleaner code, and improved testability.

## Key Changes

### 1. Provider Setup

**Before:**
```tsx
// pages/_app.tsx
import { Provider } from 'react-redux'
import { store } from '../store'

<Provider store={store}>
  <Component {...pageProps} />
</Provider>
```

**After:**
```tsx
// pages/_app.tsx
import { MurmurabaReduxProvider } from '../providers/MurmurabaReduxProvider'

<MurmurabaReduxProvider
  logLevel="warn"
  algorithm="rnnoise"
  lazy={true}
>
  <Component {...pageProps} />
</MurmurabaReduxProvider>
```

### 2. Hook Usage

**Before:**
```tsx
import { useAudioProcessor } from '../hooks/useAudioProcessor'
// Manual processFileWithMetrics calls
```

**After:**
```tsx
import { useAudioProcessor } from '../hooks/useAudioProcessor'
// Same API, but now powered by MurmurabaSuite!
```

The hook API remains the same for backwards compatibility, but now uses MurmurabaSuite under the hood.

### 3. Direct API Usage

**Before:**
```tsx
import { processFileWithMetrics } from 'murmuraba'

const result = await processFileWithMetrics(arrayBuffer, {
  chunkOptions: {
    chunkDuration: 8000,
    outputFormat: 'wav'
  }
})
```

**After:**
```tsx
// Use the hook instead
const { handleFileUpload } = useAudioProcessor()
await handleFileUpload(file)

// Or use the new action
dispatch(processFileAction(file, options))
```

## Benefits

1. **Automatic Cleanup**: Audio URLs and resources are managed automatically
2. **Progress Tracking**: Built-in progress callbacks
3. **Better Error Handling**: Centralized error management through Redux
4. **Lazy Loading**: Services load on-demand, improving initial load time
5. **Type Safety**: Full TypeScript support with proper types
6. **Testability**: Easy to mock services for testing

## Component Migration Examples

### Simple File Processor

**Before:**
```tsx
const handleFile = async (file: File) => {
  const buffer = await file.arrayBuffer()
  const result = await processFileWithMetrics(buffer, options)
  // Handle result...
}
```

**After:**
```tsx
const { handleFileUpload, isProcessing } = useAudioProcessor()

const handleFile = async (file: File) => {
  await handleFileUpload(file)
  // Results automatically stored in Redux
}
```

### Recording Component

**Before:**
```tsx
const result = await processFileWithMetrics('Use.Mic', {
  recordingDuration: 5000
})
```

**After:**
```tsx
const { processRecording } = useAudioProcessor()

await processRecording(5000, {
  chunkDuration: 2000,
  outputFormat: 'webm'
})
```

## Advanced Features

### Custom Service Access

```tsx
import { useMurmurabaSuite } from 'murmuraba/react/MurmurabaSuite'
import { TOKENS } from 'murmuraba/core/DIContainer'

const { getService } = useMurmurabaSuite()
const logger = getService(TOKENS.Logger)
```

### Multiple Configurations

```tsx
// Development config
<MurmurabaReduxProvider logLevel="debug" algorithm="spectral">
  
// Production config  
<MurmurabaReduxProvider logLevel="error" algorithm="rnnoise">
```

## Troubleshooting

### "MurmurabaSuite not ready yet" warning
- Ensure you're using the hook after the provider has initialized
- Check that `lazy={true}` is set for Next.js apps

### SSR Issues
- MurmurabaSuite automatically handles SSR by deferring initialization
- Audio APIs are only accessed on the client side

### Migration Checklist

- [ ] Update `_app.tsx` to use `MurmurabaReduxProvider`
- [ ] Replace direct `processFileWithMetrics` calls with hook usage
- [ ] Update imports (the hook name stays the same)
- [ ] Test file processing functionality
- [ ] Test recording functionality
- [ ] Verify Redux state updates correctly
- [ ] Check error handling works as expected

## Need Help?

The `useAudioProcessor` hook maintains the same API, so most code will work without changes. For advanced use cases, refer to the MurmurabaSuite documentation.