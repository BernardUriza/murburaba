/**
 * Tests for PlaybackManager
 * TESTING THE ACTUAL API
 */

import { PlaybackManager } from '../../../hooks/murmuraba-engine/playbackManager';
import { vi } from 'vitest';
import { ProcessedChunk } from '../../../hooks/murmuraba-engine/types';

// Mock HTMLAudioElement
class MockAudioElement {
  src: string = '';
  volume: number = 1;
  currentTime: number = 0;
  duration: number = 10;
  paused: boolean = true;
  
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn().mockImplementation(() => { this.paused = true; });
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  load = vi.fn();
}

// Setup global Audio mock
global.Audio = vi.fn((url: string) => {
  const audio = new MockAudioElement();
  audio.src = url;
  return audio;
}) as any;

describe('PlaybackManager', () => {
  let playbackManager: PlaybackManager;
  
  beforeEach(() => {
    vi.clearAllMocks();
    playbackManager = new PlaybackManager();
  });
  
  afterEach(() => {
    playbackManager.cleanup();
  });
  
  const createMockChunk = (id: string, isPlaying = false): ProcessedChunk => ({
    id,
    startTime: 0,
    endTime: 1000,
    duration: 1000,
    processedAudioUrl: `blob:processed-${id}`,
    originalAudioUrl: `blob:original-${id}`,
    isPlaying,
    isExpanded: false,
    isValid: true,
    noiseRemoved: 50,
    originalSize: 1000,
    processedSize: 500,
    metrics: {
      processingLatency: 10,
      frameCount: 100,
      inputLevel: 1,
      outputLevel: 0.5,
      noiseReductionLevel: 0.5,
      timestamp: Date.now(),
      droppedFrames: 0,
    }
  });
  
  describe('toggleChunkPlayback', () => {
    it('should start playback when chunk is not playing', async () => {
      const chunk = createMockChunk('test-1', false);
      const onPlayStateChange = vi.fn();
      
      await playbackManager.toggleChunkPlayback(chunk, 'processed', onPlayStateChange);
      
      const audioElement = (global.Audio as vi.Mock).mock.results[0].value;
      expect(audioElement.play).toHaveBeenCalled();
      expect(onPlayStateChange).toHaveBeenCalledWith('test-1', true);
    });
    
    it('should stop playback when chunk is playing', async () => {
      const chunk = createMockChunk('test-1', true);
      const onPlayStateChange = vi.fn();
      
      await playbackManager.toggleChunkPlayback(chunk, 'processed', onPlayStateChange);
      
      const audioElement = (global.Audio as vi.Mock).mock.results[0].value;
      expect(audioElement.pause).toHaveBeenCalled();
      expect(audioElement.currentTime).toBe(0);
      expect(onPlayStateChange).toHaveBeenCalledWith('test-1', false);
    });
    
    it('should use original audio when specified', async () => {
      const chunk = createMockChunk('test-1', false);
      const onPlayStateChange = vi.fn();
      
      await playbackManager.toggleChunkPlayback(chunk, 'original', onPlayStateChange);
      
      expect(global.Audio).toHaveBeenCalledWith('blob:original-test-1');
    });
    
    it('should handle missing audio URL', async () => {
      const chunk = createMockChunk('test-1', false);
      chunk.processedAudioUrl = undefined;
      const onPlayStateChange = vi.fn();
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();
      
      await playbackManager.toggleChunkPlayback(chunk, 'processed', onPlayStateChange);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('No processed audio URL'),
      );
      expect(onPlayStateChange).not.toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
    
    it('should stop all other audio before playing', async () => {
      const chunk1 = createMockChunk('test-1', false);
      const chunk2 = createMockChunk('test-2', false);
      const onPlayStateChange = vi.fn();
      
      // Play first chunk
      await playbackManager.toggleChunkPlayback(chunk1, 'processed', onPlayStateChange);
      
      // Mock first audio as playing
      const firstAudio = (global.Audio as vi.Mock).mock.results[0].value;
      firstAudio.paused = false;
      
      // Play second chunk
      await playbackManager.toggleChunkPlayback(chunk2, 'processed', onPlayStateChange);
      
      // Get all audio elements after second play
      const allAudioElements = (global.Audio as vi.Mock).mock.results.map(r => r.value);
      
      expect(firstAudio.pause).toHaveBeenCalled();
      expect(allAudioElements[1].play).toHaveBeenCalled();
    });
    
    it('should handle playback errors', async () => {
      const chunk = createMockChunk('test-1', false);
      const onPlayStateChange = vi.fn();
      
      // Make play() reject
      const audioElement = new MockAudioElement();
      audioElement.play = vi.fn().mockRejectedValue(new Error('Play failed'));
      (global.Audio as vi.Mock).mockReturnValueOnce(audioElement);
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();
      
      await playbackManager.toggleChunkPlayback(chunk, 'processed', onPlayStateChange);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to play audio'),
        expect.any(Error)
      );
      expect(onPlayStateChange).toHaveBeenCalledWith('test-1', false);
      
      consoleErrorSpy.mockRestore();
    });
  });
  
  describe('Event Handling', () => {
    it('should handle ended event', async () => {
      const chunk = createMockChunk('test-1', false);
      const onPlayStateChange = vi.fn();
      
      await playbackManager.toggleChunkPlayback(chunk, 'processed', onPlayStateChange);
      
      const audioElement = (global.Audio as vi.Mock).mock.results[0].value;
      const endedHandler = audioElement.addEventListener.mock.calls.find(
        (call: any[]) => call[0] === 'ended'
      )[1];
      
      // Simulate ended event
      endedHandler();
      
      expect(onPlayStateChange).toHaveBeenCalledWith('test-1', false);
    });
    
    it('should handle error event', async () => {
      const chunk = createMockChunk('test-1', false);
      const onPlayStateChange = vi.fn();
      
      await playbackManager.toggleChunkPlayback(chunk, 'processed', onPlayStateChange);
      
      const audioElement = (global.Audio as vi.Mock).mock.results[0].value;
      const errorHandler = audioElement.addEventListener.mock.calls.find(
        (call: any[]) => call[0] === 'error'
      )[1];
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();
      
      // Simulate error event
      errorHandler(new Event('error'));
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Audio playback error'),
        expect.any(Event)
      );
      expect(onPlayStateChange).toHaveBeenCalledWith('test-1', false);
      
      consoleErrorSpy.mockRestore();
    });
  });
  
  describe('stopAllAudio', () => {
    it('should stop all playing audio', async () => {
      const chunks = [
        createMockChunk('test-1', false),
        createMockChunk('test-2', false),
        createMockChunk('test-3', false)
      ];
      const onPlayStateChange = vi.fn();
      
      // Play multiple chunks
      for (const chunk of chunks) {
        await playbackManager.toggleChunkPlayback(chunk, 'processed', onPlayStateChange);
      }
      
      // Mock audio elements as playing
      const audioElements = (global.Audio as vi.Mock).mock.results.map(r => r.value);
      audioElements.forEach(audio => {
        audio.paused = false;
      });
      
      playbackManager.stopAllAudio();
      
      audioElements.forEach(audio => {
        expect(audio.pause).toHaveBeenCalled();
        expect(audio.currentTime).toBe(0);
      });
    });
  });
  
  describe('cleanupChunk', () => {
    it('should cleanup audio elements for specific chunk', async () => {
      const chunk = createMockChunk('test-1', false);
      const onPlayStateChange = vi.fn();
      
      // Create both processed and original audio elements
      await playbackManager.toggleChunkPlayback(chunk, 'processed', onPlayStateChange);
      await playbackManager.toggleChunkPlayback(chunk, 'original', onPlayStateChange);
      
      const audioElements = (global.Audio as vi.Mock).mock.results.map(r => r.value);
      
      playbackManager.cleanupChunk('test-1');
      
      audioElements.forEach(audio => {
        expect(audio.pause).toHaveBeenCalled();
        expect(audio.src).toBe('');
      });
    });
  });
  
  describe('cleanup', () => {
    it('should cleanup all audio elements', async () => {
      const chunks = [
        createMockChunk('test-1', false),
        createMockChunk('test-2', false)
      ];
      const onPlayStateChange = vi.fn();
      
      for (const chunk of chunks) {
        await playbackManager.toggleChunkPlayback(chunk, 'processed', onPlayStateChange);
      }
      
      const audioElements = (global.Audio as vi.Mock).mock.results.map(r => r.value);
      
      playbackManager.cleanup();
      
      audioElements.forEach(audio => {
        expect(audio.pause).toHaveBeenCalled();
        expect(audio.src).toBe('');
      });
    });
  });
  
  describe('Audio Element Reuse', () => {
    it('should reuse audio element for same chunk and type', async () => {
      const chunk = createMockChunk('test-1', false);
      const onPlayStateChange = vi.fn();
      
      // Toggle play twice
      await playbackManager.toggleChunkPlayback(chunk, 'processed', onPlayStateChange);
      chunk.isPlaying = true;
      await playbackManager.toggleChunkPlayback(chunk, 'processed', onPlayStateChange);
      
      // Should only create one audio element
      expect((global.Audio as vi.Mock)).toHaveBeenCalledTimes(1);
    });
    
    it('should create separate audio elements for different types', async () => {
      const chunk = createMockChunk('test-1', false);
      const onPlayStateChange = vi.fn();
      
      await playbackManager.toggleChunkPlayback(chunk, 'processed', onPlayStateChange);
      await playbackManager.toggleChunkPlayback(chunk, 'original', onPlayStateChange);
      
      expect((global.Audio as vi.Mock)).toHaveBeenCalledTimes(2);
      expect((global.Audio as vi.Mock)).toHaveBeenCalledWith('blob:processed-test-1');
      expect((global.Audio as vi.Mock)).toHaveBeenCalledWith('blob:original-test-1');
    });
  });
});