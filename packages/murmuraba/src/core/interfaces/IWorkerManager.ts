export interface WorkerTask<T = any> {
  id: string;
  type: string;
  data: T;
}

export interface WorkerResult<T = any> {
  id: string;
  result?: T;
  error?: Error;
}

export interface IWorkerManager {
  createWorker(name: string, scriptPath: string): Promise<Worker>;
  terminateWorker(name: string): Promise<void>;
  terminateAll(): Promise<void>;
  sendTask<T, R>(workerName: string, task: WorkerTask<T>): Promise<R>;
  getWorkerCount(): number;
  isWorkerAvailable(name: string): boolean;
  setMaxWorkers(max: number): void;
}