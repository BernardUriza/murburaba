declare module 'lamejs' {
  export class Mp3Encoder {
    constructor(channels: number, sampleRate: number, bitrate: number);
    encodeBuffer(samples: Int16Array): Int8Array;
    flush(): Int8Array;
  }
}