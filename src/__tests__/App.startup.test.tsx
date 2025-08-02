import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import App from '../App';

// Mock all external dependencies that might cause startup issues
vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn(() => Promise.resolve({ isConfirmed: true }))
  }
}));

vi.mock('murmuraba', () => ({
  useMurmubaraEngine: vi.fn(() => ({
    // Engine State
    isInitialized: false,
    isLoading: true,
    error: null,
    metrics: null,
    diagnostics: null,
    
    // Recording State
    recordingState: { isRecording: false, isPaused: false },
    currentStream: null,
    
    // Actions
    initialize: vi.fn(() => Promise.resolve()),
    processFile: vi.fn(() => Promise.resolve()),
    
    // Recording Actions
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    pauseRecording: vi.fn(),
    resumeRecording: vi.fn(),
    clearRecordings: vi.fn(),
    
    // Audio Playback Actions
    toggleChunkPlayback: vi.fn(),
    toggleChunkExpansion: vi.fn(),
    
    // Export Actions
    exportChunkAsWav: vi.fn(),
    exportChunkAsMp3: vi.fn(),
    downloadAllChunksAsZip: vi.fn()
  })),
  getEngineStatus: vi.fn(() => 'idle'),
  AdvancedMetricsPanel: vi.fn(() => <div data-testid="metrics-panel">Metrics Panel</div>)
}));

// Mock the store
const mockStoreState = {
  isDarkMode: false,
  isChatOpen: false,
  toggleChat: vi.fn(),
  isSettingsOpen: false,
  toggleSettings: vi.fn(),
  selectedTab: 'record',
  engineConfig: {
    bufferSize: 4096,
    processWindow: 2048,
    hopSize: 512,
    spectralFloorDb: -60,
    noiseFloorDb: -40,
    denoiseStrength: 0.5,
    enableMetrics: false,
    enableDebugLogs: false,
    adaptiveNoiseReduction: true,
    enableSpectralGating: false,
    workletProcessorPath: '/worklets/audio-processor.js'
  },
  updateEngineConfig: vi.fn(),
  displaySettings: {
    showWaveform: true,
    showMetrics: false,
    theme: 'dark'
  },
  updateDisplaySettings: vi.fn(),
  vadThresholds: {
    low: 0.3,
    high: 0.7
  },
  updateVadThresholds: vi.fn(),
  processedFileResult: null,
  setProcessedFileResult: vi.fn()
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
      <button onClick={onRetry}>Retry</button>
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
    vi.mocked(useMurmubaraEngine).mockReturnValue({
      isInitialized: false,
      isLoading: false,
      error: new Error('WASM loading failed'),
      metrics: null,
      diagnostics: null,
      recordingState: { isRecording: false, isPaused: false },
      currentStream: null,
      initialize: vi.fn(),
      processFile: vi.fn(),
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      pauseRecording: vi.fn(),
      resumeRecording: vi.fn(),
      clearRecordings: vi.fn(),
      toggleChunkPlayback: vi.fn(),
      toggleChunkExpansion: vi.fn(),
      exportChunkAsWav: vi.fn(),
      exportChunkAsMp3: vi.fn(),
      downloadAllChunksAsZip: vi.fn()
    });

    await act(async () => {
      render(<App />);
    });

    expect(screen.getByTestId('wasm-error-display')).toBeInTheDocument();
    expect(screen.getByText('Error: WASM loading failed')).toBeInTheDocument();
  });

  it('should show main content when engine is initialized', async () => {
    const { useMurmubaraEngine } = await import('murmuraba');
    
    // Mock engine as initialized
    vi.mocked(useMurmubaraEngine).mockReturnValue({
      isInitialized: true,
      isLoading: false,
      error: null,
      metrics: null,
      diagnostics: null,
      recordingState: { isRecording: false, isPaused: false },
      currentStream: null,
      initialize: vi.fn(),
      processFile: vi.fn(),
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      pauseRecording: vi.fn(),
      resumeRecording: vi.fn(),
      clearRecordings: vi.fn(),
      toggleChunkPlayback: vi.fn(),
      toggleChunkExpansion: vi.fn(),
      exportChunkAsWav: vi.fn(),
      exportChunkAsMp3: vi.fn(),
      downloadAllChunksAsZip: vi.fn()
    });

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
    const selectorFunction = vi.mocked(useAppStore).mock.calls[0][0];
    expect(typeof selectorFunction).toBe('function');
    
    // Test that selector returns expected shape
    const result = selectorFunction(mockStoreState);
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

    const appElement = screen.getByTestId('error-boundary').firstChild as HTMLElement;
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