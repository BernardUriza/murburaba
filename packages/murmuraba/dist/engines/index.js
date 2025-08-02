import { RNNoiseEngine } from './rnnoise-engine';
export function createAudioEngine(config) {
    switch (config.engineType) {
        case 'rnnoise':
            return new RNNoiseEngine(config.rnnoiseConfig);
        case 'speex':
            throw new Error('Speex engine not implemented yet');
        case 'custom':
            throw new Error('Custom engine not implemented yet');
        default:
            throw new Error(`Unknown engine type: ${config.engineType}`);
    }
}
