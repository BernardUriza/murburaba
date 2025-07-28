declare module '@jitsi/rnnoise-wasm' {
  interface RNNoiseModule {
    _rnnoise_create(model: any): number;
    _rnnoise_destroy(state: number): void;
    _rnnoise_process_frame(state: number, output: number, input: number): number;
    _malloc(size: number): number;
    _free(ptr: number): void;
    HEAP16: Int16Array;
  }

  function createRNNoise(): Promise<RNNoiseModule>;
  export default createRNNoise;
}
