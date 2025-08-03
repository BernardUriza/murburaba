import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { BufferSize } from 'murmuraba';

interface EngineConfig {
  bufferSize: BufferSize;
  processWindow: number;
  hopSize: number;
  spectralFloorDb: number;
  noiseFloorDb: number;
  denoiseStrength: number;
  spectralGateThreshold: number;
  smoothingFactor: number;
  frequencyBands: number;
  adaptiveNoiseReduction: boolean;
  enableSpectralGating: boolean;
  enableDynamicRangeCompression: boolean;
  compressionRatio: number;
  compressionThreshold: number;
  compressionKnee: number;
  compressionAttack: number;
  compressionRelease: number;
  webAudioLatencyHint: 'interactive' | 'balanced' | 'playback';
  workletProcessorPath: string;
  enableDebugLogs: boolean;
  enableMetrics: boolean;
  metricsUpdateInterval: number;
  maxChunkRetries: number;
  chunkRetryDelay: number;
  enableAutoGainControl: boolean;
  targetLUFS: number;
  maxGainBoost: number;
  enableHighFrequencyRecovery: boolean;
  highFrequencyThreshold: number;
  enableTransientPreservation: boolean;
  transientThreshold: number;
  enablePsychoacousticModel: boolean;
  psychoacousticMaskingCurve: 'fletcher-munson' | 'equal-loudness' | 'custom';
  workerInitializationTimeout: number;
}

interface DisplaySettings {
  showVadValues: boolean;
  showVadTimeline: boolean;
}

interface VadThresholds {
  silence: number;
  voice: number;
  clearVoice: number;
}

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
  
  isChatOpen: boolean;
  toggleChat: () => void;
  
  isSettingsOpen: boolean;
  toggleSettings: () => void;
  
  isMetricsPanelOpen: boolean;
  toggleMetricsPanel: () => void;
  
  selectedTab: 'record' | 'file' | 'demo';
  setSelectedTab: (tab: 'record' | 'file' | 'demo') => void;
  
  // File Processing State
  processedFileResult: any | null;
  setProcessedFileResult: (result: any | null) => void;
  
  // Recording State (will be managed by murmuraba hook)
  isProcessingAudio: boolean;
  setIsProcessingAudio: (processing: boolean) => void;
}

const defaultEngineConfig: EngineConfig = {
  bufferSize: 4096,
  processWindow: 1024,
  hopSize: 256,
  spectralFloorDb: -80,
  noiseFloorDb: -60,
  denoiseStrength: 0.85,
  spectralGateThreshold: 0.3,
  smoothingFactor: 0.95,
  frequencyBands: 32,
  adaptiveNoiseReduction: true,
  enableSpectralGating: true,
  enableDynamicRangeCompression: true,
  compressionRatio: 4,
  compressionThreshold: -20,
  compressionKnee: 10,
  compressionAttack: 5,
  compressionRelease: 50,
  webAudioLatencyHint: 'balanced',
  workletProcessorPath: '/static/murmuraba-processor.js',
  enableDebugLogs: false,
  enableMetrics: true,
  metricsUpdateInterval: 100,
  maxChunkRetries: 3,
  chunkRetryDelay: 500,
  enableAutoGainControl: true,
  targetLUFS: -16,
  maxGainBoost: 12,
  enableHighFrequencyRecovery: true,
  highFrequencyThreshold: 8000,
  enableTransientPreservation: true,
  transientThreshold: 0.7,
  enablePsychoacousticModel: true,
  psychoacousticMaskingCurve: 'fletcher-munson',
  workerInitializationTimeout: 30000
};

// Create memoized selector cache to prevent getSnapshot infinite loops
const selectorCache = new WeakMap<AppState, Record<string, any>>();

// Helper function to create cached selectors
function createCachedSelector<T>(
  selectorKey: string,
  selectorFn: (state: AppState) => T
): (state: AppState) => T {
  return (state: AppState): T => {
    if (!selectorCache.has(state)) {
      selectorCache.set(state, {});
    }
    
    const cache = selectorCache.get(state)!;
    
    if (!(selectorKey in cache)) {
      cache[selectorKey] = selectorFn(state);
    }
    
    return cache[selectorKey];
  };
}

// Stable selectors to prevent getSnapshot caching issues
export const selectUIState = createCachedSelector('uiState', (state: AppState) => ({
  isDarkMode: state.isDarkMode,
  isChatOpen: state.isChatOpen,
  isSettingsOpen: state.isSettingsOpen,
  isMetricsPanelOpen: state.isMetricsPanelOpen,
  selectedTab: state.selectedTab,
  toggleDarkMode: state.toggleDarkMode,
  toggleChat: state.toggleChat,
  toggleSettings: state.toggleSettings,
  toggleMetricsPanel: state.toggleMetricsPanel,
  setSelectedTab: state.setSelectedTab
}));

export const selectEngineConfig = createCachedSelector('engineConfig', (state: AppState) => ({
  engineConfig: state.engineConfig,
  updateEngineConfig: state.updateEngineConfig
}));

export const selectDisplaySettings = createCachedSelector('displaySettings', (state: AppState) => ({
  displaySettings: state.displaySettings,
  updateDisplaySettings: state.updateDisplaySettings
}));

export const selectVadThresholds = createCachedSelector('vadThresholds', (state: AppState) => ({
  vadThresholds: state.vadThresholds,
  updateVadThresholds: state.updateVadThresholds
}));

export const selectFileState = createCachedSelector('fileState', (state: AppState) => ({
  processedFileResult: state.processedFileResult,
  setProcessedFileResult: state.setProcessedFileResult,
  isProcessingAudio: state.isProcessingAudio,
  setIsProcessingAudio: state.setIsProcessingAudio
}));

// Individual property selectors for even more granular control
export const selectIsDarkMode = (state: AppState) => state.isDarkMode;
export const selectSelectedTab = (state: AppState) => state.selectedTab;
export const selectEngineConfigOnly = (state: AppState) => state.engineConfig;
export const selectIsProcessingAudio = (state: AppState) => state.isProcessingAudio;

// Utility hooks for common usage patterns
export const useUIState = () => useAppStore(selectUIState);
export const useEngineConfig = () => useAppStore(selectEngineConfig);
export const useDisplaySettings = () => useAppStore(selectDisplaySettings);
export const useVadThresholds = () => useAppStore(selectVadThresholds);
export const useFileState = () => useAppStore(selectFileState);

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        // Engine Configuration
        engineConfig: defaultEngineConfig,
        updateEngineConfig: (config) =>
          set((state) => ({
            engineConfig: { ...state.engineConfig, ...config }
          })),
        
        // Display Settings
        displaySettings: {
          showVadValues: true,
          showVadTimeline: true
        },
        updateDisplaySettings: (settings) =>
          set((state) => ({
            displaySettings: { ...state.displaySettings, ...settings }
          })),
        
        // VAD Thresholds
        vadThresholds: {
          silence: 0.2,
          voice: 0.5,
          clearVoice: 0.7
        },
        updateVadThresholds: (thresholds) =>
          set((state) => ({
            vadThresholds: { ...state.vadThresholds, ...thresholds }
          })),
        
        // UI State
        isDarkMode: true,
        toggleDarkMode: () =>
          set((state) => ({ isDarkMode: !state.isDarkMode })),
        
        isChatOpen: false,
        toggleChat: () =>
          set((state) => ({ isChatOpen: !state.isChatOpen })),
        
        isSettingsOpen: false,
        toggleSettings: () =>
          set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
        
        isMetricsPanelOpen: false,
        toggleMetricsPanel: () =>
          set((state) => ({ isMetricsPanelOpen: !state.isMetricsPanelOpen })),
        
        selectedTab: 'record' as 'record' | 'file' | 'demo',
        setSelectedTab: (tab: 'record' | 'file' | 'demo') => set({ selectedTab: tab }),
        
        // File Processing State
        processedFileResult: null,
        setProcessedFileResult: (result) => set({ processedFileResult: result }),
        
        // Recording State
        isProcessingAudio: false,
        setIsProcessingAudio: (processing) => set({ isProcessingAudio: processing })
      }),
      {
        name: 'murmuraba-app-store',
        version: 2, // Increment version to clear old cached data
        // Fix hydration issues that can cause getSnapshot loops
        onRehydrateStorage: () => (state, error) => {
          if (error) {
            console.warn('Store hydration failed:', error);
            return;
          }
          if (state) {
            console.log('Store rehydrated successfully');
            // Note: WeakMap doesn't have clear method, cache will be garbage collected naturally
          }
        },
        // Only persist essential state to minimize hydration complexity
        partialize: (state) => ({
          engineConfig: state.engineConfig,
          displaySettings: state.displaySettings,
          vadThresholds: state.vadThresholds,
          isDarkMode: state.isDarkMode
        }),
        // Additional options to prevent loops
        skipHydration: false,
        // Merge strategy that prevents reference issues
        merge: (persistedState, currentState) => {
          const mergedState = {
            ...currentState,
            ...(persistedState as Partial<AppState>),
          };
          
          // Ensure functions from current state are preserved
          return {
            ...mergedState,
            updateEngineConfig: currentState.updateEngineConfig,
            updateDisplaySettings: currentState.updateDisplaySettings,
            updateVadThresholds: currentState.updateVadThresholds,
            toggleDarkMode: currentState.toggleDarkMode,
            toggleChat: currentState.toggleChat,
            toggleSettings: currentState.toggleSettings,
            setSelectedTab: currentState.setSelectedTab,
            setProcessedFileResult: currentState.setProcessedFileResult,
            setIsProcessingAudio: currentState.setIsProcessingAudio
          };
        },
      }
    )
  )
);