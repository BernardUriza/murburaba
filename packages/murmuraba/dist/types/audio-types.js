export class MurmubaraError extends Error {
    constructor(code, message, details) {
        super(message);
        this.name = 'MurmubaraError';
        this.code = code;
        this.details = details;
    }
}
export const ErrorCodes = {
    WASM_NOT_LOADED: 'WASM_NOT_LOADED',
    INVALID_STREAM: 'INVALID_STREAM',
    ENGINE_BUSY: 'ENGINE_BUSY',
    INITIALIZATION_FAILED: 'INITIALIZATION_FAILED',
    PROCESSING_FAILED: 'PROCESSING_FAILED',
    CLEANUP_FAILED: 'CLEANUP_FAILED',
    WORKER_ERROR: 'WORKER_ERROR',
    INVALID_CONFIG: 'INVALID_CONFIG',
    NOT_INITIALIZED: 'NOT_INITIALIZED',
    ALREADY_INITIALIZED: 'ALREADY_INITIALIZED',
};
