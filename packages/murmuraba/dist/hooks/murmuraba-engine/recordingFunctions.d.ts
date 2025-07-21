import { RecordingState } from './types';
import { StreamController } from '../../types';
import { ChunkManager } from './chunkManager';
import { RecordingManager } from './recordingManager';
interface RecordingFunctionsProps {
    isInitialized: boolean;
    recordingState: RecordingState;
    currentStream: MediaStream | null;
    originalStream: MediaStream | null;
    setRecordingState: React.Dispatch<React.SetStateAction<RecordingState>>;
    setCurrentStream: React.Dispatch<React.SetStateAction<MediaStream | null>>;
    setOriginalStream: React.Dispatch<React.SetStateAction<MediaStream | null>>;
    setStreamController: React.Dispatch<React.SetStateAction<StreamController | null>>;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    chunkManager: ChunkManager;
    recordingManager: RecordingManager;
    initialize: () => Promise<void>;
}
export declare function createRecordingFunctions({ isInitialized, recordingState, currentStream, originalStream, setRecordingState, setCurrentStream, setOriginalStream, setStreamController, setError, chunkManager, recordingManager, initialize }: RecordingFunctionsProps): {
    startRecording: (chunkDuration?: number) => Promise<void>;
    stopRecording: () => void;
    pauseRecording: () => void;
    resumeRecording: () => void;
    clearRecordings: () => void;
};
export {};
//# sourceMappingURL=recordingFunctions.d.ts.map