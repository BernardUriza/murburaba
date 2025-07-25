import { describe, it, expect, vi } from 'vitest';
import { AudioResampler } from '../../utils/AudioResampler';
import { SimpleAGC } from '../../utils/SimpleAGC';
import { AudioConverter, getAudioConverter, destroyAudioConverter } from '../../utils/audioConverter';
import * as performance from '../../utils/performance';
import { MurmurabaProcessor } from '../../utils/MurmurabaProcessor';
import { ChunkStreamManager } from '../../utils/ChunkStreamManager';

// Mock AudioContext
global.AudioContext = vi.fn(() => ({
  sampleRate: 48000,
  createBuffer: vi.fn(),
  createBufferSource: vi.fn(),
  createScriptProcessor: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
  decodeAudioData: vi.fn().mockResolvedValue({
    sampleRate: 48000,
    numberOfChannels: 1,
    length: 48000,
    duration: 1,
    getChannelData: vi.fn(() => new Float32Array(48000)),
  }),
  close: vi.fn(),
  state: 'running',
})) as any;

describe('Utils Simple Coverage', () => {
  describe('AudioResampler', () => {
    it('should create and use AudioResampler', () => {
      const resampler = new AudioResampler(44100, 48000);
      
      const input = new Float32Array(1024);
      const output = resampler.resample(input);
      
      expect(output).toBeInstanceOf(Float32Array);
      
      // Test process method
      const processed = resampler.process(input);
      expect(processed).toBeInstanceOf(Float32Array);
      
      resampler.reset();
    });
  });
  
  describe('SimpleAGC', () => {
    it('should create and use SimpleAGC', () => {
      const agc = new SimpleAGC(48000);
      
      const input = new Float32Array(1024);
      const output = agc.process(input);
      
      expect(output).toBeInstanceOf(Float32Array);
      expect(agc.getGain()).toBe(1.0);
      
      agc.setTargetLevel(0.5);
      agc.reset();
      
      const metrics = agc.getMetrics();
      expect(metrics).toHaveProperty('currentGain');
    });
  });
  
  describe('AudioConverter', () => {
    it('should create and use AudioConverter', async () => {
      const converter = new AudioConverter();
      
      // Test static methods
      expect(AudioConverter.canPlayType('audio/wav')).toBe(false);
      expect(AudioConverter.getBestRecordingFormat()).toContain('audio/');
      
      // Test singleton
      const singleton = getAudioConverter();
      expect(singleton).toBeDefined();
      
      destroyAudioConverter();
    });
  });
  
  describe('Performance utils', () => {
    it('should use performance utilities', () => {
      const result = performance.measurePerformance('test', () => 'result');
      expect(result).toBe('result');
      
      const monitor = performance.createPerformanceMonitor('test');
      monitor.start();
      monitor.mark('checkpoint');
      monitor.end();
      
      const report = performance.getPerformanceReport();
      expect(report).toBeDefined();
      
      performance.resetPerformanceMetrics();
    });
  });
  
  describe('MurmurabaProcessor', () => {
    it('should create MurmurabaProcessor', () => {
      const processor = new MurmurabaProcessor();
      expect(processor).toBeDefined();
      
      // Test process method
      const input = new Float32Array(480);
      const output = processor.process(input);
      expect(output).toHaveProperty('processed');
      expect(output).toHaveProperty('vad');
    });
  });
  
  describe('ChunkStreamManager', () => {
    it('should create ChunkStreamManager', () => {
      const manager = new ChunkStreamManager();
      expect(manager).toBeDefined();
      
      // Test methods
      manager.addChunk(new Float32Array(1024));
      const chunk = manager.getNextChunk(512);
      expect(chunk).toBeInstanceOf(Float32Array);
      
      manager.reset();
    });
  });
});