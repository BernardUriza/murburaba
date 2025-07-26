import { LogLevel } from '../../types';

export interface ILogger {
  log(level: LogLevel, message: string, data?: any): void;
  error(message: string, error?: Error | unknown, data?: any): void;
  warn(message: string, data?: any): void;
  info(message: string, data?: any): void;
  debug(message: string, data?: any): void;
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
}