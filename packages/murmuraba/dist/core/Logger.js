export class Logger {
    constructor(prefix = '[Murmuraba]') {
        this.level = 'info';
        this.prefix = prefix;
    }
    setLevel(level) {
        this.level = level;
    }
    setLogHandler(handler) {
        this.onLog = handler;
    }
    shouldLog(level) {
        const levels = ['none', 'error', 'warn', 'info', 'debug'];
        const currentIndex = levels.indexOf(this.level);
        const messageIndex = levels.indexOf(level);
        return currentIndex > 0 && messageIndex <= currentIndex;
    }
    log(level, message, data) {
        if (!this.shouldLog(level))
            return;
        const timestamp = new Date().toISOString();
        const formattedMessage = `${this.prefix} [${timestamp}] [${level.toUpperCase()}] ${message}`;
        if (this.onLog) {
            this.onLog(level, formattedMessage, data);
        }
        else {
            const logMethod = level === 'error' ? console.error :
                level === 'warn' ? console.warn :
                    console.log;
            if (data !== undefined) {
                logMethod(formattedMessage, data);
            }
            else {
                logMethod(formattedMessage);
            }
        }
    }
    error(message, error, data) {
        if (error && data === undefined) {
            this.log('error', message, error);
        }
        else {
            this.log('error', message, data);
        }
    }
    warn(message, data) {
        this.log('warn', message, data);
    }
    info(message, data) {
        this.log('info', message, data);
    }
    debug(message, data) {
        this.log('debug', message, data);
    }
    getLevel() {
        return this.level;
    }
}
