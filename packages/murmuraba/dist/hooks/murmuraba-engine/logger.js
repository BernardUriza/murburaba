class MurmubaraLogger {
    constructor() {
        this.level = 'info';
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3,
            silent: 4
        };
    }
    setLevel(level) {
        this.level = level;
    }
    getLevel() {
        return this.level;
    }
    shouldLog(level) {
        return this.levels[level] >= this.levels[this.level];
    }
    debug(message, ...args) {
        if (this.shouldLog('debug')) {
            console.debug(`🐛 [DEBUG] ${message}`, ...args);
        }
    }
    info(message, ...args) {
        if (this.shouldLog('info')) {
            console.info(`ℹ️ [INFO] ${message}`, ...args);
        }
    }
    warn(message, ...args) {
        if (this.shouldLog('warn')) {
            console.warn(`⚠️ [WARN] ${message}`, ...args);
        }
    }
    error(message, ...args) {
        if (this.shouldLog('error')) {
            console.error(`❌ [ERROR] ${message}`, ...args);
        }
    }
}
// Singleton logger instance
const logger = new MurmubaraLogger();
// Set default level based on environment
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    logger.setLevel('warn');
}
else if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    logger.setLevel('silent');
}
export { logger };
