import { WorkerManager } from '../../managers/WorkerManager';
import { IWorkerManager, WorkerTask, WorkerResult } from '../interfaces/IWorkerManager';
import { ILogger } from '../interfaces/ILogger';
import { Injectable } from '../decorators';
import { TOKENS } from '../DIContainer';

@Injectable(TOKENS.WorkerManager)
export class WorkerManagerAdapter implements IWorkerManager {
  private workerManager: WorkerManager;

  constructor(logger: ILogger) {
    this.workerManager = new WorkerManager(logger);
  }

  async createWorker(name: string, scriptPath: string): Promise<Worker> {
    return this.workerManager.createWorker(name, scriptPath);
  }

  async terminateWorker(name: string): Promise<void> {
    return this.workerManager.terminateWorker(name);
  }

  async terminateAll(): Promise<void> {
    return this.workerManager.terminateAll();
  }

  async sendTask<T, R>(workerName: string, task: WorkerTask<T>): Promise<R> {
    // Adapter pattern to match interface
    const worker = this.workerManager.getWorker(workerName);
    if (!worker) {
      throw new Error(`Worker ${workerName} not found`);
    }

    return new Promise((resolve, reject) => {
      const messageHandler = (event: MessageEvent<WorkerResult<R>>) => {
        if (event.data.id === task.id) {
          worker.removeEventListener('message', messageHandler);
          
          if (event.data.error) {
            reject(event.data.error);
          } else {
            resolve(event.data.result!);
          }
        }
      };

      worker.addEventListener('message', messageHandler);
      worker.postMessage(task);
    });
  }

  getWorkerCount(): number {
    return this.workerManager.getWorkerCount();
  }

  isWorkerAvailable(name: string): boolean {
    return this.workerManager.hasWorker(name);
  }

  setMaxWorkers(max: number): void {
    // Not implemented in current WorkerManager
    // Could be added as enhancement
  }
}