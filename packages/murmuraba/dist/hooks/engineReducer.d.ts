import { ProcessedChunk } from './useMurmubaraEngine';
import { EngineState, ProcessingMetrics, DiagnosticInfo } from '../types';
export interface EngineStoreState {
    isInitialized: boolean;
    isLoading: boolean;
    error: string | null;
    engineState: EngineState;
    metrics: ProcessingMetrics | null;
    diagnostics: DiagnosticInfo | null;
    isRecording: boolean;
    isPaused: boolean;
    recordingTime: number;
    chunks: ProcessedChunk[];
    currentStream: MediaStream | null;
    streamController: any | null;
}
export declare const initialState: EngineStoreState;
export type EngineAction = {
    type: 'INIT_START';
} | {
    type: 'INIT_SUCCESS';
    payload: {
        engineState: EngineState;
    };
} | {
    type: 'INIT_ERROR';
    payload: {
        error: string;
    };
} | {
    type: 'SET_ENGINE_STATE';
    payload: {
        state: EngineState;
    };
} | {
    type: 'SET_METRICS';
    payload: {
        metrics: ProcessingMetrics;
    };
} | {
    type: 'SET_DIAGNOSTICS';
    payload: {
        diagnostics: DiagnosticInfo;
    };
} | {
    type: 'SET_ERROR';
    payload: {
        error: string | null;
    };
} | {
    type: 'SET_LOADING';
    payload: {
        loading: boolean;
    };
} | {
    type: 'SET_STREAM';
    payload: {
        stream: MediaStream | null;
        controller: any | null;
    };
} | {
    type: 'START_RECORDING';
} | {
    type: 'STOP_RECORDING';
} | {
    type: 'PAUSE_RECORDING';
} | {
    type: 'RESUME_RECORDING';
} | {
    type: 'UPDATE_RECORDING_TIME';
    payload: {
        time: number;
    };
} | {
    type: 'ADD_CHUNK';
    payload: {
        chunk: ProcessedChunk;
    };
} | {
    type: 'UPDATE_CHUNK';
    payload: {
        id: string;
        updates: Partial<ProcessedChunk>;
    };
} | {
    type: 'CLEAR_CHUNKS';
} | {
    type: 'TOGGLE_CHUNK_PLAYBACK';
    payload: {
        id: string;
    };
} | {
    type: 'TOGGLE_CHUNK_EXPANSION';
    payload: {
        id: string;
    };
} | {
    type: 'RESET';
};
export declare function engineReducer(state: EngineStoreState, action: EngineAction): EngineStoreState;
//# sourceMappingURL=engineReducer.d.ts.map