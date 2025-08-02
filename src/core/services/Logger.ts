export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: any;
  error?: Error;
}

interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  maxBufferSize: number;
  flushInterval: number;
}

class LoggerService {
  private static instance: LoggerService;
  private config: LoggerConfig;
  private buffer: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.config = {
      minLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
      enableConsole: process.env.NODE_ENV !== 'production',
      enableRemote: process.env.NODE_ENV === 'production',
      remoteEndpoint: process.env.VITE_LOG_ENDPOINT,
      maxBufferSize: 100,
      flushInterval: 5000
    };

    // Start periodic flush
    if (this.config.enableRemote) {
      this.startPeriodicFlush();
    }

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush();
      });
    }
  }

  static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  private startPeriodicFlush() {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.minLevel;
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = LogLevel[entry.level];
    const context = entry.context ? this.safeStringifyContext(entry.context) : '';
    return `[${timestamp}] [${level}] ${entry.message} ${context}`;
  }

  private safeStringifyContext(context: any): string {
    try {
      // Handle simple primitives directly
      if (context === null || context === undefined) {
        return '';
      }
      
      if (typeof context === 'string' || typeof context === 'number' || typeof context === 'boolean') {
        return String(context);
      }

      // For complex objects, use safe serialization
      return this.safeStringify(context);
    } catch (error) {
      return `[Context Serialization Error: ${error instanceof Error ? error.message : 'Unknown error'}]`;
    }
  }

  private safeStringify(obj: any): string {
    const seen = new WeakSet();
    
    try {
      return JSON.stringify(obj, (key: string, value: any) => {
        // Skip React internal properties
        if (key.startsWith('__react') || key.startsWith('_react') || key === '_owner' || key === 'ref') {
          return '[React Internal]';
        }

        // Handle circular references
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular Reference]';
          }
          seen.add(value);

          // Handle React elements
          if (value.$$typeof) {
            return '[React Element]';
          }

          // Handle DOM nodes
          if (value.nodeType) {
            return `[DOM Node: ${value.nodeName}]`;
          }

          // Handle functions
          if (typeof value === 'function') {
            return `[Function: ${value.name || 'anonymous'}]`;
          }

          // Handle Errors
          if (value instanceof Error) {
            return {
              name: value.name,
              message: value.message,
              stack: value.stack
            };
          }
        }

        return value;
      });
    } catch (error) {
      return `[Serialization Failed: ${error instanceof Error ? error.message : 'Unknown error'}]`;
    }
  }

  private consoleLog(entry: LogEntry) {
    if (!this.config.enableConsole) return;

    const methods = {
      [LogLevel.DEBUG]: console.debug,
      [LogLevel.INFO]: console.info,
      [LogLevel.WARN]: console.warn,
      [LogLevel.ERROR]: console.error,
      [LogLevel.FATAL]: console.error
    };

    const method = methods[entry.level] || console.log;
    const formattedMessage = this.formatMessage(entry);
    
    if (entry.error) {
      method(formattedMessage, entry.error);
    } else {
      method(formattedMessage);
    }
  }

  private addToBuffer(entry: LogEntry) {
    this.buffer.push(entry);
    
    if (this.buffer.length >= this.config.maxBufferSize) {
      this.flush();
    }
  }

  private async flush() {
    if (!this.config.enableRemote || this.buffer.length === 0) return;

    const logs = [...this.buffer];
    this.buffer = [];

    try {
      // Safe serialization of logs before sending
      const serializedLogs = logs.map(log => ({
        ...log,
        context: log.context ? this.safeStringifyContext(log.context) : undefined
      }));

      await fetch(this.config.remoteEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ logs: serializedLogs })
      });
    } catch (error) {
      // Failed to send logs, add them back to buffer if not too large
      if (this.buffer.length + logs.length < this.config.maxBufferSize * 2) {
        this.buffer = [...logs, ...this.buffer];
      }
      
      // Log the flush error to console as fallback (but don't recurse)
      if (this.config.enableConsole) {
        console.warn('Logger: Failed to flush logs to remote endpoint', {
          error: error instanceof Error ? error.message : 'Unknown error',
          logsCount: logs.length
        });
      }
    }
  }

  log(level: LogLevel, message: string, context?: any, error?: Error) {
    if (!this.shouldLog(level)) return;

    try {
      const entry: LogEntry = {
        level,
        message,
        timestamp: new Date(),
        context,
        error
      };

      this.consoleLog(entry);
      this.addToBuffer(entry);
    } catch (loggingError) {
      // Fallback to basic console logging if our logger fails
      const fallbackMessage = `Logger Error: ${loggingError instanceof Error ? loggingError.message : 'Unknown error'} | Original: ${message}`;
      
      if (level >= LogLevel.ERROR) {
        console.error(fallbackMessage, error);
      } else if (level >= LogLevel.WARN) {
        console.warn(fallbackMessage);
      } else {
        console.log(fallbackMessage);
      }
    }
  }

  debug(message: string, context?: any) {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: any) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: any) {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: any, error?: Error) {
    this.log(LogLevel.ERROR, message, context, error);
  }

  fatal(message: string, context?: any, error?: Error) {
    this.log(LogLevel.FATAL, message, context, error);
  }

  // Performance logging
  time(label: string) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.time(label);
    }
  }

  timeEnd(label: string) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.timeEnd(label);
    }
  }

  // Metrics logging
  metric(name: string, value: number, unit?: string, tags?: Record<string, string>) {
    this.info('Metric', {
      name,
      value,
      unit,
      tags,
      timestamp: Date.now()
    });
  }

  setConfig(config: Partial<LoggerConfig>) {
    this.config = { ...this.config, ...config };
    
    // Restart periodic flush if needed
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      if (this.config.enableRemote) {
        this.startPeriodicFlush();
      }
    }
  }

  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

// Export singleton instance
export const Logger = LoggerService.getInstance();