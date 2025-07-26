/* React externalized */
const {  engineRegistry  } = require('./core/EngineRegistry');
export async function initializeAudioEngine(config) {
    const engine = engineRegistry.createEngine(config);
    await engine.initialize();
}
function getEngine(id) {
    return engineRegistry.getEngine(id);
}
export async function processStream(stream) {
    const engine = getEngine();
    return engine.processStream(stream);
}
export async function processStreamChunked(stream, config) {
    const engine = getEngine();
    return engine.processStream(stream, config);
}
export async function destroyEngine(idOrOptions) {
    const id = typeof idOrOptions === 'string' ? idOrOptions : idOrOptions?.id;
    await engineRegistry.destroyEngine(id);
}
function getEngineStatus(id) {
    try {
        const engine = engineRegistry.getEngine(id);
        return engine.getDiagnostics().engineState;
    }
    catch {
        return 'uninitialized';
    }
}
function getDiagnostics() {
    const engine = getEngine();
    return engine.getDiagnostics();
}
function onMetricsUpdate(callback) {
    const engine = getEngine();
    engine.onMetricsUpdate(callback);
}
export async function processFile(arrayBuffer) {
    const engine = getEngine();
    return engine.processFile(arrayBuffer);
}


module.exports = { getEngine, getEngineStatus, getDiagnostics, onMetricsUpdate };