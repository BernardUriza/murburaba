import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { WaveformAnalyzer } from '../WaveformAnalyzer';

// Mock AudioContext and related APIs
const mockAudioContext = {
  createAnalyser: vi.fn(() => ({
    fftSize: 2048,
    smoothingTimeConstant: 0.85,
    frequencyBinCount: 1024,
    connect: vi.fn(),
    disconnect: vi.fn(),
    getByteFrequencyData: vi.fn(),
    getByteTimeDomainData: vi.fn(),
  })),
  createMediaElementSource: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
  createMediaStreamSource: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
  destination: { connect: vi.fn() },
  state: 'running',
  close: vi.fn(),
  resume: vi.fn(),
};

const mockMediaStream = {
  getTracks: vi.fn(() => [
    { 
      kind: 'audio', 
      stop: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
  ]),
  active: true,
};

describe('WaveformAnalyzer Volume Control Bug Fix', () => {
  let mockAudio: any;
  
  beforeEach(() => {
    // Mock HTMLAudioElement
    mockAudio = {
      src: '',
      volume: 1,
      muted: false,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      load: vi.fn(),
      dataset: {},
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    // Mock global APIs
    global.AudioContext = vi.fn(() => mockAudioContext) as any;
    global.HTMLAudioElement = vi.fn(() => mockAudio) as any;
    
    // Mock createElement to return our mock audio element
    const originalCreateElement = document.createElement;
    document.createElement = vi.fn((tagName) => {
      if (tagName === 'audio') {
        return mockAudio;
      }
      return originalCreateElement.call(document, tagName);
    });
    
    // Mock HTMLCanvasElement
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
    }));
    
    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn((cb) => {
      setTimeout(cb, 16);
      return 1;
    });
    global.cancelAnimationFrame = vi.fn();
    
    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should apply volume setting immediately after audio initialization', async () => {
    const testVolume = 0.5;
    const audioUrl = 'test-audio.mp3';
    
    render(
      <WaveformAnalyzer
        audioUrl={audioUrl}
        volume={testVolume}
        hideControls={true}
        isPaused={false}
      />
    );

    // Wait for initialization to complete
    await waitFor(() => {
      expect(mockAudioContext.createAnalyser).toHaveBeenCalled();
    });

    // CRITICAL TEST: Volume should be applied after initialization
    await waitFor(() => {
      expect(mockAudio.volume).toBe(testVolume);
    });
  });

  it('should apply muted setting immediately after audio initialization', async () => {
    const audioUrl = 'test-audio.mp3';
    
    render(
      <WaveformAnalyzer
        audioUrl={audioUrl}
        isMuted={true}
        hideControls={true}
        isPaused={false}
      />
    );

    // Wait for initialization
    await waitFor(() => {
      expect(mockAudioContext.createAnalyser).toHaveBeenCalled();
    });

    // CRITICAL TEST: Muted should be applied after initialization
    await waitFor(() => {
      expect(mockAudio.muted).toBe(true);
    });
  });

  it('should update volume when volume prop changes', async () => {
    const audioUrl = 'test-audio.mp3';
    
    const { rerender } = render(
      <WaveformAnalyzer
        audioUrl={audioUrl}
        volume={0.5}
        hideControls={true}
        isPaused={false}
      />
    );

    // Wait for initial setup
    await waitFor(() => {
      expect(mockAudio.volume).toBe(0.5);
    });

    // Change volume prop
    rerender(
      <WaveformAnalyzer
        audioUrl={audioUrl}
        volume={0.8}
        hideControls={true}
        isPaused={false}
      />
    );

    // CRITICAL TEST: Volume should update when prop changes
    await waitFor(() => {
      expect(mockAudio.volume).toBe(0.8);
    });
  });

  it('should handle volume changes during playback state transitions', async () => {
    const audioUrl = 'test-audio.mp3';
    const testVolume = 0.3;
    
    const { rerender } = render(
      <WaveformAnalyzer
        audioUrl={audioUrl}
        volume={testVolume}
        hideControls={true}
        isPaused={true} // Start paused
      />
    );

    // Wait for setup
    await waitFor(() => {
      expect(mockAudio.volume).toBe(testVolume);
    });

    // Start playing
    rerender(
      <WaveformAnalyzer
        audioUrl={audioUrl}
        volume={testVolume}
        hideControls={true}
        isPaused={false} // Now playing
      />
    );

    // CRITICAL TEST: Volume should persist during play/pause transitions
    await waitFor(() => {
      expect(mockAudio.volume).toBe(testVolume);
      expect(mockAudio.play).toHaveBeenCalled();
    });
  });

  it('should not reset volume to default when audio context is recreated', async () => {
    const audioUrl = 'test-audio.mp3';
    const customVolume = 0.7;
    
    const { rerender } = render(
      <WaveformAnalyzer
        audioUrl={audioUrl}
        volume={customVolume}
        hideControls={true}
      />
    );

    // Wait for initial setup
    await waitFor(() => {
      expect(mockAudio.volume).toBe(customVolume);
    });

    // Force re-initialization by changing audioUrl
    rerender(
      <WaveformAnalyzer
        audioUrl="different-audio.mp3"
        volume={customVolume}
        hideControls={true}
      />
    );

    // CRITICAL TEST: Volume should be reapplied, not reset to default
    await waitFor(() => {
      expect(mockAudio.volume).toBe(customVolume);
    }, { timeout: 2000 });
  });

  it('should handle both volume and mute settings simultaneously', async () => {
    const audioUrl = 'test-audio.mp3';
    const testVolume = 0.4;
    
    render(
      <WaveformAnalyzer
        audioUrl={audioUrl}
        volume={testVolume}
        isMuted={true}
        hideControls={true}
        isPaused={false}
      />
    );

    // Wait for initialization
    await waitFor(() => {
      expect(mockAudioContext.createAnalyser).toHaveBeenCalled();
    });

    // CRITICAL TEST: Both volume and mute should be applied correctly
    await waitFor(() => {
      expect(mockAudio.volume).toBe(testVolume);
      expect(mockAudio.muted).toBe(true);
    });
  });

  it('should apply volume settings when using live stream', async () => {
    const testVolume = 0.6;
    
    render(
      <WaveformAnalyzer
        stream={mockMediaStream as any}
        volume={testVolume}
        isActive={true}
        isPaused={false}
      />
    );

    // For live streams, volume should still be considered even if not directly applied to audio element
    // This test ensures the component doesn't crash with volume prop on live streams
    await waitFor(() => {
      expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledWith(mockMediaStream);
    });
  });

  it('should handle edge case: volume 0 should not be treated as falsy', async () => {
    const audioUrl = 'test-audio.mp3';
    
    render(
      <WaveformAnalyzer
        audioUrl={audioUrl}
        volume={0} // Edge case: volume 0
        hideControls={true}
        isPaused={false}
      />
    );

    // Wait for setup
    await waitFor(() => {
      expect(mockAudioContext.createAnalyser).toHaveBeenCalled();
    });

    // CRITICAL TEST: Volume 0 should be applied correctly, not ignored
    await waitFor(() => {
      expect(mockAudio.volume).toBe(0);
    });
  });

  it('should handle edge case: volume 1 should work correctly', async () => {
    const audioUrl = 'test-audio.mp3';
    
    render(
      <WaveformAnalyzer
        audioUrl={audioUrl}
        volume={1} // Edge case: max volume
        hideControls={true}
        isPaused={false}
      />
    );

    // Wait for setup
    await waitFor(() => {
      expect(mockAudioContext.createAnalyser).toHaveBeenCalled();
    });

    // CRITICAL TEST: Max volume should be applied correctly
    await waitFor(() => {
      expect(mockAudio.volume).toBe(1);
    });
  });
});