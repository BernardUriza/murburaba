import { LogLevel } from '../types';
import { ILogger } from './interfaces';
export declare class Logger implements ILogger {
    private level;
    private onLog?;
    private prefix;
    constructor(prefix?: string);
    setLevel(level: LogLevel): void;
    setLogHandler(handler: (level: LogLevel, message: string, data?: any) => void): void;
    private shouldLog;
    log(level: LogLevel, message: string, data?: any): void;
    error(message: string, error?: Error | unknown, data?: any): void;
    warn(message: string, data?: any): void;
    info(message: string, data?: any): void;
    debug(message: string, data?: any): void;
    getLevel(): LogLevel;
}
//# sourceMappingURL=Logger.d.ts.map