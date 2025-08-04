import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import App from '../App';
import type { UseMurmubaraEngineReturn, BufferSize } from 'murmuraba';

// Mock all external dependencies that might cause startup issues
vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn(() => Promise.resolve({ isConfirmed: true }))
  }
}));

// Helper to create complete mock engine return
const createMockEngineReturn = (overrides: Partial<UseMurmubaraEngineReturn> = {}): UseMurmubaraEngineReturn => ({
  // State
  isInitialized: false,
  isLoading: true,
  error: null,
  engineState: 'idle' as any,
  metrics: null,
  diagnostics: null,
  
  // Recording State
  recordingState: { 
    isRecording: false, 
    isPaused: false, 
    recordingTime: 0, 
    chunks: [], 
    playingChunks: {}, 
    expandedChunk: null 
  },
  currentStream: null,
  streamController: null,
  
  // Actions
  initialize: vi.fn(() => Promise.resolve()),
  destroy: vi.fn(() => Promise.resolve()),
  processStream: vi.fn(() => Promise.resolve({} as any)),
  processStreamChunked: vi.fn(() => Promise.resolve({} as any)),
  processFile: vi.fn(() => Promise.resolve(new ArrayBuffer(0))),
  
  // Recording Actions
  startRecording: vi.fn(() => Promise.resolve()),
  stopRecording: vi.fn(),
  pauseRecording: vi.fn(),
  resumeRecording: vi.fn(),
  clearRecordings: vi.fn(),
  
  // Audio Playback Actions
  toggleChunkPlayback: vi.fn(() => Promise.resolve()),
  toggleChunkExpansion: vi.fn(),
  
  // Export Actions
  exportChunkAsWav: vi.fn(() => Promise.resolve(new Blob())),
  exportChunkAsMp3: vi.fn(() => Promise.resolve(new Blob())),
  downloadChunk: vi.fn(() => Promise.resolve()),
  downloadAllChunksAsZip: vi.fn(() => Promise.resolve()),
  
  // Gain Control
  inputGain: 1.0,
  setInputGain: vi.fn(),
  getInputGain: vi.fn(() => 1.0),
  
  // Utility
  getDiagnostics: vi.fn(() => null),
  resetError: vi.fn(),
  formatTime: vi.fn((seconds: number) => `${seconds}s`),
  getAverageNoiseReduction: vi.fn(() => 0.5),
  
  ...overrides
});

vi.mock('murmuraba', () => ({
  useMurmubaraEngine: vi.fn(() => createMockEngineReturn()),
  getEngineStatus: vi.fn(() => 'idle'),
  AdvancedMetricsPanel: vi.fn(() => <div data-testid="metrics-panel">Metrics Panel</div>)
}));

// Mock the store
const mockStoreState = {
  // Engine Configuration
  engineConfig: {
    bufferSize: 4096 as BufferSize,
    processWindow: 2048,
    hopSize: 512,
    spectralFloorDb: -60,
    noiseFloorDb: -40,
    denoiseStrength: 0.5,
    spectralGateThreshold: 0.4,
    smoothingFactor: 0.8,
    frequencyBands: 10,
    adaptiveNoiseReduction: true,
    enableSpectralGating: false,
    enableDynamicRangeCompression: false,
    compressionRatio: 4.0,
    compressionThreshold: -18,
    compressionKnee: 5,
    compressionAttack: 5,
    compressionRelease: 100,
    webAudioLatencyHint: 'interactive' as const,
    workletProcessorPath: '/worklets/audio-processor.js',
    enableDebugLogs: false,
    enableMetrics: false,
    metricsUpdateInterval: 1000,
    maxChunkRetries: 3,
    chunkRetryDelay: 500,
    enableAutoGainControl: false,
    targetLUFS: -23,
    maxGainBoost: 12,
    enableHighFrequencyRecovery: false,
    highFrequencyThreshold: 8000,
    enableTransientPreservation: false,
    transientThreshold: 0.7,
    enablePsychoacousticModel: false,
    psychoacousticMaskingCurve: 'fletcher-munson' as const,
    workerInitializationTimeout: 5000
  },
  updateEngineConfig: vi.fn(),
  
  // Display Settings
  displaySettings: {
    showVadValues: true,
    showVadTimeline: false
  },
  updateDisplaySettings: vi.fn(),
  
  // VAD Thresholds
  vadThresholds: {
    silence: 0.3,
    voice: 0.7,
    clearVoice: 0.9
  },
  updateVadThresholds: vi.fn(),
  
  // UI State
  isDarkMode: false,
  toggleDarkMode: vi.fn(),
  
  isChatOpen: false,
  toggleChat: vi.fn(),
  
  isSettingsOpen: false,
  toggleSettings: vi.fn(),
  
  isMetricsPanelOpen: false,
  toggleMetricsPanel: vi.fn(),
  
  selectedTab: 'record' as const,
  setSelectedTab: vi.fn(),
  
  // File Processing State
  processedFileResult: null,
  setProcessedFileResult: vi.fn(),
  
  // Recording State
  isProcessingAudio: false,
  setIsProcessingAudio: vi.fn()
};

vi.mock('../core/store/useAppStore', () => ({
  useAppStore: vi.fn((selector) => selector(mockStoreState))
}));

// Mock the hooks
vi.mock('../hooks', () => ({
  useEngineEffects: vi.fn()
}));

// Mock all the components to isolate App startup
vi.mock('../components/wasm-error-display/wasm-error-display', () => ({
  WASMErrorDisplay: vi.fn(({ error, onRetry }) => 
    <div data-testid="wasm-error-display">
      <div>Error: {error.message}</div>
      <button 
        onClick={onRetry}
        aria-label="Retry loading WASM module"
      >
        Retry
      </button>
    </div>
  )
}));

vi.mock('../components/copilot-chat/copilot-chat', () => ({
  CopilotChat: vi.fn(() => <div data-testid="copilot-chat">Copilot Chat</div>)
}));

vi.mock('../components/settings/settings', () => ({
  Settings: vi.fn(() => <div data-testid="settings">Settings</div>)
}));

vi.mock('../components/app-header', () => ({
  AppHeader: vi.fn(() => <div data-testid="app-header">App Header</div>)
}));

vi.mock('../components/tab-content', () => ({
  TabContent: vi.fn(() => <div data-testid="tab-content">Tab Content</div>)
}));

vi.mock('../shared/components/ErrorBoundary', () => ({
  ErrorBoundary: vi.fn(({ children, onError }) => {
    try {
      return <div data-testid="error-boundary">{children}</div>;
    } catch (error) {
      onError?.(error, {});
      return <div data-testid="error-boundary-fallback">Error occurred</div>;
    }
  })
}));

vi.mock('../shared/components/AsyncBoundary', () => ({
  AsyncBoundary: vi.fn(({ children, fallback }) => 
    <div data-testid="async-boundary">{children || fallback}</div>
  )
}));

vi.mock('../core/services/Logger', () => ({
  Logger: {
    error: vi.fn(),
    fatal: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn()
  }
}));

describe('App Startup Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render without crashing', async () => {
    await act(async () => {
      render(<App />);
    });

    // Check that the basic structure is rendered
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    expect(screen.getByTestId('app-header')).toBeInTheDocument();
  });

  it('should show loading state when engine is not initialized', async () => {
    await act(async () => {
      render(<App />);
    });

    // Should show loading spinner when not initialized
    expect(screen.getByText('Initializing audio engine...')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveClass('app-main');
  });

  it('should show error display when there is an engine error', async () => {
    const { useMurmubaraEngine } = await import('murmuraba');
    
    // Mock engine with error
    vi.mocked(useMurmubaraEngine).mockReturnValue(createMockEngineReturn({
      isInitialized: false,
      isLoading: false,
      error: 'WASM loading failed'
    }));

    await act(async () => {
      render(<App />);
    });

    expect(screen.getByTestId('wasm-error-display')).toBeInTheDocument();
    expect(screen.getByText('Error: WASM loading failed')).toBeInTheDocument();
  });

  it('should show main content when engine is initialized', async () => {
    const { useMurmubaraEngine } = await import('murmuraba');
    
    // Mock engine as initialized
    vi.mocked(useMurmubaraEngine).mockReturnValue(createMockEngineReturn({
      isInitialized: true,
      isLoading: false,
      error: null
    }));

    await act(async () => {
      render(<App />);
    });

    expect(screen.getByTestId('tab-content')).toBeInTheDocument();
    expect(screen.queryByText('Initializing audio engine...')).not.toBeInTheDocument();
  });

  it('should handle store state correctly', async () => {
    const { useAppStore } = await import('../core/store/useAppStore');
    
    // Verify store is called with correct selector
    await act(async () => {
      render(<App />);
    });

    expect(useAppStore).toHaveBeenCalled();
    const mockCalls = vi.mocked(useAppStore).mock.calls;
    expect(mockCalls.length).toBeGreaterThan(0);
    const selectorFunction = mockCalls[0]?.[0];
    expect(typeof selectorFunction).toBe('function');
    
    // Test that selector returns expected shape
    const result = selectorFunction!(mockStoreState);
    expect(result).toHaveProperty('isDarkMode');
    expect(result).toHaveProperty('engineConfig');
    expect(result).toHaveProperty('toggleChat');
  });

  it('should apply dark mode class correctly', async () => {
    const mockStoreWithDarkMode = {
      ...mockStoreState,
      isDarkMode: true
    };

    const { useAppStore } = await import('../core/store/useAppStore');
    vi.mocked(useAppStore).mockImplementation((selector) => selector(mockStoreWithDarkMode));

    await act(async () => {
      render(<App />);
    });

    const errorBoundary = screen.getByTestId('error-boundary');
    const appElement = errorBoundary.firstChild as HTMLElement | null;
    expect(appElement).not.toBeNull();
    expect(appElement).toHaveClass('app', 'dark');
  });

  it('should not crash with console.log calls', async () => {
    // This test specifically checks that console.log calls don't break anything
    await act(async () => {
      render(<App />);
    });

    // Verify console.log was called (App has debug logs)
    expect(console.log).toHaveBeenCalledWith('App component rendering...');
    expect(console.log).toHaveBeenCalledWith('Store subscription successful');
  });
});