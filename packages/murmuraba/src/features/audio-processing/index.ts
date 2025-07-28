/**
 * Audio Processing Feature
 * 
 * Modern audio processing capabilities with hooks, services, and async patterns
 * 
 * @module features/audio-processing
 */

// Hooks
export { 
  useAudioProcessor,
  type UseAudioProcessorOptions,
  type AudioProcessorState,
  type AudioProcessorActions,
} from './hooks/useAudioProcessor';

// Services  
export {
  ModernAudioService,
  AudioProcessingError,
  type AudioServiceEvents,
  type AudioProcessingOptions,
} from './services/ModernAudioService';

// Re-export legacy APIs for compatibility
export { AudioProcessorService } from '../../services/AudioProcessorService';

// Feature API
export interface AudioProcessingFeature {
  createService: (logger: any) => any;
  hooks: {
    useAudioProcessor: typeof import('./hooks/useAudioProcessor').useAudioProcessor;
  };
}

/**
 * Get the complete audio processing feature API
 */
export function getAudioProcessingFeature(): AudioProcessingFeature {
  const { ModernAudioService } = require('./services/ModernAudioService');
  const { useAudioProcessor } = require('./hooks/useAudioProcessor');
  
  return {
    createService: (logger) => new ModernAudioService(logger),
    hooks: {
      useAudioProcessor,
    },
  };
}
