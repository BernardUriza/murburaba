/**
 * Audio Test Helpers
 * REAL audio data generation for REAL testing
 * No more bullshit mocks that don't test anything
 */
export interface NoiseProfile {
    whiteNoise: number;
    pinkNoise?: number;
    brownNoise?: number;
    hum?: {
        freq: number;
        level: number;
    };
    crackle?: number;
}
/**
 * Generate a sine wave at specified frequency
 */
export declare function generateSineWave(frequency: number, sampleRate: number, duration: number, amplitude?: number): Float32Array;
/**
 * Generate realistic speech-like signal using formants
 */
export declare function generateSpeechLikeSignal(sampleRate: number, duration: number): Float32Array;
/**
 * Add realistic noise to clean audio
 */
export declare function addNoise(cleanAudio: Float32Array, noiseProfile: NoiseProfile): Float32Array;
/**
 * Generate test audio chunks for RNNoise (480 samples each)
 */
export declare function generateTestChunks(signalType: 'sine' | 'speech' | 'silence', noiseProfile: NoiseProfile, numChunks: number, frequency?: number): Float32Array[];
/**
 * Calculate Signal-to-Noise Ratio (SNR) in dB
 */
export declare function calculateSNR(clean: Float32Array, noisy: Float32Array): number;
/**
 * Measure noise reduction effectiveness
 */
export declare function measureNoiseReduction(original: Float32Array, processed: Float32Array, expectedReduction?: number): {
    passed: boolean;
    reduction: number;
    message: string;
};
//# sourceMappingURL=audioTestHelpers.d.ts.map