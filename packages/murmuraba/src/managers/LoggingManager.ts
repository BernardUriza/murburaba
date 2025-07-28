import { LogLevel } from '../types';
import { Logger } from '../core/Logger';

type LogContext = 'AUDIO' | 'WASM' | 'REACT' | 'ENGINE' | 'METRICS' | 'UI';

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  context: LogContext;
  message: string;
  data?: any;
  count?: number;
  sessionId?: string;
  stackTrace?: string;
}

interface ThrottleConfig {
  key: string;
  lastLogged: number;
  count: number;
  threshold: number;
  data?: any;
}

export class LoggingManager {
  private static instance: LoggingManager;
  private logger: Logger;
  private sessionId: string;
  private throttleMap: Map<string, ThrottleConfig> = new Map();
  private errorGrouping: Map<string, LogEntry> = new Map();
  private errorGroupingWindow = 5000; // 5 seconds
  private lastCleanup = Date.now();
  private enabledInProduction = false;

  private constructor() {
    this.logger = new Logger('[MRB]'); // Unified prefix
    this.sessionId = this.generateSessionId();
    this.logger.setLevel('info'); // Default level
  }

  static getInstance(): LoggingManager {
    if (!LoggingManager.instance) {
      LoggingManager.instance = new LoggingManager();
    }
    return LoggingManager.instance;
  }

  private generateSessionId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }

  setLevel(level: LogLevel): void {
    this.logger.setLevel(level);
  }

  setProductionMode(enabled: boolean): void {
    this.enabledInProduction = enabled;
    this.logger.setLevel(enabled ? 'error' : 'info');
  }

  private shouldThrottle(key: string, thresholdMs: number = 1000): boolean {
    const now = Date.now();
    const throttleConfig = this.throttleMap.get(key);

    if (!throttleConfig) {
      this.throttleMap.set(key, {
        key,
        lastLogged: now,
        count: 1,
        threshold: thresholdMs
      });
      return false;
    }

    if (now - throttleConfig.lastLogged > thresholdMs) {
      throttleConfig.lastLogged = now;
      throttleConfig.count = 1;
      return false;
    }

    throttleConfig.count++;
    return true;
  }

  private formatMessage(context: LogContext, message: string): string {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
    return `[${timestamp}] #${context} ${message}`;
  }

  private getStackTrace(error?: Error): string {
    if (!error || !error.stack) return '';
    
    const lines = error.stack.split('\n');
    return lines.slice(1, 4).join('\n'); // Top 3 frames
  }

  private cleanupErrorGroups(): void {
    const now = Date.now();
    if (now - this.lastCleanup < this.errorGroupingWindow) return;

    this.errorGrouping.forEach((entry, key) => {
      if (now - entry.timestamp > this.errorGroupingWindow) {
        this.errorGrouping.delete(key);
      }
    });
    this.lastCleanup = now;
  }

  private groupError(context: LogContext, message: string, error?: Error): boolean {
    this.cleanupErrorGroups();
    
    const key = `${context}:${message}`;
    const existing = this.errorGrouping.get(key);
    
    if (existing) {
      existing.count = (existing.count || 1) + 1;
      
      if (existing.count % 10 === 0) {
        this.logger.error(
          this.formatMessage(context, `${message} (occurred ${existing.count} times)`),
          error
        );
      }
      return true;
    }

    this.errorGrouping.set(key, {
      timestamp: Date.now(),
      level: 'error',
      context,
      message,
      count: 1,
      sessionId: this.sessionId,
      stackTrace: this.getStackTrace(error)
    });
    
    return false;
  }

  // Main logging methods
  error(context: LogContext, message: string, error?: Error | unknown): void {
    if (!this.groupError(context, message, error instanceof Error ? error : undefined)) {
      const formattedMessage = this.formatMessage(context, message);
      
      if (error instanceof Error) {
        this.logger.error(formattedMessage, {
          error: error.message,
          stack: this.getStackTrace(error),
          sessionId: this.sessionId
        });
      } else {
        this.logger.error(formattedMessage, { data: error, sessionId: this.sessionId });
      }
    }
  }

  warn(context: LogContext, message: string, data?: any): void {
    this.logger.warn(this.formatMessage(context, message), {
      ...data,
      sessionId: this.sessionId
    });
  }

  info(context: LogContext, message: string, data?: any): void {
    this.logger.info(this.formatMessage(context, message), {
      ...data,
      sessionId: this.sessionId
    });
  }

  debug(context: LogContext, message: string, data?: any): void {
    if (this.enabledInProduction) return;
    
    this.logger.debug(this.formatMessage(context, message), {
      ...data,
      sessionId: this.sessionId
    });
  }

  // Specialized logging methods
  metric(key: string, value: number, changeThreshold: number = 0.1): void {
    const throttleKey = `metric:${key}`;
    
    if (this.shouldThrottle(throttleKey, 5000)) return; // 5 second throttle
    
    const lastValue = this.throttleMap.get(throttleKey)?.data?.value;
    
    if (lastValue !== undefined) {
      const change = Math.abs((value - lastValue) / lastValue);
      if (change < changeThreshold) return; // Skip if change is insignificant
    }
    
    const throttleConfig = this.throttleMap.get(throttleKey);
    if (throttleConfig) {
      throttleConfig.data = { value };
    }
    
    this.info('METRICS', `${key}: ${value.toFixed(2)}`);
  }

  lifecycle(context: LogContext, event: 'start' | 'stop' | 'restart', details?: string): void {
    const message = details ? `${event.toUpperCase()}: ${details}` : event.toUpperCase();
    this.info(context, message);
  }

  userAction(action: string, data?: any): void {
    this.info('UI', `User action: ${action}`, data);
  }

  performance(operation: string, duration: number): void {
    if (duration < 100) return; // Only log operations over 100ms
    
    this.info('ENGINE', `${operation} completed in ${duration}ms`);
  }

  // React specific helpers
  reactError(componentName: string, error: Error): void {
    this.error('REACT', `Error in ${componentName}`, error);
  }

  hookEvent(hookName: string, componentName: string, action: string): void {
    if (this.shouldThrottle(`hook:${hookName}:${componentName}`, 1000)) return;
    
    this.debug('REACT', `${componentName}.${hookName}: ${action}`);
  }

  // Get session ID for external use
  getSessionId(): string {
    return this.sessionId;
  }
}

// Export singleton instance
export const logging = LoggingManager.getInstance();