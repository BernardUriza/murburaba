import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface EngineConfig {
  bufferSize: number;
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
  bufferSize: 16384,
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
  psychoacousticMaskingCurve: 'fletcher-munson'
};

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
        isDarkMode: false,
        toggleDarkMode: () =>
          set((state) => ({ isDarkMode: !state.isDarkMode })),
        
        isChatOpen: false,
        toggleChat: () =>
          set((state) => ({ isChatOpen: !state.isChatOpen })),
        
        isSettingsOpen: false,
        toggleSettings: () =>
          set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
        
        selectedTab: 'record',
        setSelectedTab: (tab) => set({ selectedTab: tab }),
        
        // File Processing State
        processedFileResult: null,
        setProcessedFileResult: (result) => set({ processedFileResult: result }),
        
        // Recording State
        isProcessingAudio: false,
        setIsProcessingAudio: (processing) => set({ isProcessingAudio: processing })
      }),
      {
        name: 'murmuraba-app-store',
        partialize: (state) => ({
          engineConfig: state.engineConfig,
          displaySettings: state.displaySettings,
          vadThresholds: state.vadThresholds,
          isDarkMode: state.isDarkMode
        })
      }
    )
  )
);