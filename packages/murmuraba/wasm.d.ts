declare module '*.wasm' {
  const wasmModule: string | ArrayBuffer;
  export default wasmModule;
}