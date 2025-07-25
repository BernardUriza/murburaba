import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Logger, LogLevel } from '../../core/Logger';

describe('Logger', () => {
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;
  let consoleGroupSpy: any;
  let consoleGroupEndSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleGroupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    
    // Reset logger to default state
    Logger.setLogLevel(LogLevel.INFO);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setLogLevel', () => {
    it('should set log level', () => {
      Logger.setLogLevel(LogLevel.DEBUG);
      
      // Debug messages should be logged
      Logger.debug('test');
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('debug', () => {
    it('should log when level is DEBUG', () => {
      Logger.setLogLevel(LogLevel.DEBUG);
      Logger.debug('debug message', { data: 'test' });
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
        'debug message',
        { data: 'test' }
      );
    });

    it('should not log when level is higher than DEBUG', () => {
      Logger.setLogLevel(LogLevel.INFO);
      Logger.debug('debug message');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('info', () => {
    it('should log when level is INFO or lower', () => {
      Logger.setLogLevel(LogLevel.INFO);
      Logger.info('info message');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        'info message'
      );
    });

    it('should not log when level is higher than INFO', () => {
      Logger.setLogLevel(LogLevel.WARN);
      Logger.info('info message');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('should log when level is WARN or lower', () => {
      Logger.setLogLevel(LogLevel.WARN);
      Logger.warn('warning message');
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]'),
        'warning message'
      );
    });

    it('should not log when level is higher than WARN', () => {
      Logger.setLogLevel(LogLevel.ERROR);
      Logger.warn('warning message');
      
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should always log errors', () => {
      Logger.setLogLevel(LogLevel.ERROR);
      const error = new Error('test error');
      Logger.error('error message', error);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        'error message',
        error
      );
    });

    it('should log errors even when level is NONE', () => {
      Logger.setLogLevel(LogLevel.NONE);
      Logger.error('error message');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        'error message'
      );
    });
  });

  describe('group', () => {
    it('should create console group when enabled', () => {
      Logger.setLogLevel(LogLevel.DEBUG);
      Logger.group('Group Title', LogLevel.DEBUG);
      
      expect(consoleGroupSpy).toHaveBeenCalledWith(
        expect.stringContaining('[GROUP]'),
        'Group Title'
      );
    });

    it('should not create group when level is too high', () => {
      Logger.setLogLevel(LogLevel.ERROR);
      Logger.group('Group Title', LogLevel.INFO);
      
      expect(consoleGroupSpy).not.toHaveBeenCalled();
    });

    it('should use INFO level by default', () => {
      Logger.setLogLevel(LogLevel.INFO);
      Logger.group('Group Title');
      
      expect(consoleGroupSpy).toHaveBeenCalled();
    });
  });

  describe('groupEnd', () => {
    it('should end console group', () => {
      Logger.groupEnd();
      
      expect(consoleGroupEndSpy).toHaveBeenCalled();
    });
  });

  describe('performance', () => {
    it('should log performance timing in DEBUG mode', () => {
      Logger.setLogLevel(LogLevel.DEBUG);
      
      const callback = vi.fn(() => 'result');
      const result = Logger.performance('test operation', callback);
      
      expect(callback).toHaveBeenCalled();
      expect(result).toBe('result');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PERF]'),
        expect.stringContaining('test operation'),
        expect.stringMatching(/\d+(\.\d+)?ms/)
      );
    });

    it('should not log performance in non-DEBUG mode', () => {
      Logger.setLogLevel(LogLevel.INFO);
      
      const callback = vi.fn(() => 'result');
      const result = Logger.performance('test operation', callback);
      
      expect(callback).toHaveBeenCalled();
      expect(result).toBe('result');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should handle async callbacks', async () => {
      Logger.setLogLevel(LogLevel.DEBUG);
      
      const callback = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async result';
      });
      
      const result = await Logger.performance('async operation', callback);
      
      expect(callback).toHaveBeenCalled();
      expect(result).toBe('async result');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PERF]'),
        expect.stringContaining('async operation'),
        expect.stringMatching(/\d+(\.\d+)?ms/)
      );
    });

    it('should handle callbacks that throw errors', () => {
      Logger.setLogLevel(LogLevel.DEBUG);
      
      const callback = vi.fn(() => {
        throw new Error('callback error');
      });
      
      expect(() => Logger.performance('error operation', callback)).toThrow('callback error');
      expect(callback).toHaveBeenCalled();
      
      // Should still log performance even when error is thrown
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PERF]'),
        expect.stringContaining('error operation'),
        expect.stringMatching(/\d+(\.\d+)?ms/)
      );
    });
  });

  describe('formatMessage', () => {
    it('should format messages with timestamp', () => {
      Logger.setLogLevel(LogLevel.INFO);
      Logger.info('test message');
      
      const call = consoleLogSpy.mock.calls[0];
      const formattedMessage = call[0];
      
      // Should contain timestamp pattern
      expect(formattedMessage).toMatch(/\[\d{2}:\d{2}:\d{2}\.\d{3}\]/);
      expect(formattedMessage).toContain('[INFO]');
      expect(formattedMessage).toContain('[MURMURABA]');
    });
  });

  describe('edge cases', () => {
    it('should handle undefined messages', () => {
      Logger.setLogLevel(LogLevel.INFO);
      Logger.info(undefined as any);
      
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle null messages', () => {
      Logger.setLogLevel(LogLevel.INFO);
      Logger.info(null as any);
      
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle multiple arguments', () => {
      Logger.setLogLevel(LogLevel.INFO);
      Logger.info('message', 'arg1', 'arg2', { data: 'test' });
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.any(String),
        'message',
        'arg1',
        'arg2',
        { data: 'test' }
      );
    });
  });
});