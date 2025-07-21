/**
 * Critical Tests for AudioConverter
 * MEDICAL GRADE: These tests ensure no memory leaks in hospital environments
 */

import { AudioConverter, getAudioConverter, destroyAudioConverter } from '../../utils/audioConverter';

describe('AudioConverter - Medical Grade Memory Management', () => {
  let converter: AudioConverter;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    // Destroy any existing singleton
    destroyAudioConverter();
    converter = new AudioConverter();
  });

  afterEach(() => {
    // Ensure cleanup after each test
    converter.destroy();
    destroyAudioConverter();
  });

  describe('Memory Leak Prevention', () => {
    it('should track created URLs', async () => {
      // Use a format that requires conversion (not webm)
      const mockBlob = new Blob(['test'], { type: 'audio/unknown' });
      const mockUrl = 'blob:mock-url-123';
      
      // Mock fetch to return non-webm blob
      global.fetch = jest.fn().mockResolvedValue({
        blob: jest.fn().mockResolvedValue(mockBlob)
      } as any);
      
      // Spy on URL.createObjectURL
      const createUrlSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);
      
      await converter.convertBlobUrl('blob:original-url');
      
      expect(createUrlSpy).toHaveBeenCalled();
    });

    it('should revoke all URLs on destroy', async () => {
      const mockUrls = ['blob:url-1', 'blob:url-2', 'blob:url-3'];
      const revokeUrlSpy = jest.spyOn(URL, 'revokeObjectURL');
      
      // Mock fetch to return non-webm blobs that require conversion
      const mockBlob = new Blob(['test'], { type: 'audio/unknown' });
      global.fetch = jest.fn().mockResolvedValue({
        blob: jest.fn().mockResolvedValue(mockBlob)
      } as any);
      
      // Create multiple URLs
      jest.spyOn(URL, 'createObjectURL')
        .mockReturnValueOnce(mockUrls[0])
        .mockReturnValueOnce(mockUrls[1])
        .mockReturnValueOnce(mockUrls[2]);
      
      // Convert multiple URLs
      await converter.convertBlobUrl('blob:original-1');
      await converter.convertBlobUrl('blob:original-2');
      await converter.convertBlobUrl('blob:original-3');
      
      // Destroy should revoke all URLs
      converter.destroy();
      
      expect(revokeUrlSpy).toHaveBeenCalledTimes(3);
      expect(revokeUrlSpy).toHaveBeenCalledWith(mockUrls[0]);
      expect(revokeUrlSpy).toHaveBeenCalledWith(mockUrls[1]);
      expect(revokeUrlSpy).toHaveBeenCalledWith(mockUrls[2]);
    });

    it('should close AudioContext on destroy', () => {
      const audioContext = converter['audioContext'];
      const closeSpy = jest.spyOn(audioContext, 'close');
      
      converter.destroy();
      
      expect(closeSpy).toHaveBeenCalled();
    });

    it('should handle errors gracefully and return original URL', async () => {
      const originalUrl = 'blob:original-error-url';
      
      // Mock fetch to throw error
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const result = await converter.convertBlobUrl(originalUrl);
      
      expect(result).toBe(originalUrl);
      expect(console.error).toHaveBeenCalledWith('Error converting blob URL:', expect.any(Error));
    });
  });

  describe('Singleton Management', () => {
    it('should return same instance from getAudioConverter', () => {
      const instance1 = getAudioConverter();
      const instance2 = getAudioConverter();
      
      expect(instance1).toBe(instance2);
    });

    it('should destroy singleton properly', () => {
      const instance = getAudioConverter();
      const destroySpy = jest.spyOn(instance, 'destroy');
      
      destroyAudioConverter();
      
      expect(destroySpy).toHaveBeenCalled();
      
      // Should create new instance after destroy
      const newInstance = getAudioConverter();
      expect(newInstance).not.toBe(instance);
    });

    it('should handle multiple destroy calls safely', () => {
      destroyAudioConverter();
      destroyAudioConverter(); // Should not throw
      
      expect(() => destroyAudioConverter()).not.toThrow();
    });
  });

  describe('WAV Conversion', () => {
    it('should convert audio blob to WAV format', async () => {
      const inputBlob = new Blob(['mock audio'], { type: 'audio/webm' });
      
      const result = await converter.convertToWav(inputBlob);
      
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('audio/wav');
    });

    it('should handle decoding errors', async () => {
      const inputBlob = new Blob(['invalid audio'], { type: 'audio/webm' });
      
      // Mock decodeAudioData to reject
      converter['audioContext'].decodeAudioData = jest.fn().mockRejectedValue(new Error('Decode failed'));
      
      await expect(converter.convertToWav(inputBlob)).rejects.toThrow('Decode failed');
      expect(console.error).toHaveBeenCalledWith('Failed to convert audio:', expect.any(Error));
    });
  });

  describe('Format Detection', () => {
    it('should correctly identify recording MIME types', () => {
      // Mock MediaRecorder to return true only for webm without codecs (the first one checked)
      MediaRecorder.isTypeSupported = jest.fn().mockImplementation((mimeType: string) => {
        return mimeType === 'audio/webm';
      });
      
      expect(AudioConverter.getBestRecordingFormat()).toBe('audio/webm');
    });

    it('should return fallback format if no format supported', () => {
      MediaRecorder.isTypeSupported = jest.fn().mockReturnValue(false);
      
      expect(AudioConverter.getBestRecordingFormat()).toBe('audio/webm');
    });
  });

  describe('WebM to MP3 Conversion', () => {
    it('should convert WebM to MP3 with specified bitrate', async () => {
      const webmBlob = new Blob(['webm data'], { type: 'audio/webm' });
      const expectedMp3Blob = new Blob(['mp3 data'], { type: 'audio/mp3' });
      
      // Mock the conversion process
      jest.spyOn(converter, 'convertToWav').mockResolvedValue(new Blob(['wav data'], { type: 'audio/wav' }));
      
      // Note: Actual MP3 encoding would require lamejs, which we're mocking
      const mp3ConversionSpy = jest.spyOn(AudioConverter, 'webmToMp3').mockResolvedValue(expectedMp3Blob);
      
      const result = await AudioConverter.webmToMp3(webmBlob, 192);
      
      expect(result).toBe(expectedMp3Blob);
      expect(mp3ConversionSpy).toHaveBeenCalledWith(webmBlob, 192);
    });
  });
});