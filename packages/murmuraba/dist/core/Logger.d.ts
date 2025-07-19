import { LogLevel } from '../types';
export declare class Logger {
    private level;
    private onLog?;
    private prefix;
    constructor(prefix?: string);
    setLevel(level: LogLevel): void;
    setLogHandler(handler: (level: LogLevel, message: string, data?: any) => void): void;
    private shouldLog;
    private log;
    error(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    info(message: string, data?: any): void;
    debug(message: string, data?: any): void;
}
//# sourceMappingURL=Logger.d.ts.map