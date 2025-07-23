/**
 * Simple Automatic Gain Control - MINIMAL IMPLEMENTATION
 * Based on WebSearch results for Web Audio API AGC
 */
export class SimpleAGC {
  private analyser: AnalyserNode;
  private gainNode: GainNode;
  private bufferLength: number;
  private dataArray: Uint8Array;
  private targetLevel: number;
  private attackTime = 0.1;
  
  constructor(audioContext: AudioContext, targetLevel = 0.3) {
    this.targetLevel = targetLevel;
    
    // Create nodes as per WebSearch recommendation
    this.analyser = audioContext.createAnalyser();
    this.gainNode = audioContext.createGain();
    
    // Configure analyser
    this.analyser.fftSize = 256;
    this.bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);
    
    // Connect nodes
    this.analyser.connect(this.gainNode);
  }
  
  updateGain(): void {
    // Get time domain data
    this.analyser.getByteTimeDomainData(this.dataArray);
    
    // Calculate RMS as per WebSearch
    let sum = 0;
    for (let i = 0; i < this.bufferLength; i++) {
      const normalized = (this.dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }
    const currentRMS = Math.sqrt(sum / this.bufferLength);
    
    // Only adjust if we have signal
    if (currentRMS > 0) {
      const targetGain = this.targetLevel / currentRMS;
      
      // Limit gain to 10x as per test requirements
      const limitedGain = Math.min(targetGain, 10.0);
      
      // Use setTargetAtTime as recommended by WebSearch
      // "never change the value directly but use the exponential interpolation methods"
      this.gainNode.gain.setTargetAtTime(
        limitedGain,
        0, // Will be mocked in tests
        this.attackTime
      );
    }
  }
}