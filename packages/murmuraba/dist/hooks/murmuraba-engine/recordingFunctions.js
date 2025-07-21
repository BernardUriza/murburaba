import { processStream } from '../../api';
import { AudioConverter } from '../../utils/audioConverter';
import { DEFAULT_CHUNK_DURATION, LOG_PREFIX } from './constants';
export function createRecordingFunctions({ isInitialized, recordingState, currentStream, originalStream, setRecordingState, setCurrentStream, setOriginalStream, setStreamController, setError, chunkManager, recordingManager, initialize }) {
    /**
     * Start recording with concatenated streaming
     */
    const startRecording = async (chunkDuration = DEFAULT_CHUNK_DURATION) => {
        try {
            if (!isInitialized) {
                await initialize();
            }
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: false,
                    autoGainControl: true
                }
            });
            // Clone stream for original recording
            const originalStreamClone = stream.clone();
            setOriginalStream(originalStreamClone);
            // Process stream
            const controller = await processStream(stream);
            setStreamController(controller);
            const processedStream = controller.stream;
            setCurrentStream(processedStream);
            // Detect MIME type
            const mimeType = AudioConverter.getBestRecordingFormat();
            console.log(`🎤 ${LOG_PREFIX.CONCAT_STREAM} Using MIME type: ${mimeType}`);
            // Update state
            setRecordingState(prev => ({
                ...prev,
                isRecording: true,
                isPaused: false,
                chunks: []
            }));
            // Start concatenated streaming
            await recordingManager.startConcatenatedStreaming(processedStream, originalStreamClone, mimeType, chunkDuration, (newChunk) => {
                setRecordingState(prev => chunkManager.addChunk(prev, newChunk));
            });
        }
        catch (err) {
            console.error(`❌ ${LOG_PREFIX.ERROR} Failed to start recording:`, err);
            setError(err instanceof Error ? err.message : 'Failed to start recording');
        }
    };
    /**
     * Stop recording
     */
    const stopRecording = () => {
        console.log(`🛑 ${LOG_PREFIX.LIFECYCLE} Stopping recording...`);
        recordingManager.stopRecording();
        // Stop all tracks
        if (recordingState.isRecording) {
            if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
            }
            if (originalStream) {
                originalStream.getTracks().forEach(track => track.stop());
            }
        }
        // Update state
        setRecordingState(prev => ({
            ...prev,
            isRecording: false,
            isPaused: false,
            recordingTime: 0
        }));
        setCurrentStream(null);
        setOriginalStream(null);
        setStreamController(null);
    };
    /**
     * Pause recording
     */
    const pauseRecording = () => {
        if (recordingState.isRecording && !recordingState.isPaused) {
            recordingManager.pauseRecording();
            setRecordingState(prev => ({ ...prev, isPaused: true }));
        }
    };
    /**
     * Resume recording
     */
    const resumeRecording = () => {
        if (recordingState.isRecording && recordingState.isPaused) {
            recordingManager.resumeRecording();
            setRecordingState(prev => ({ ...prev, isPaused: false }));
        }
    };
    /**
     * Clear all recordings
     */
    const clearRecordings = () => {
        chunkManager.clearChunks(recordingState.chunks);
        setRecordingState(prev => ({
            ...prev,
            chunks: []
        }));
    };
    return {
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        clearRecordings
    };
}
