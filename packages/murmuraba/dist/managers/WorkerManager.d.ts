import { Logger } from '../core/Logger';
interface WorkerMessage {
    type: string;
    payload?: any;
}
export declare class WorkerManager {
    private workers;
    private logger;
    constructor(logger: Logger);
    createWorker(id: string, workerPath: string): Worker;
    getWorker(id: string): Worker | undefined;
    sendMessage(id: string, message: WorkerMessage): void;
    terminateWorker(id: string): void;
    terminateAll(): void;
    getActiveWorkerCount(): number;
    getWorkerCount(): number;
    hasWorker(id: string): boolean;
    getWorkerIds(): string[];
}
export {};
//# sourceMappingURL=WorkerManager.d.ts.map