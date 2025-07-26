import { MurmubaraEngine } from './MurmubaraEngine';
import { MurmubaraConfig } from '../types';

interface EngineInstance {
  id: string;
  engine: MurmubaraEngine;
  createdAt: number;
}

class EngineRegistry {
  private instances: Map<string, EngineInstance> = new Map();
  private defaultInstanceId: string | null = null;

  createEngine(config?: MurmubaraConfig & { id?: string }): MurmubaraEngine {
    const id = config?.id || this.generateId();
    
    if (this.instances.has(id)) {
      throw new Error(`Engine with id "${id}" already exists`);
    }

    const engine = new MurmubaraEngine(config);
    this.instances.set(id, {
      id,
      engine,
      createdAt: Date.now()
    });

    if (!this.defaultInstanceId) {
      this.defaultInstanceId = id;
    }

    return engine;
  }

  getEngine(id?: string): MurmubaraEngine {
    const targetId = id || this.defaultInstanceId;
    
    if (!targetId) {
      throw new Error('No engine instances available');
    }

    const instance = this.instances.get(targetId);
    if (!instance) {
      throw new Error(`Engine with id "${targetId}" not found`);
    }

    return instance.engine;
  }

  async destroyEngine(id?: string): Promise<void> {
    const targetId = id || this.defaultInstanceId;
    
    if (!targetId) {
      return;
    }

    const instance = this.instances.get(targetId);
    if (!instance) {
      return;
    }

    await instance.engine.destroy(true);
    this.instances.delete(targetId);

    if (this.defaultInstanceId === targetId) {
      this.defaultInstanceId = this.instances.size > 0 
        ? Array.from(this.instances.keys())[0] 
        : null;
    }
  }

  async destroyAll(): Promise<void> {
    const destroyPromises = Array.from(this.instances.values()).map(
      instance => instance.engine.destroy(true)
    );
    
    await Promise.all(destroyPromises);
    this.instances.clear();
    this.defaultInstanceId = null;
  }

  getInstances(): string[] {
    return Array.from(this.instances.keys());
  }

  hasEngine(id?: string): boolean {
    const targetId = id || this.defaultInstanceId;
    return targetId ? this.instances.has(targetId) : false;
  }

  private generateId(): string {
    return `engine-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const engineRegistry = new EngineRegistry();