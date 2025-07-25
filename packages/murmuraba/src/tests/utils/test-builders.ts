/**
 * Test data builders using the Builder pattern
 * Provides flexible and maintainable test data creation
 */

import { vi } from 'vitest';

// Audio Context Builder
export class AudioContextBuilder {
  private context: Partial<AudioContext> = {
    state: 'running',
    sampleRate: 48000,
    currentTime: 0,
  };

  withState(state: AudioContextState) {
    this.context.state = state;
    return this;
  }

  withSampleRate(rate: number) {
    this.context.sampleRate = rate;
    return this;
  }

  withCurrentTime(time: number) {
    this.context.currentTime = time;
    return this;
  }

  build(): AudioContext {
    return {
      ...this.context,
      destination: {} as AudioDestinationNode,
      createGain: vi.fn(),
      createMediaStreamSource: vi.fn(),
      close: vi.fn(),
    } as unknown as AudioContext;
  }
}

// Media Stream Builder
export class MediaStreamBuilder {
  private stream: Partial<MediaStream> = {
    id: 'test-stream-id',
    active: true,
  };

  private tracks: MediaStreamTrack[] = [];

  withId(id: string) {
    this.stream.id = id;
    return this;
  }

  withActive(active: boolean) {
    this.stream.active = active;
    return this;
  }

  withAudioTrack(enabled: boolean = true) {
    const track = {
      kind: 'audio',
      id: `audio-track-${this.tracks.length}`,
      enabled,
      stop: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaStreamTrack;
    
    this.tracks.push(track);
    return this;
  }

  build(): MediaStream {
    return {
      ...this.stream,
      getTracks: () => [...this.tracks],
      getAudioTracks: () => this.tracks.filter(t => t.kind === 'audio'),
      getVideoTracks: () => this.tracks.filter(t => t.kind === 'video'),
      addTrack: vi.fn(),
      removeTrack: vi.fn(),
    } as unknown as MediaStream;
  }
}

// Processed Chunk Builder
export class ProcessedChunkBuilder {
  private chunk = {
    blob: new Blob([new ArrayBuffer(1024)], { type: 'audio/webm' }),
    startTime: 0,
    endTime: 1,
    duration: 1,
    vadScore: 0.8,
    metrics: {
      noiseRemoved: 0.7,
      averageLevel: 0.5,
      vad: 0.8,
    },
  };

  withBlob(blob: Blob) {
    this.chunk.blob = blob;
    return this;
  }

  withStartTime(time: number) {
    this.chunk.startTime = time;
    return this;
  }

  withEndTime(time: number) {
    this.chunk.endTime = time;
    this.chunk.duration = time - this.chunk.startTime;
    return this;
  }

  withVadScore(score: number) {
    this.chunk.vadScore = score;
    this.chunk.metrics.vad = score;
    return this;
  }

  withMetrics(metrics: Partial<typeof this.chunk.metrics>) {
    this.chunk.metrics = { ...this.chunk.metrics, ...metrics };
    return this;
  }

  build() {
    return { ...this.chunk };
  }
}

// Engine Configuration Builder
export class EngineConfigBuilder {
  private config = {
    algorithm: 'rnnoise' as const,
    enableAGC: true,
    agcConfig: {
      targetLevel: 0.7,
      maxGain: 2.0,
      attackTime: 0.01,
      releaseTime: 0.1,
    },
    enableDegradedMode: false,
    enableMetrics: true,
    enableAutoCleanup: true,
    cleanupDelayMs: 30000,
    logLevel: 'info' as const,
  };

  withAlgorithm(algorithm: 'rnnoise' | 'speex') {
    this.config.algorithm = algorithm;
    return this;
  }

  withAGC(enabled: boolean) {
    this.config.enableAGC = enabled;
    return this;
  }

  withDegradedMode(enabled: boolean) {
    this.config.enableDegradedMode = enabled;
    return this;
  }

  withMetrics(enabled: boolean) {
    this.config.enableMetrics = enabled;
    return this;
  }

  build() {
    return { ...this.config };
  }
}

// Factory functions for quick creation
export const createTestAudioContext = () => new AudioContextBuilder().build();
export const createTestMediaStream = () => new MediaStreamBuilder().withAudioTrack().build();
export const createTestChunk = () => new ProcessedChunkBuilder().build();
export const createTestEngineConfig = () => new EngineConfigBuilder().build();