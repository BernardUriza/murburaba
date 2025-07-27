# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.1] - 2025-01-22

### Added - Professional UI Components with Brutal TDD

#### 🎵 AudioPlayer Component

- **NEW**: Professional audio player with complete accessibility support
- **Features**: Play/pause controls, seeking, volume control, time display, progress bar
- **Accessibility**: Full ARIA labels, keyboard navigation, screen reader compatibility
- **Performance**: Optimized with useMemo, useCallback, debounced seeking, memory leak prevention
- **Error Handling**: Graceful loading failures, format validation, edge case handling
- **Architecture**: Zero inline styles, clean component composition, TypeScript strict mode
- **Testing**: 23/23 TDD tests passing with comprehensive edge case coverage
- **Props**: Supports src, onPlayStateChange, className, label, forceStop, aria-label, disabled, volume, muted

#### 📊 AdvancedMetricsPanel Component

- **NEW**: Real-time engine diagnostics and performance monitoring panel
- **Metrics**: Memory usage, processing time, WASM status, active processors, engine state
- **Performance Indicators**: Smart visual feedback (Good/Moderate/High) based on system usage
- **Browser Compatibility**: Displays browser info and audio API support status
- **Accessibility**: Proper modal dialog with keyboard navigation and escape handling
- **Architecture**: Modular composition with MetricItem, PerformanceIndicator sub-components
- **Testing**: 31/31 TDD tests passing with complete coverage including edge cases
- **Props**: Supports isVisible, diagnostics, onClose, className, aria-label

#### 🏗️ Clean Architecture Philosophy

- **Component Composition**: Small, focused components with single responsibilities
- **TypeScript Strictness**: Zero 'as any' usage, complete type safety, proper interfaces
- **Test-Driven Development**: Write tests first methodology with brutal quality standards
- **Accessibility First**: WCAG 2.1 compliance with keyboard navigation and screen reader support
- **Performance Optimized**: React best practices, efficient re-renders, memory management
- **Error Boundaries**: Comprehensive edge case handling and graceful failures

### Enhanced

- **Package Exports**: Added professional UI components to main exports
- **TypeScript Support**: Extended type definitions for new component interfaces
- **Documentation**: Comprehensive README updates with component usage examples
- **Integration Examples**: Complete examples showing AudioPlayer + AdvancedMetricsPanel integration
- **API Reference**: Detailed component props documentation and usage patterns

### Technical Implementation

- **100% Test Coverage**: Both components achieve complete TDD test coverage
- **Zero Dependencies**: Components built with pure React, no external UI dependencies
- **Production Ready**: Components designed for production use with professional quality
- **Customizable**: CSS classes and styling hooks for custom design integration
- **Type Safe**: Full TypeScript interfaces and strict type checking

### Migration Guide

```tsx
// Before v1.4.1 - Custom audio player implementation needed
// After v1.4.1 - Import ready-to-use components
import { AudioPlayer, AdvancedMetricsPanel, useMurmubaraEngine } from 'murmuraba';

function MyApp() {
  const { diagnostics } = useMurmubaraEngine();
  return (
    <>
      <AudioPlayer src="audio.mp3" label="My Audio" />
      <AdvancedMetricsPanel isVisible={true} diagnostics={diagnostics} onClose={() => {}} />
    </>
  );
}
```

## [1.4.0] - 2025-01-22

### Added - Complete Package Refactoring

- **useMurmubaraEngine Hook**: Complete audio recording and processing solution
- **Zero-Setup Recording**: MediaRecorder, streams, and chunks handled internally
- **Built-in Audio Playback**: Toggle between original and processed audio
- **Complete State Management**: Recording time, chunks, status in single object
- **Automatic Memory Management**: Auto-cleanup of audio URLs and resources
- **Utility Functions**: formatTime(), getAverageNoiseReduction(), chunk controls

### Enhanced

- **Clean Architecture**: Perfect separation between UI components and audio logic
- **WAV-First Strategy**: Prioritizes WAV format with automatic WebM/Opus fallback
- **Package Completeness**: No external dependencies or setup required
- **Frontend Simplification**: Pure UI rendering - all audio logic in package

## [1.3.0] - 2024-12-15

### Added - Revolutionary Clean Architecture

- **Complete Package Solution**: ALL audio logic moved into package
- **Built-in Recording Pipeline**: Start, stop, pause, resume with chunking
- **Integrated Audio Playback**: toggleChunkPlayback() for A/B comparison
- **Automatic Resource Management**: Auto-cleanup and memory management

## [1.2.0] - 2024-11-20

### Added - Enhanced Processing

- **Chunked Processing**: Process audio in configurable chunks with metrics
- **Enhanced API**: Complete stream control with pause/resume functionality
- **Better Cleanup**: Proper destruction of all resources including workers
- **Real-time Metrics**: Continuous updates on noise reduction performance
- **State Management**: Clear engine states with proper transitions
- **Error Handling**: Specific error codes for better debugging

## [0.1.0] - 2024-01-19

### Added

- Initial release of Murmuraba audio processing library
- RNNoise neural network noise reduction engine
- React hook `useAudioEngine` for easy integration
- `MurmurabaProcessor` class for low-level audio processing
- `AudioStreamManager` utility for managing multiple audio streams
- Full TypeScript support with type definitions
- WebAssembly-based processing for high performance
- Real-time audio metrics and statistics
- Modular architecture for adding custom audio engines
- Comprehensive documentation and examples
