/**
 * Tests for AudioExporter
 * TESTING EXPORT FUNCTIONALITY CORRECTLY
 */

import { AudioExporter } from '../../../hooks/murmuraba-engine/audioExporter';
import { vi } from 'vitest';
import { ProcessedChunk } from '../../../hooks/murmuraba-engine/types';
import { AudioConverter } from '../../../utils/audioConverter';

// Mock AudioConverter static methods
vi.mock('../../../utils/audioConverter', () => ({
  AudioConverter: {
    webmToWav: vi.fn().mockResolvedValue(new Blob(['wav data'], { type: 'audio/wav' })),
    webmToMp3: vi.fn().mockResolvedValue(new Blob(['mp3 data'], { type: 'audio/mp3' }))
  }
}));

// Mock fetch
global.fetch = vi.fn();

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn((blob) => `blob:mock-${Date.now()}`);
global.URL.revokeObjectURL = vi.fn();

// Mock document.createElement for download functionality
const mockAnchor = {
  click: vi.fn(),
  href: '',
  download: '',
  style: {}
};

// Ensure document and body exist before mocking
if (typeof document !== 'undefined') {
  vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
  if (document.body) {
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as any);
  }
} else {
  // Fallback for environments without document
  global.document = {
    createElement: vi.fn().mockReturnValue(mockAnchor),
    body: {
      appendChild: vi.fn(),
      removeChild: vi.fn()
    }
  } as any;
}

// Mock console methods
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation();
  vi.spyOn(console, 'error').mockImplementation();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AudioExporter', () => {
  let audioExporter: AudioExporter;
  let mockAudioConverter: AudioConverter;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset timers
    vi.useFakeTimers();
    
    audioExporter = new AudioExporter();
    mockAudioConverter = {} as AudioConverter;
    audioExporter.setAudioConverter(mockAudioConverter);
    
    // Reset fetch mock
    (global.fetch as vi.Mock).mockResolvedValue({
      blob: vi.fn().mockResolvedValue(new Blob(['webm data'], { type: 'audio/webm' }))
    });
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
  
  const createMockChunk = (id: string): ProcessedChunk => ({
    id,
    startTime: 0,
    endTime: 1000,
    duration: 1000,
    processedAudioUrl: `blob:processed-${id}`,
    originalAudioUrl: `blob:original-${id}`,
    isPlaying: false,
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
  
  describe('exportChunkAsWav', () => {
    it('should export chunk as WAV using processed audio', async () => {
      const chunk = createMockChunk('test-1');
      
      const result = await audioExporter.exportChunkAsWav(chunk, 'processed');
      
      expect(global.fetch).toHaveBeenCalledWith('blob:processed-test-1');
      expect(AudioConverter.webmToWav).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('audio/wav');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Exporting chunk test-1 as WAV')
      );
    });
    
    it('should export chunk as WAV using original audio', async () => {
      const chunk = createMockChunk('test-1');
      
      const result = await audioExporter.exportChunkAsWav(chunk, 'original');
      
      expect(global.fetch).toHaveBeenCalledWith('blob:original-test-1');
      expect(AudioConverter.webmToWav).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('audio/wav');
    });
    
    it('should throw error if audio URL is missing', async () => {
      const chunk = createMockChunk('test-1');
      chunk.processedAudioUrl = undefined;
      
      await expect(audioExporter.exportChunkAsWav(chunk, 'processed'))
        .rejects.toThrow('No processed audio URL available');
    });
    
    it('should throw error if audio converter not initialized', async () => {
      const chunk = createMockChunk('test-1');
      const exporter = new AudioExporter(); // No converter set
      
      await expect(exporter.exportChunkAsWav(chunk, 'processed'))
        .rejects.toThrow('Audio converter not initialized');
    });
    
    it('should handle fetch errors', async () => {
      const chunk = createMockChunk('test-1');
      (global.fetch as vi.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      await expect(audioExporter.exportChunkAsWav(chunk, 'processed'))
        .rejects.toThrow('Network error');
    });
  });
  
  describe('exportChunkAsMp3', () => {
    it('should export chunk as MP3 with default bitrate', async () => {
      const chunk = createMockChunk('test-1');
      
      const result = await audioExporter.exportChunkAsMp3(chunk, 'processed');
      
      expect(global.fetch).toHaveBeenCalledWith('blob:processed-test-1');
      expect(AudioConverter.webmToMp3).toHaveBeenCalledWith(
        expect.any(Blob),
        128 // default bitrate
      );
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('audio/mp3');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Exporting chunk test-1 as MP3')
      );
    });
    
    it('should export chunk as MP3 with custom bitrate', async () => {
      const chunk = createMockChunk('test-1');
      
      const result = await audioExporter.exportChunkAsMp3(chunk, 'processed', 192);
      
      expect(AudioConverter.webmToMp3).toHaveBeenCalledWith(
        expect.any(Blob),
        192
      );
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('audio/mp3');
    });
    
    it('should throw error if audio URL is missing', async () => {
      const chunk = createMockChunk('test-1');
      chunk.originalAudioUrl = undefined;
      
      await expect(audioExporter.exportChunkAsMp3(chunk, 'original'))
        .rejects.toThrow('No original audio URL available');
    });
  });
  
  describe('downloadChunk', () => {
    it('should download chunk as WebM directly', async () => {
      const chunk = createMockChunk('test-1');
      chunk.startTime = 1609459200000; // 2021-01-01T00:00:00.000Z
      
      await audioExporter.downloadChunk(chunk, 'webm', 'processed');
      
      expect(mockAnchor.href).toMatch(/^blob:mock-/);
      expect(mockAnchor.download).toBe('enhanced_2021-01-01T00-00-00.webm');
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(document.body.appendChild).toHaveBeenCalledWith(mockAnchor);
      expect(document.body.removeChild).toHaveBeenCalledWith(mockAnchor);
      
      // Fast-forward to verify URL revocation
      vi.advanceTimersByTime(100);
      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });
    
    it('should download chunk as WAV with conversion', async () => {
      const chunk = createMockChunk('test-1');
      chunk.startTime = 1609459200000;
      
      await audioExporter.downloadChunk(chunk, 'wav', 'original');
      
      expect(AudioConverter.webmToWav).toHaveBeenCalled();
      expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(mockAnchor.download).toBe('original_2021-01-01T00-00-00.wav');
      expect(mockAnchor.click).toHaveBeenCalled();
    });
    
    it('should download chunk as MP3 with conversion', async () => {
      const chunk = createMockChunk('test-1');
      chunk.startTime = 1609459200000;
      
      await audioExporter.downloadChunk(chunk, 'mp3', 'processed');
      
      expect(AudioConverter.webmToMp3).toHaveBeenCalled();
      expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(mockAnchor.download).toBe('enhanced_2021-01-01T00-00-00.mp3');
      expect(mockAnchor.click).toHaveBeenCalled();
    });
    
    it('should throw error for unsupported format', async () => {
      const chunk = createMockChunk('test-1');
      
      await expect(audioExporter.downloadChunk(chunk, 'ogg' as any, 'processed'))
        .rejects.toThrow('Unsupported format: ogg');
    });
    
    it('should throw error if WebM URL is missing', async () => {
      const chunk = createMockChunk('test-1');
      chunk.processedAudioUrl = undefined;
      
      await expect(audioExporter.downloadChunk(chunk, 'webm', 'processed'))
        .rejects.toThrow('No processed audio URL available');
    });
    
    it('should log successful download', async () => {
      const chunk = createMockChunk('test-1');
      chunk.startTime = 1609459200000;
      
      await audioExporter.downloadChunk(chunk, 'webm', 'processed');
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Downloaded enhanced_2021-01-01T00-00-00.webm')
      );
    });
  });
  
  describe('Error Handling', () => {
    it('should propagate export errors with WAV', async () => {
      const chunk = createMockChunk('test-1');
      
      (AudioConverter.webmToWav as vi.Mock).mockRejectedValueOnce(new Error('WAV conversion failed'));
      
      await expect(audioExporter.exportChunkAsWav(chunk, 'processed'))
        .rejects.toThrow('WAV conversion failed');
    });
    
    it('should propagate export errors with MP3', async () => {
      const chunk = createMockChunk('test-1');
      
      (AudioConverter.webmToMp3 as vi.Mock).mockRejectedValueOnce(new Error('MP3 conversion failed'));
      
      await expect(audioExporter.exportChunkAsMp3(chunk, 'processed'))
        .rejects.toThrow('MP3 conversion failed');
    });
    
    it('should handle download errors gracefully', async () => {
      const chunk = createMockChunk('test-1');
      
      // Make exportChunkAsWav throw
      (AudioConverter.webmToWav as vi.Mock).mockRejectedValueOnce(new Error('Export failed'));
      
      await expect(audioExporter.downloadChunk(chunk, 'wav', 'processed'))
        .rejects.toThrow('Export failed');
      
      // Verify cleanup didn't happen
      expect(mockAnchor.click).not.toHaveBeenCalled();
    });
  });
});