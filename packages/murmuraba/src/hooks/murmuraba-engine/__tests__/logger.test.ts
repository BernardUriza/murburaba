import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '../logger';

describe('logger', () => {
  // Mock console methods
  const originalConsole = { ...console };
  
  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.setLevel('debug'); // Start with most verbose level
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log debug messages when level is debug', () => {
    logger.setLevel('debug');
    logger.debug('test debug message');
    
    expect(console.debug).toHaveBeenCalledWith(
      '🐛 [DEBUG] test debug message'
    );
  });

  it('should not log debug messages when level is info', () => {
    logger.setLevel('info');
    logger.debug('test debug message');
    
    expect(console.debug).not.toHaveBeenCalled();
  });

  it('should log info messages when level is info', () => {
    logger.setLevel('info');
    logger.info('test info message', { data: 'test' });
    
    expect(console.info).toHaveBeenCalledWith(
      'ℹ️ [INFO] test info message',
      { data: 'test' }
    );
  });

  it('should log warnings when level is warn', () => {
    logger.setLevel('warn');
    logger.warn('test warning');
    
    expect(console.warn).toHaveBeenCalledWith('⚠️ [WARN] test warning');
  });

  it('should not log info when level is warn', () => {
    logger.setLevel('warn');
    logger.info('test info message');
    
    expect(console.info).not.toHaveBeenCalled();
  });

  it('should log errors when level is error', () => {
    logger.setLevel('error');
    logger.error('test error');
    
    expect(console.error).toHaveBeenCalledWith('❌ [ERROR] test error');
  });

  it('should not log anything when level is silent', () => {
    logger.setLevel('silent');
    
    logger.debug('debug');
    logger.info('info');
    logger.warn('warn');
    logger.error('error');
    
    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('should get and set log level', () => {
    expect(logger.getLevel()).toBe('debug');
    
    logger.setLevel('error');
    expect(logger.getLevel()).toBe('error');
  });

  it('should handle multiple arguments', () => {
    logger.setLevel('debug');
    const obj = { key: 'value' };
    const arr = [1, 2, 3];
    
    logger.info('message with objects', obj, arr);
    
    expect(console.info).toHaveBeenCalledWith(
      'ℹ️ [INFO] message with objects',
      obj,
      arr
    );
  });
});