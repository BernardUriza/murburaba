import { RNNoiseEngine } from './RNNoiseEngine';
export function createAudioEngine(config) {
    switch (config.engineType) {
        case 'rnnoise':
            return new RNNoiseEngine();
        case 'speex':
            throw new Error('Speex engine not implemented yet');
        case 'custom':
            throw new Error('Custom engine not implemented yet');
        default:
            throw new Error(`Unknown engine type: ${config.engineType}`);
    }
}
