import { MurmubaraEngine } from './core/MurmubaraEngine';
let globalEngine = null;
export async function initializeAudioEngine(config) {
    if (globalEngine) {
        throw new Error('Audio engine is already initialized. Call destroyEngine() first.');
    }
    globalEngine = new MurmubaraEngine(config);
    await globalEngine.initialize();
}
export function getEngine() {
    if (!globalEngine) {
        throw new Error('Audio engine not initialized. Call initializeAudioEngine() first.');
    }
    return globalEngine;
}
export async function processStream(stream) {
    const engine = getEngine();
    return engine.processStream(stream);
}
export async function processStreamChunked(stream, config) {
    const engine = getEngine();
    return engine.processStream(stream, config);
}
export async function destroyEngine(options) {
    if (!globalEngine) {
        return;
    }
    await globalEngine.destroy(options?.force || false);
    globalEngine = null;
}
export function getEngineStatus() {
    if (!globalEngine) {
        return 'uninitialized';
    }
    return globalEngine.getDiagnostics().engineState;
}
export function getDiagnostics() {
    const engine = getEngine();
    return engine.getDiagnostics();
}
export function onMetricsUpdate(callback) {
    const engine = getEngine();
    engine.onMetricsUpdate(callback);
}
export async function processFile(arrayBuffer) {
    const engine = getEngine();
    return engine.processFile(arrayBuffer);
}
