import { describe, it, expect } from 'vitest';
import {
  MAX_CHUNKS_IN_MEMORY,
  CHUNKS_TO_KEEP_ON_OVERFLOW,
  MIN_VALID_BLOB_SIZE,
  DEFAULT_CHUNK_DURATION,
  RECORDING_UPDATE_INTERVAL,
  DEFAULT_MP3_BITRATE,
  SUPPORTED_MIME_TYPES,
  LOG_PREFIX
} from '../../../hooks/murmuraba-engine/constants';

describe('murmuraba-engine constants', () => {
  describe('Memory management constants', () => {
    it('should define MAX_CHUNKS_IN_MEMORY', () => {
      expect(MAX_CHUNKS_IN_MEMORY).toBe(100);
      expect(typeof MAX_CHUNKS_IN_MEMORY).toBe('number');
    });

    it('should define CHUNKS_TO_KEEP_ON_OVERFLOW', () => {
      expect(CHUNKS_TO_KEEP_ON_OVERFLOW).toBe(90);
      expect(typeof CHUNKS_TO_KEEP_ON_OVERFLOW).toBe('number');
    });

    it('should have CHUNKS_TO_KEEP_ON_OVERFLOW less than MAX_CHUNKS_IN_MEMORY', () => {
      expect(CHUNKS_TO_KEEP_ON_OVERFLOW).toBeLessThan(MAX_CHUNKS_IN_MEMORY);
    });
  });

  describe('Recording quality constants', () => {
    it('should define MIN_VALID_BLOB_SIZE', () => {
      expect(MIN_VALID_BLOB_SIZE).toBe(100);
      expect(typeof MIN_VALID_BLOB_SIZE).toBe('number');
    });

    it('should define DEFAULT_CHUNK_DURATION', () => {
      expect(DEFAULT_CHUNK_DURATION).toBe(8);
      expect(typeof DEFAULT_CHUNK_DURATION).toBe('number');
    });

    it('should define RECORDING_UPDATE_INTERVAL', () => {
      expect(RECORDING_UPDATE_INTERVAL).toBe(100);
      expect(typeof RECORDING_UPDATE_INTERVAL).toBe('number');
    });
  });

  describe('Audio export constants', () => {
    it('should define DEFAULT_MP3_BITRATE', () => {
      expect(DEFAULT_MP3_BITRATE).toBe(128);
      expect(typeof DEFAULT_MP3_BITRATE).toBe('number');
    });

    it('should define SUPPORTED_MIME_TYPES', () => {
      expect(SUPPORTED_MIME_TYPES).toEqual({
        WEBM: 'audio/webm',
        MP3: 'audio/mp3',
        WAV: 'audio/wav'
      });
    });

    it('should have correct mime type values', () => {
      expect(SUPPORTED_MIME_TYPES.WEBM).toBe('audio/webm');
      expect(SUPPORTED_MIME_TYPES.MP3).toBe('audio/mp3');
      expect(SUPPORTED_MIME_TYPES.WAV).toBe('audio/wav');
    });

    it('should be readonly object', () => {
      // TypeScript ensures this at compile time, but we can verify the structure
      const keys = Object.keys(SUPPORTED_MIME_TYPES);
      expect(keys).toEqual(['WEBM', 'MP3', 'WAV']);
    });
  });

  describe('Logging constants', () => {
    it('should define LOG_PREFIX', () => {
      expect(LOG_PREFIX).toEqual({
        LIFECYCLE: '[LIFECYCLE]',
        CONCAT_STREAM: '[CONCAT-STREAM]',
        MEDICAL_MEMORY: '[MEDICAL-MEMORY]',
        ERROR: '[ERROR]',
        EXPORT: '[EXPORT]',
        RECORDING: '[RECORDING]'
      });
    });

    it('should have correct log prefix values', () => {
      expect(LOG_PREFIX.LIFECYCLE).toBe('[LIFECYCLE]');
      expect(LOG_PREFIX.CONCAT_STREAM).toBe('[CONCAT-STREAM]');
      expect(LOG_PREFIX.MEDICAL_MEMORY).toBe('[MEDICAL-MEMORY]');
      expect(LOG_PREFIX.ERROR).toBe('[ERROR]');
      expect(LOG_PREFIX.EXPORT).toBe('[EXPORT]');
      expect(LOG_PREFIX.RECORDING).toBe('[RECORDING]');
    });

    it('should have all prefixes wrapped in brackets', () => {
      Object.values(LOG_PREFIX).forEach(prefix => {
        expect(prefix).toMatch(/^\[.+\]$/);
      });
    });
  });

  describe('Medical-grade validations', () => {
    it('should have appropriate chunk duration for medical consultations', () => {
      // 8 seconds is a good balance for medical recordings
      expect(DEFAULT_CHUNK_DURATION).toBeGreaterThanOrEqual(5);
      expect(DEFAULT_CHUNK_DURATION).toBeLessThanOrEqual(10);
    });

    it('should calculate correct memory duration', () => {
      // ~13 minutes at 8s chunks
      const totalDuration = MAX_CHUNKS_IN_MEMORY * DEFAULT_CHUNK_DURATION;
      const expectedMinutes = totalDuration / 60;
      expect(expectedMinutes).toBeCloseTo(13.33, 1);
    });

    it('should have reasonable update interval for UI', () => {
      // 100ms provides smooth updates without overwhelming the UI
      expect(RECORDING_UPDATE_INTERVAL).toBeGreaterThanOrEqual(50);
      expect(RECORDING_UPDATE_INTERVAL).toBeLessThanOrEqual(200);
    });

    it('should have standard MP3 bitrate for quality', () => {
      // 128 kbps is standard quality for voice recordings
      expect(DEFAULT_MP3_BITRATE).toBe(128);
    });
  });
});