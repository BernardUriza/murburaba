export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';
export interface ILogger {
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    setLevel(level: LogLevel): void;
    getLevel(): LogLevel;
}
declare class MurmubaraLogger implements ILogger {
    private level;
    private readonly levels;
    setLevel(level: LogLevel): void;
    getLevel(): LogLevel;
    private shouldLog;
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
}
declare const logger: MurmubaraLogger;
export { logger };
//# sourceMappingURL=logger.d.ts.map