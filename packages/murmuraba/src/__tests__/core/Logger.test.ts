import { Logger } from '../../core/Logger';
import { vi } from 'vitest';
import { LogLevel } from '../../types';

describe('Logger', () => {
  let logger: Logger;
  let consoleError: vi.SpyInstance;
  let consoleWarn: vi.SpyInstance;
  let consoleLog: vi.SpyInstance;

  beforeEach(() => {
    logger = new Logger();
    consoleError = vi.spyOn(console, 'error').mockImplementation();
    consoleWarn = vi.spyOn(console, 'warn').mockImplementation();
    consoleLog = vi.spyOn(console, 'log').mockImplementation();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00.000Z'));
  });

  afterEach(() => {
    consoleError.mockRestore();
    consoleWarn.mockRestore();
    consoleLog.mockRestore();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should use default prefix', () => {
      logger.info('test');
      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[Murmuraba]')
      );
    });

    it('should use custom prefix', () => {
      const customLogger = new Logger('[Custom]');
      customLogger.info('test');
      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[Custom]')
      );
    });
  });

  describe('setLevel()', () => {
    it('should change log level', () => {
      logger.setLevel('error');
      
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');
      
      expect(consoleLog).not.toHaveBeenCalled();
      expect(consoleWarn).not.toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalledTimes(1);
    });

    it('should handle none level', () => {
      logger.setLevel('none');
      
      logger.error('should not log');
      logger.warn('should not log');
      logger.info('should not log');
      logger.debug('should not log');
      
      expect(consoleError).not.toHaveBeenCalled();
      expect(consoleWarn).not.toHaveBeenCalled();
      expect(consoleLog).not.toHaveBeenCalled();
    });
  });

  describe('setLogHandler()', () => {
    it('should use custom log handler', () => {
      const customHandler = vi.fn();
      logger.setLogHandler(customHandler);
      
      logger.info('test message', { data: 'test' });
      
      expect(customHandler).toHaveBeenCalledWith(
        'info',
        '[Murmuraba] [2024-01-01T12:00:00.000Z] [INFO] test message',
        { data: 'test' }
      );
      expect(consoleLog).not.toHaveBeenCalled();
    });
  });

  describe('Log methods', () => {
    it('should log error messages', () => {
      logger.error('error message');
      expect(consoleError).toHaveBeenCalledWith(
        '[Murmuraba] [2024-01-01T12:00:00.000Z] [ERROR] error message'
      );
    });

    it('should log error messages with data', () => {
      const errorData = { code: 'TEST_ERROR', details: 'test' };
      logger.error('error message', errorData);
      expect(consoleError).toHaveBeenCalledWith(
        '[Murmuraba] [2024-01-01T12:00:00.000Z] [ERROR] error message',
        errorData
      );
    });

    it('should log warn messages', () => {
      logger.warn('warning message');
      expect(consoleWarn).toHaveBeenCalledWith(
        '[Murmuraba] [2024-01-01T12:00:00.000Z] [WARN] warning message'
      );
    });

    it('should log info messages', () => {
      logger.info('info message');
      expect(consoleLog).toHaveBeenCalledWith(
        '[Murmuraba] [2024-01-01T12:00:00.000Z] [INFO] info message'
      );
    });

    it('should log debug messages', () => {
      logger.setLevel('debug');
      logger.debug('debug message');
      expect(consoleLog).toHaveBeenCalledWith(
        '[Murmuraba] [2024-01-01T12:00:00.000Z] [DEBUG] debug message'
      );
    });

    it('should not log debug messages by default', () => {
      logger.debug('debug message');
      expect(consoleLog).not.toHaveBeenCalled();
    });
  });

  describe('Log level hierarchy', () => {
    it('should respect log level hierarchy', () => {
      const levels: LogLevel[] = ['none', 'error', 'warn', 'info', 'debug'];
      
      levels.forEach((level, index) => {
        logger.setLevel(level);
        
        // Clear mocks
        consoleError.mockClear();
        consoleWarn.mockClear();
        consoleLog.mockClear();
        
        logger.error('error');
        logger.warn('warn');
        logger.info('info');
        logger.debug('debug');
        
        const totalCalls = consoleError.mock.calls.length + 
                          consoleWarn.mock.calls.length + 
                          consoleLog.mock.calls.length;
        
        // none = 0, error = 1, warn = 2, info = 3, debug = 4
        expect(totalCalls).toBe(index);
      });
    });
  });

  describe('Timestamp formatting', () => {
    it('should include timestamp in log messages', () => {
      logger.info('test');
      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('2024-01-01T12:00:00.000Z')
      );
    });
  });

  describe('Data handling', () => {
    it('should handle undefined data', () => {
      logger.info('message');
      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('message')
      );
      expect(consoleLog).toHaveBeenCalledTimes(1);
    });

    it('should handle null data', () => {
      logger.info('message', null);
      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('message'),
        null
      );
    });

    it('should handle object data', () => {
      const data = { key: 'value', nested: { prop: 123 } };
      logger.info('message', data);
      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('message'),
        data
      );
    });
  });
});