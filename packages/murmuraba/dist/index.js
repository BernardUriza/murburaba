/* React externalized */
/**
 * Murmuraba v1.5.0
 * Real-time audio noise reduction
 */
// Core exports
const { MurmubaraEngine  } = require('./core/MurmubaraEngine');
const { EventEmitter  } = require('./core/EventEmitter');
const { StateManager  } = require('./core/StateManager');
const { Logger  } = require('./core/Logger');
const { engineRegistry  } = require('./core/EngineRegistry');
// Manager exports
const { WorkerManager  } = require('./managers/WorkerManager');
const { MetricsManager  } = require('./managers/MetricsManager');
// Engine exports
const { RNNoiseEngine  } = require('./engines/RNNoiseEngine');
// Type exports
module.exports = { ...module.exports, ...require('./types') };
// API functions
const { initializeAudioEngine, getEngine, processStream, processStreamChunked, destroyEngine, getEngineStatus, getDiagnostics, onMetricsUpdate, processFile  } = require('./api');
// Modern API exports - Use MurmurabaSuite for all functionality
// Legacy hooks have been removed in favor of the DI-based MurmurabaSuite
// Utils
const { AudioConverter, getAudioConverter  } = require('./utils/audioConverter');
// Version
const VERSION = '1.5.0';
const MURMURABA_VERSION = VERSION;
// 🧨 MODERN MURMURABA API - MurmurabaSuite Architecture 🧨
// All functionality now available through MurmurabaSuite
const { MurmurabaSuite, useMurmurabaSuite, useAudioProcessor, useSuiteLogger, useAudioProcessing, TOKENS, SUITE_TOKENS  } = require('./react/MurmurabaSuite');
const { DIContainer  } = require('./core/DIContainer');
const { AudioProcessorService  } = require('./services/AudioProcessorService');
// UI Components - Export from components directory
const { SimpleWaveformAnalyzer, WaveformAnalyzer, SyncedWaveforms, ChunkProcessingResults, AudioPlayer, AdvancedMetricsPanel, ErrorBoundary, withErrorBoundary, BuildInfo, BuildInfoBadge, BuildInfoBlock, BuildInfoInline  } = require('./components');


module.exports = { MurmubaraEngine, EventEmitter, StateManager, Logger, engineRegistry, WorkerManager, MetricsManager, RNNoiseEngine, initializeAudioEngine, getEngine, processStream, processStreamChunked, destroyEngine, getEngineStatus, getDiagnostics, onMetricsUpdate, processFile, AudioConverter, getAudioConverter, MurmurabaSuite, useMurmurabaSuite, useAudioProcessor, useSuiteLogger, useAudioProcessing, TOKENS, SUITE_TOKENS, DIContainer, AudioProcessorService, SimpleWaveformAnalyzer, WaveformAnalyzer, SyncedWaveforms, ChunkProcessingResults, AudioPlayer, AdvancedMetricsPanel, ErrorBoundary, withErrorBoundary, BuildInfo, BuildInfoBadge, BuildInfoBlock, BuildInfoInline, VERSION, MURMURABA_VERSION };