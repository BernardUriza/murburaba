import { Logger } from '../core/Logger';

export interface WorkerMessage<T = any> {
  id: string;
  type: string;
  payload?: T;
  error?: string;
}

export interface WorkerConfig {
  name: string;
  debug?: boolean;
}

/**
 * Base class for all Murmuraba workers
 * Provides common functionality and message handling
 */
export abstract class BaseWorker {
  protected logger: Logger;
  protected config: WorkerConfig;
  private messageHandlers = new Map<string, (payload: any) => Promise<any>>();
  
  constructor(config: WorkerConfig) {
    this.config = config;
    this.logger = new Logger(`[Worker:${config.name}]`);
    this.logger.setLevel(config.debug ? 'debug' : 'info');
    
    this.setupMessageListener();
    this.registerHandlers();
  }
  
  /**
   * Register message handlers - must be implemented by subclasses
   */
  protected abstract registerHandlers(): void;
  
  /**
   * Register a message handler
   */
  protected registerHandler(type: string, handler: (payload: any) => Promise<any>): void {
    this.messageHandlers.set(type, handler);
    this.logger.debug(`Registered handler for: ${type}`);
  }
  
  /**
   * Setup the main message listener
   */
  private setupMessageListener(): void {
    self.addEventListener('message', async (event) => {
      const message = event.data as WorkerMessage;
      this.logger.debug(`Received message:`, message);
      
      try {
        const handler = this.messageHandlers.get(message.type);
        
        if (!handler) {
          throw new Error(`No handler for message type: ${message.type}`);
        }
        
        const result = await handler(message.payload);
        
        this.postMessage({
          id: message.id,
          type: `${message.type}_RESPONSE`,
          payload: result,
        });
        
      } catch (error) {
        this.logger.error(`Error handling message:`, error);
        
        this.postMessage({
          id: message.id,
          type: `${message.type}_ERROR`,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }
  
  /**
   * Send a message back to the main thread
   */
  protected postMessage(message: WorkerMessage): void {
    self.postMessage(message);
  }
  
  /**
   * Send an event (not expecting response)
   */
  protected sendEvent(type: string, payload?: any): void {
    this.postMessage({
      id: `event_${Date.now()}_${Math.random()}`,
      type,
      payload,
    });
  }
  
  /**
   * Cleanup resources
   */
  protected cleanup(): void {
    this.logger.info('Cleaning up worker resources');
    this.messageHandlers.clear();
  }
}