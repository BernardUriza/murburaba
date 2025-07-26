/* React externalized */
const {  MurmubaraError, ErrorCodes  } = require('../types');
class WorkerManager {
    constructor(logger) {
        this.workers = new Map();
        this.logger = logger;
    }
    createWorker(id, workerPath) {
        if (this.workers.has(id)) {
            throw new MurmubaraError(ErrorCodes.WORKER_ERROR, `Worker with id ${id} already exists`);
        }
        try {
            const worker = new Worker(workerPath);
            this.workers.set(id, worker);
            this.logger.debug(`Worker created: ${id}`);
            return worker;
        }
        catch (error) {
            this.logger.error(`Failed to create worker: ${id}`, error);
            throw new MurmubaraError(ErrorCodes.WORKER_ERROR, `Failed to create worker: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    getWorker(id) {
        return this.workers.get(id);
    }
    sendMessage(id, message) {
        const worker = this.workers.get(id);
        if (!worker) {
            throw new MurmubaraError(ErrorCodes.WORKER_ERROR, `Worker ${id} not found`);
        }
        worker.postMessage(message);
        this.logger.debug(`Message sent to worker ${id}:`, message);
    }
    terminateWorker(id) {
        const worker = this.workers.get(id);
        if (worker) {
            worker.terminate();
            this.workers.delete(id);
            this.logger.debug(`Worker terminated: ${id}`);
        }
    }
    terminateAll() {
        this.logger.info(`Terminating all ${this.workers.size} workers`);
        for (const [id, worker] of this.workers) {
            worker.terminate();
            this.logger.debug(`Worker terminated: ${id}`);
        }
        this.workers.clear();
    }
    getActiveWorkerCount() {
        return this.workers.size;
    }
    getWorkerCount() {
        return this.workers.size;
    }
    hasWorker(id) {
        return this.workers.has(id);
    }
    getWorkerIds() {
        return Array.from(this.workers.keys());
    }
}


module.exports = { WorkerManager };