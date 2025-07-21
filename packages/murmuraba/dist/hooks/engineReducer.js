export const initialState = {
    isInitialized: false,
    isLoading: false,
    error: null,
    engineState: 'created',
    metrics: null,
    diagnostics: null,
    isRecording: false,
    isPaused: false,
    recordingTime: 0,
    chunks: [],
    currentStream: null,
    streamController: null,
};
export function engineReducer(state, action) {
    switch (action.type) {
        case 'INIT_START':
            return { ...state, isLoading: true, error: null };
        case 'INIT_SUCCESS':
            return {
                ...state,
                isLoading: false,
                isInitialized: true,
                engineState: action.payload.engineState,
                error: null
            };
        case 'INIT_ERROR':
            return {
                ...state,
                isLoading: false,
                isInitialized: false,
                error: action.payload.error
            };
        case 'SET_ENGINE_STATE':
            return { ...state, engineState: action.payload.state };
        case 'SET_METRICS':
            return { ...state, metrics: action.payload.metrics };
        case 'SET_DIAGNOSTICS':
            return { ...state, diagnostics: action.payload.diagnostics };
        case 'SET_ERROR':
            return { ...state, error: action.payload.error };
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload.loading };
        case 'SET_STREAM':
            return {
                ...state,
                currentStream: action.payload.stream,
                streamController: action.payload.controller
            };
        case 'START_RECORDING':
            return {
                ...state,
                isRecording: true,
                isPaused: false,
                recordingTime: 0
            };
        case 'STOP_RECORDING':
            return {
                ...state,
                isRecording: false,
                isPaused: false,
                currentStream: null,
                streamController: null
            };
        case 'PAUSE_RECORDING':
            return { ...state, isPaused: true };
        case 'RESUME_RECORDING':
            return { ...state, isPaused: false };
        case 'UPDATE_RECORDING_TIME':
            return { ...state, recordingTime: action.payload.time };
        case 'ADD_CHUNK':
            return {
                ...state,
                chunks: [...state.chunks, action.payload.chunk]
            };
        case 'UPDATE_CHUNK':
            return {
                ...state,
                chunks: state.chunks.map(chunk => chunk.id === action.payload.id
                    ? { ...chunk, ...action.payload.updates }
                    : chunk)
            };
        case 'CLEAR_CHUNKS':
            return { ...state, chunks: [] };
        case 'TOGGLE_CHUNK_PLAYBACK':
            return {
                ...state,
                chunks: state.chunks.map(chunk => chunk.id === action.payload.id
                    ? { ...chunk, isPlaying: !chunk.isPlaying }
                    : { ...chunk, isPlaying: false } // Stop other chunks
                )
            };
        case 'TOGGLE_CHUNK_EXPANSION':
            return {
                ...state,
                chunks: state.chunks.map(chunk => chunk.id === action.payload.id
                    ? { ...chunk, isExpanded: !chunk.isExpanded }
                    : chunk)
            };
        case 'RESET':
            return initialState;
        default:
            return state;
    }
}
