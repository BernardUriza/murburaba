declare module 'audio-resampler' {
  export default function resample(
    input: Float32Array,
    fromRate: number,
    toRate: number
  ): Float32Array;
}
