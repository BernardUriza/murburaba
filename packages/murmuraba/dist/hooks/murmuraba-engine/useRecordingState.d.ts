import { RecordingState, ProcessedChunk } from './types';
export interface UseRecordingStateReturn {
    recordingState: RecordingState;
    startRecording: () => void;
    stopRecording: () => void;
    pauseRecording: () => void;
    resumeRecording: () => void;
    addChunk: (chunk: ProcessedChunk) => void;
    toggleChunkPlayback: (chunkId: string, isPlaying: boolean) => void;
    toggleChunkExpansion: (chunkId: string) => void;
    clearRecordings: () => void;
    updateRecordingTime: (time: number) => void;
}
export declare function useRecordingState(): UseRecordingStateReturn;
//# sourceMappingURL=useRecordingState.d.ts.map