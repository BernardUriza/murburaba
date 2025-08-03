import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppStore } from '../useAppStore';

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { setState } = useAppStore;
    act(() => {
      setState({
        isDarkMode: false,
        isChatOpen: false,
        isSettingsOpen: false,
        selectedTab: 'record',
        processedFileResult: null,
        isProcessingAudio: false,
        displaySettings: {
          showVadValues: true,
          showVadTimeline: true
        },
        vadThresholds: {
          silence: 0.2,
          voice: 0.5,
          clearVoice: 0.7
        }
      });
    });
  });

  describe('Engine Configuration', () => {
    it('has default engine config', () => {
      const { result } = renderHook(() => useAppStore());
      
      expect(result.current.engineConfig).toMatchObject({
        bufferSize: 16384,
        processWindow: 1024,
        hopSize: 256,
        spectralFloorDb: -80,
        noiseFloorDb: -60,
        denoiseStrength: 0.85
      });
    });

    it('updates engine config partially', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.updateEngineConfig({
          bufferSize: 4096,
          denoiseStrength: 0.95
        });
      });
      
      expect(result.current.engineConfig.bufferSize).toBe(4096);
      expect(result.current.engineConfig.denoiseStrength).toBe(0.95);
      expect(result.current.engineConfig.processWindow).toBe(1024); // unchanged
    });
  });

  describe('Display Settings', () => {
    it('has default display settings', () => {
      const { result } = renderHook(() => useAppStore());
      
      expect(result.current.displaySettings).toEqual({
        showVadValues: true,
        showVadTimeline: true
      });
    });

    it('updates display settings', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.updateDisplaySettings({
          showVadValues: false
        });
      });
      
      expect(result.current.displaySettings.showVadValues).toBe(false);
      expect(result.current.displaySettings.showVadTimeline).toBe(true);
    });
  });

  describe('VAD Thresholds', () => {
    it('has default VAD thresholds', () => {
      const { result } = renderHook(() => useAppStore());
      
      expect(result.current.vadThresholds).toEqual({
        silence: 0.2,
        voice: 0.5,
        clearVoice: 0.7
      });
    });

    it('updates VAD thresholds', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.updateVadThresholds({
          silence: 0.3,
          voice: 0.6
        });
      });
      
      expect(result.current.vadThresholds.silence).toBe(0.3);
      expect(result.current.vadThresholds.voice).toBe(0.6);
      expect(result.current.vadThresholds.clearVoice).toBe(0.7);
    });
  });

  describe('UI State', () => {
    it('toggles dark mode', () => {
      const { result } = renderHook(() => useAppStore());
      
      expect(result.current.isDarkMode).toBe(false);
      
      act(() => {
        result.current.toggleDarkMode();
      });
      
      expect(result.current.isDarkMode).toBe(true);
      
      act(() => {
        result.current.toggleDarkMode();
      });
      
      expect(result.current.isDarkMode).toBe(false);
    });

    it('toggles chat', () => {
      const { result } = renderHook(() => useAppStore());
      
      expect(result.current.isChatOpen).toBe(false);
      
      act(() => {
        result.current.toggleChat();
      });
      
      expect(result.current.isChatOpen).toBe(true);
    });

    it('toggles settings', () => {
      const { result } = renderHook(() => useAppStore());
      
      expect(result.current.isSettingsOpen).toBe(false);
      
      act(() => {
        result.current.toggleSettings();
      });
      
      expect(result.current.isSettingsOpen).toBe(true);
    });

    it('changes selected tab', () => {
      const { result } = renderHook(() => useAppStore());
      
      expect(result.current.selectedTab).toBe('record');
      
      act(() => {
        result.current.setSelectedTab('file');
      });
      
      expect(result.current.selectedTab).toBe('file');
      
      act(() => {
        result.current.setSelectedTab('demo');
      });
      
      expect(result.current.selectedTab).toBe('demo');
    });
  });

  describe('File Processing State', () => {
    it('sets processed file result', () => {
      const { result } = renderHook(() => useAppStore());
      
      const mockResult = {
        success: true,
        processedUrl: 'blob://processed',
        originalSize: 1000,
        processedSize: 800
      };
      
      act(() => {
        result.current.setProcessedFileResult(mockResult);
      });
      
      expect(result.current.processedFileResult).toEqual(mockResult);
      
      act(() => {
        result.current.setProcessedFileResult(null);
      });
      
      expect(result.current.processedFileResult).toBeNull();
    });
  });

  describe('Recording State', () => {
    it('sets processing audio state', () => {
      const { result } = renderHook(() => useAppStore());
      
      expect(result.current.isProcessingAudio).toBe(false);
      
      act(() => {
        result.current.setIsProcessingAudio(true);
      });
      
      expect(result.current.isProcessingAudio).toBe(true);
      
      act(() => {
        result.current.setIsProcessingAudio(false);
      });
      
      expect(result.current.isProcessingAudio).toBe(false);
    });
  });

  describe('Persistence', () => {
    it('persists only specified state properties', () => {
      const { result } = renderHook(() => useAppStore());
      
      // These should be persisted
      const persistedState = {
        engineConfig: result.current.engineConfig,
        displaySettings: result.current.displaySettings,
        vadThresholds: result.current.vadThresholds,
        isDarkMode: result.current.isDarkMode
      };
      
      // These should NOT be persisted
      act(() => {
        result.current.toggleChat();
        result.current.toggleSettings();
        result.current.setSelectedTab('demo');
      });
      
      // Simulate page reload by getting a new store instance
      const { result: newResult } = renderHook(() => useAppStore());
      
      // Persisted state should remain
      expect(newResult.current.engineConfig).toEqual(persistedState.engineConfig);
      expect(newResult.current.displaySettings).toEqual(persistedState.displaySettings);
      expect(newResult.current.vadThresholds).toEqual(persistedState.vadThresholds);
      expect(newResult.current.isDarkMode).toEqual(persistedState.isDarkMode);
      
      // Non-persisted state should reset
      expect(newResult.current.isChatOpen).toBe(false);
      expect(newResult.current.isSettingsOpen).toBe(false);
      expect(newResult.current.selectedTab).toBe('record');
    });
  });
});