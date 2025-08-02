# 📋 Changelog

All notable changes to Murmuraba Studio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2025-08-02

### 🎨 Design System Revolution
- **MAJOR**: Complete CSS architecture overhaul with modern design system
- **NEW**: Comprehensive CSS variables for colors, spacing, typography, and animations
- **NEW**: Glassmorphism effects and modern neon styling throughout UI
- **NEW**: Gradient animations and sophisticated visual interactions
- **NEW**: Dark theme optimizations with enhanced color palette

### 🏗️ Architecture Improvements
- **NEW**: Single source of truth versioning system with `version.json`
- **NEW**: Automatic version synchronization across all components
- **IMPROVED**: React 19 compliance with optimized store selectors
- **IMPROVED**: Component organization with proper memoization patterns
- **REMOVED**: Duplicate and scattered CSS files

### ✨ User Experience Enhancements
- **NEW**: Modern app header with animated gradients
- **NEW**: Enhanced settings panel with glassmorphism effects
- **NEW**: Audio controls with gradient interactions and hover animations
- **NEW**: Improved waveform displays with modern container styling
- **NEW**: Floating panels with smooth slide-in animations
- **IMPROVED**: Real-time VAD indicators with modern styling
- **IMPROVED**: Loading states and error handling with better visual feedback

### 📱 Responsive Design
- **IMPROVED**: Mobile-first responsive design across all components
- **IMPROVED**: Touch-friendly interactions and accessibility
- **IMPROVED**: Cross-browser compatibility for modern features

### 🔧 Technical Updates
- **NEW**: Design tokens system for consistent styling
- **NEW**: Advanced animation and transition systems
- **NEW**: Modern elevation and shadow definitions
- **IMPROVED**: Performance optimizations with reduced CSS bundle size
- **CLEANED**: Removed redundant styles and consolidated design patterns

### 🚀 Performance
- **IMPROVED**: Optimized CSS loading and rendering
- **IMPROVED**: Reduced layout shifts with better skeleton loading
- **IMPROVED**: Enhanced component rendering performance

---

## [1.3.0] - 2025-07-20

### 🎯 **Major Refactoring: Clean Architecture**
- **Moved ALL recording logic to useMurmubaraEngine hook**
  - MediaRecorder management now handled internally in hook
  - Chunk processing and state management moved to package
  - Audio conversion and playback logic centralized
  
- **Simplified Frontend (index.tsx)**
  - Reduced from >1700 lines to <100 lines of pure UI code
  - All business logic now in the `murmuraba` package
  - Clean separation of concerns: UI vs audio processing logic

### Added
- **Complete Recording Pipeline in useMurmubaraEngine Hook**
  - Built-in recording management with start, stop, pause, and resume
  - Automatic audio chunking with configurable duration
  - Recording time tracking and state management
  
- **WAV-First Recording Strategy**
  - Prioritizes WAV format for maximum compatibility
  - Automatic fallback to WebM/Opus if WAV not supported
  - Built-in audio conversion for playback compatibility
  
- **Enhanced Chunk Management**
  - Each chunk now includes both original and processed audio URLs
  - Chunk expansion/collapse for detailed view
  - Per-chunk playback controls with visual feedback
  
- **Utility Functions Integrated**
  - `formatTime()` - Convert seconds to MM:SS format
  - `getAverageNoiseReduction()` - Calculate average noise reduction across all chunks
  - `toggleChunkPlayback()` and `toggleChunkExpansion()` built-in
  - Automatic memory cleanup for audio URLs
  
- **Improved State Management**
  - Complete `recordingState` object with all recording information
  - `currentStream` and `streamController` exposed for advanced usage
  - Better error handling and recovery

### Changed
- **🔥 BREAKING: Complete Hook API Redesign**
  - All features now in single `useMurmubaraEngine` hook
  - No more manual MediaRecorder setup required
  - Simplified imports: everything from `'murmuraba'`
  
- **Clean Package Structure**
  - Frontend (index.tsx): Pure UI components and styling
  - Package (murmuraba): All audio processing and recording logic
  - Clear separation enables easy package reuse
  
- **Better TypeScript Support**
  - All types exported from main package
  - Improved IDE integration and autocomplete

### Fixed
- Audio playback issues in browsers that don't support WebM/Opus
- Memory leaks from unreleased audio URLs
- State synchronization issues during pause/resume
- TypeScript import/export conflicts between root and package

## [1.2.1] - 2024-07-19

### Fixed
- Worker initialization issues
- Memory cleanup improvements

## [1.2.0] - 2024-07-19

### Added
- Chunked audio processing with configurable duration
- Stream control (pause, resume, stop)
- Real-time metrics and callbacks
- Automatic cleanup after inactivity
- Enhanced error handling with specific error codes

### Changed
- Improved state management
- Better resource cleanup
- Enhanced logging system

## [1.1.0] - 2024-07-18

### Added
- React hooks support
- TypeScript definitions
- Basic audio processing

## [1.0.0] - 2024-07-17

### Added
- Initial release
- RNNoise integration
- Basic noise reduction functionality