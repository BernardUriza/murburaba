import { RecordingState } from './types';
import { StreamController } from '../../types';
import { UseRecordingStateReturn } from './useRecordingState';
import { IChunkManager, IRecordingManager } from './interfaces';
interface RecordingFunctionsProps {
    isInitialized: boolean;
    recordingState: RecordingState;
    recordingStateHook: UseRecordingStateReturn;
    currentStream: MediaStream | null;
    originalStream: MediaStream | null;
    setCurrentStream: React.Dispatch<React.SetStateAction<MediaStream | null>>;
    setOriginalStream: React.Dispatch<React.SetStateAction<MediaStream | null>>;
    setStreamController: React.Dispatch<React.SetStateAction<StreamController | null>>;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    chunkManager: IChunkManager;
    recordingManager: IRecordingManager;
    initialize: () => Promise<void>;
}
export declare function createRecordingFunctions({ isInitialized, recordingState, recordingStateHook, currentStream, originalStream, setCurrentStream, setOriginalStream, setStreamController, setError, chunkManager, recordingManager, initialize }: RecordingFunctionsProps): {
    startRecording: (chunkDuration?: number) => Promise<void>;
    stopRecording: () => void;
    pauseRecording: () => void;
    resumeRecording: () => void;
    clearRecordings: () => void;
};
export {};
//# sourceMappingURL=recordingFunctions.d.ts.map