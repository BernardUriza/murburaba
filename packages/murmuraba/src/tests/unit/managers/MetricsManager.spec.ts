import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MetricsManager } from '../../../managers/MetricsManager';

describe('MetricsManager', () => {
  let manager: MetricsManager;
  
  beforeEach(() => {
    vi.useFakeTimers();
    manager = new MetricsManager();
  });
  
  afterEach(() => {
    manager.stopAutoUpdate();
    vi.useRealTimers();
  });
  
  describe('Audio Level Metrics', () => {
    it('should update input level', () => {
      manager.updateInputLevel(0.5);
      
      const metrics = manager.getMetrics();
      expect(metrics.inputLevel).toBe(0.5);
      expect(metrics.peakInputLevel).toBe(0.5);
    });
    
    it('should track peak input level', () => {
      manager.updateInputLevel(0.3);
      manager.updateInputLevel(0.7);
      manager.updateInputLevel(0.5);
      
      const metrics = manager.getMetrics();
      expect(metrics.inputLevel).toBe(0.5);
      expect(metrics.peakInputLevel).toBe(0.7);
    });
    
    it('should update output level', () => {
      manager.updateOutputLevel(0.6);
      
      const metrics = manager.getMetrics();
      expect(metrics.outputLevel).toBe(0.6);
      expect(metrics.peakOutputLevel).toBe(0.6);
    });
    
    it('should track peak output level', () => {
      manager.updateOutputLevel(0.2);
      manager.updateOutputLevel(0.8);
      manager.updateOutputLevel(0.4);
      
      const metrics = manager.getMetrics();
      expect(metrics.outputLevel).toBe(0.4);
      expect(metrics.peakOutputLevel).toBe(0.8);
    });
    
    it('should clamp levels to 0-1 range', () => {
      manager.updateInputLevel(-0.5);
      manager.updateInputLevel(1.5);
      manager.updateOutputLevel(-0.3);
      manager.updateOutputLevel(2.0);
      
      const metrics = manager.getMetrics();
      expect(metrics.inputLevel).toBe(0);
      expect(metrics.peakInputLevel).toBe(1);
      expect(metrics.outputLevel).toBe(0);
      expect(metrics.peakOutputLevel).toBe(1);
    });
  });
  
  describe('Processing Metrics', () => {
    it('should update noise reduction', () => {
      manager.updateNoiseReduction(75.5);
      
      const metrics = manager.getMetrics();
      expect(metrics.noiseReduction).toBe(75.5);
    });
    
    it('should update VAD score', () => {
      manager.updateVADScore(0.85);
      
      const metrics = manager.getMetrics();
      expect(metrics.vadScore).toBe(0.85);
    });
    
    it('should increment frames processed', () => {
      manager.incrementFramesProcessed();
      manager.incrementFramesProcessed();
      manager.incrementFramesProcessed();
      
      const metrics = manager.getMetrics();
      expect(metrics.framesProcessed).toBe(3);
    });
    
    it('should update latency', () => {
      manager.updateLatency(15.5);
      
      const metrics = manager.getMetrics();
      expect(metrics.latency).toBe(15.5);
    });
  });
  
  describe('RMS and Peak Calculations', () => {
    it('should calculate RMS correctly', () => {
      const samples = new Float32Array([0.5, -0.5, 0.5, -0.5]);
      const rms = manager.calculateRMS(samples);
      
      expect(rms).toBeCloseTo(0.5, 5);
    });
    
    it('should handle empty array for RMS', () => {
      const samples = new Float32Array(0);
      const rms = manager.calculateRMS(samples);
      
      expect(rms).toBe(0);
    });
    
    it('should handle silence for RMS', () => {
      const samples = new Float32Array(100); // All zeros
      const rms = manager.calculateRMS(samples);
      
      expect(rms).toBe(0);
    });
    
    it('should calculate peak correctly', () => {
      const samples = new Float32Array([0.2, -0.8, 0.5, -0.3, 0.6]);
      const peak = manager.calculatePeak(samples);
      
      expect(peak).toBe(0.8);
    });
    
    it('should handle empty array for peak', () => {
      const samples = new Float32Array(0);
      const peak = manager.calculatePeak(samples);
      
      expect(peak).toBe(0);
    });
    
    it('should handle all positive values for peak', () => {
      const samples = new Float32Array([0.1, 0.2, 0.9, 0.3]);
      const peak = manager.calculatePeak(samples);
      
      expect(peak).toBe(0.9);
    });
  });
  
  describe('Auto Update', () => {
    it('should start auto update with specified interval', () => {
      const callback = vi.fn();
      manager.on('metrics-update', callback);
      
      manager.startAutoUpdate(100);
      
      // Initially no call
      expect(callback).not.toHaveBeenCalled();
      
      // After 100ms
      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1);
      
      // After another 100ms
      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(2);
    });
    
    it('should stop auto update', () => {
      const callback = vi.fn();
      manager.on('metrics-update', callback);
      
      manager.startAutoUpdate(100);
      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1);
      
      manager.stopAutoUpdate();
      vi.advanceTimersByTime(200);
      expect(callback).toHaveBeenCalledTimes(1); // No more calls
    });
    
    it('should handle multiple start calls', () => {
      const callback = vi.fn();
      manager.on('metrics-update', callback);
      
      manager.startAutoUpdate(100);
      manager.startAutoUpdate(100); // Should replace the first
      
      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1);
    });
    
    it('should emit metrics data on update', () => {
      const callback = vi.fn();
      manager.on('metrics-update', callback);
      
      manager.updateInputLevel(0.5);
      manager.updateOutputLevel(0.3);
      manager.updateNoiseReduction(60);
      
      manager.startAutoUpdate(100);
      vi.advanceTimersByTime(100);
      
      expect(callback).toHaveBeenCalledWith({
        inputLevel: 0.5,
        outputLevel: 0.3,
        peakInputLevel: 0.5,
        peakOutputLevel: 0.3,
        noiseReduction: 60,
        vadScore: 0,
        framesProcessed: 0,
        latency: 0,
        timestamp: expect.any(Number)
      });
    });
  });
  
  describe('Reset Functionality', () => {
    it('should reset all metrics', () => {
      manager.updateInputLevel(0.8);
      manager.updateOutputLevel(0.7);
      manager.updateNoiseReduction(80);
      manager.updateVADScore(0.9);
      manager.incrementFramesProcessed();
      manager.updateLatency(20);
      
      manager.reset();
      
      const metrics = manager.getMetrics();
      expect(metrics).toEqual({
        inputLevel: 0,
        outputLevel: 0,
        peakInputLevel: 0,
        peakOutputLevel: 0,
        noiseReduction: 0,
        vadScore: 0,
        framesProcessed: 0,
        latency: 0,
        timestamp: expect.any(Number)
      });
    });
    
    it('should reset peak levels', () => {
      manager.updateInputLevel(0.9);
      manager.updateOutputLevel(0.8);
      
      manager.reset();
      
      manager.updateInputLevel(0.3);
      manager.updateOutputLevel(0.2);
      
      const metrics = manager.getMetrics();
      expect(metrics.peakInputLevel).toBe(0.3);
      expect(metrics.peakOutputLevel).toBe(0.2);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle rapid updates', () => {
      for (let i = 0; i < 1000; i++) {
        manager.updateInputLevel(Math.random());
        manager.updateOutputLevel(Math.random());
        manager.incrementFramesProcessed();
      }
      
      const metrics = manager.getMetrics();
      expect(metrics.framesProcessed).toBe(1000);
      expect(metrics.inputLevel).toBeGreaterThanOrEqual(0);
      expect(metrics.inputLevel).toBeLessThanOrEqual(1);
    });
    
    it('should handle NaN values', () => {
      manager.updateInputLevel(NaN);
      manager.updateOutputLevel(NaN);
      manager.updateNoiseReduction(NaN);
      
      const metrics = manager.getMetrics();
      expect(metrics.inputLevel).toBe(0);
      expect(metrics.outputLevel).toBe(0);
      expect(metrics.noiseReduction).toBe(0);
    });
    
    it('should handle Infinity values', () => {
      manager.updateInputLevel(Infinity);
      manager.updateOutputLevel(-Infinity);
      
      const metrics = manager.getMetrics();
      expect(metrics.inputLevel).toBe(1);
      expect(metrics.outputLevel).toBe(0);
    });
  });
  
  describe('Event Emission', () => {
    it('should emit level-change events', () => {
      const levelChangeCallback = vi.fn();
      manager.on('level-change', levelChangeCallback);
      
      manager.updateInputLevel(0.5);
      
      expect(levelChangeCallback).toHaveBeenCalledWith({
        type: 'input',
        level: 0.5,
        peak: 0.5
      });
      
      manager.updateOutputLevel(0.3);
      
      expect(levelChangeCallback).toHaveBeenCalledWith({
        type: 'output',
        level: 0.3,
        peak: 0.3
      });
    });
    
    it('should emit processing-stats events', () => {
      const statsCallback = vi.fn();
      manager.on('processing-stats', statsCallback);
      
      manager.updateNoiseReduction(70);
      
      expect(statsCallback).toHaveBeenCalledWith({
        noiseReduction: 70,
        vadScore: 0,
        framesProcessed: 0,
        latency: 0
      });
    });
  });
  
  describe('Getters', () => {
    it('should return current metrics snapshot', () => {
      const timestamp1 = Date.now();
      manager.updateInputLevel(0.4);
      
      const metrics1 = manager.getMetrics();
      expect(metrics1.timestamp).toBeGreaterThanOrEqual(timestamp1);
      
      vi.advanceTimersByTime(100);
      
      const metrics2 = manager.getMetrics();
      expect(metrics2.timestamp).toBeGreaterThan(metrics1.timestamp);
      expect(metrics2.inputLevel).toBe(0.4);
    });
    
    it('should return independent metric snapshots', () => {
      manager.updateInputLevel(0.5);
      
      const metrics1 = manager.getMetrics();
      const metrics2 = manager.getMetrics();
      
      expect(metrics1).not.toBe(metrics2);
      expect(metrics1).toEqual(metrics2);
    });
  });
});