/**
 * Branded types for type-safe IDs and values
 */

// Brand utility type
declare const brand: unique symbol;
type Brand<B> = { [brand]: B };
type Branded<T, B> = T & Brand<B>;

// Stream ID
export type StreamId = Branded<string, 'StreamId'>;
export const StreamId = (id: string): StreamId => id as StreamId;

// Session ID
export type SessionId = Branded<string, 'SessionId'>;
export const SessionId = (id: string): SessionId => id as SessionId;

// Chunk ID
export type ChunkId = Branded<string, 'ChunkId'>;
export const ChunkId = (id: string): ChunkId => id as ChunkId;

// Worker ID
export type WorkerId = Branded<string, 'WorkerId'>;
export const WorkerId = (id: string): WorkerId => id as WorkerId;

// Timestamp (milliseconds)
export type Timestamp = Branded<number, 'Timestamp'>;
export const Timestamp = (ms: number): Timestamp => ms as Timestamp;

// Audio sample rate
export type SampleRate = Branded<number, 'SampleRate'>;
export const SampleRate = (rate: number): SampleRate => {
  if (rate <= 0) throw new Error('Sample rate must be positive');
  return rate as SampleRate;
};

// Duration in milliseconds
export type Duration = Branded<number, 'Duration'>;
export const Duration = (ms: number): Duration => {
  if (ms < 0) throw new Error('Duration cannot be negative');
  return ms as Duration;
};

// Normalized audio level (0-1)
export type AudioLevel = Branded<number, 'AudioLevel'>;
export const AudioLevel = (level: number): AudioLevel => {
  if (level < 0 || level > 1) throw new Error('Audio level must be between 0 and 1');
  return level as AudioLevel;
};

// VAD probability (0-1)
export type VADProbability = Branded<number, 'VADProbability'>;
export const VADProbability = (prob: number): VADProbability => {
  if (prob < 0 || prob > 1) throw new Error('VAD probability must be between 0 and 1');
  return prob as VADProbability;
};

// Type guards
export const isStreamId = (value: unknown): value is StreamId =>
  typeof value === 'string' && value.startsWith('stream-');

export const isSessionId = (value: unknown): value is SessionId =>
  typeof value === 'string' && value.includes('-');

export const isValidSampleRate = (rate: number): boolean =>
  rate > 0 && [8000, 16000, 22050, 44100, 48000, 96000, 192000].includes(rate);