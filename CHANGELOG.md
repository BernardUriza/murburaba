# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2024-07-20

### Added
- **Complete Recording Pipeline in useMurmubaraEngine Hook**
  - Built-in recording management with start, stop, pause, and resume
  - Automatic audio chunking with configurable duration
  - Recording time tracking and state management
  
- **Automatic Audio Format Conversion**
  - New `AudioConverter` utility class for WebM/Opus to WAV conversion
  - Automatic format detection and conversion for cross-browser compatibility
  - Built-in playback support for all major browsers
  
- **Enhanced Chunk Management**
  - Each chunk now includes both original and processed audio URLs
  - Chunk expansion/collapse for detailed view
  - Per-chunk playback controls with visual feedback
  
- **Utility Functions**
  - `formatTime()` - Convert seconds to MM:SS format
  - `getAverageNoiseReduction()` - Calculate average noise reduction across all chunks
  - Automatic memory cleanup for audio URLs
  
- **Improved State Management**
  - Complete `recordingState` object with all recording information
  - `currentStream` and `streamController` exposed for advanced usage
  - Better error handling and recovery

### Changed
- **Consolidated Hook API** - All features now in single `useMurmubaraEngine` hook (no more "extended" version)
- **Simplified Imports** - Everything available from main package export
- **Better TypeScript Support** - Exported all types for better IDE integration

### Fixed
- Audio playback issues in browsers that don't support WebM/Opus
- Memory leaks from unreleased audio URLs
- State synchronization issues during pause/resume

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